import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../database/client/index.js';
import { getRedisClient } from '../../../infrastructure/redis/client/index.js';
import { RedisPublisher } from '../../../infrastructure/redis/publisher/index.js';
import { RedisEventFactory } from '../../../infrastructure/redis/events/index.js';
import { RedisChannels } from '../../../infrastructure/redis/channels/index.js';
import { logger } from '../../../infrastructure/logger/logger.js';
import { appConfig } from '../../../config/app.config.js';

export class ChatController {
  /**
   * GET /api/v1/chat/sessions
   * Fetches all chat sessions for the logged-in user.
   */
  public async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const chatSessions = await prisma.chatSession.findMany({
        where: { userId },
        include: {
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const data = chatSessions.map((cs) => ({
        sessionId: cs.sessionIdentifier,
        title: cs.title,
        createdAt: cs.createdAt.toISOString(),
        messageCount: cs._count.messages,
      }));

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/sessions
   * Creates a new chat session.
   */
  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { title } = req.body;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const sessionIdentifier = `c-new-${Date.now()}`;
      const chatSession = await prisma.chatSession.create({
        data: {
          sessionIdentifier,
          title: title || 'New Chat Session',
          userId,
        },
      });

      res.status(201).json({
        sessionId: chatSession.sessionIdentifier,
        title: chatSession.title,
        createdAt: chatSession.createdAt.toISOString(),
        messageCount: 0,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/chat/sessions/:id
   * Deletes a chat session.
   */
  public async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id: sessionIdentifier } = req.params;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const chatSession = await prisma.chatSession.findUnique({
        where: { sessionIdentifier },
      });

      if (!chatSession || chatSession.userId !== userId) {
        res.status(404).json({ message: 'Chat session not found' });
        return;
      }

      await prisma.chatSession.delete({
        where: { id: chatSession.id },
      });

      res.status(200).json({ success: true, message: 'Chat session deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/sessions/:id/messages
   * Gets all messages for a session.
   */
  public async getSessionMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id: sessionIdentifier } = req.params;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const chatSession = await prisma.chatSession.findUnique({
        where: { sessionIdentifier },
      });

      if (!chatSession || chatSession.userId !== userId) {
        res.status(404).json({ message: 'Chat session not found' });
        return;
      }

      const messages = await prisma.chatMessage.findMany({
        where: { chatSessionId: chatSession.id },
        orderBy: { createdAt: 'asc' },
      });

      const data = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.message,
        timestamp: m.createdAt.toISOString(),
        citations: m.sources as any || undefined,
      }));

      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/sessions/:id/messages
   * Sends a user message, publishes CHAT_REQUEST, and waits for CHAT_RESPONSE.
   *
   * Body: { prompt: string, documentIds?: string[] }
   * - documentIds: Optional array of document IDs to query. If omitted, queries all user documents.
   */
  public async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id: sessionIdentifier } = req.params;
      const { prompt, documentIds } = req.body;
      const requestId = req.id || uuidv4();
      const correlationId = (req.headers['x-correlation-id'] || requestId).toString();

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!prompt) {
        res.status(400).json({ message: 'Prompt is required' });
        return;
      }

      // Validate documentIds if provided
      if (documentIds !== undefined && (!Array.isArray(documentIds) || documentIds.some((id: any) => typeof id !== 'string'))) {
        res.status(400).json({ message: 'documentIds must be an array of strings' });
        return;
      }

      // 1. Find or create ChatSession
      let chatSession = await prisma.chatSession.findUnique({
        where: { sessionIdentifier },
      });
      if (chatSession && chatSession.userId !== userId) {
        res.status(403).json({ message: 'Access denied to this chat session' });
        return;
      }
      if (!chatSession) {
        chatSession = await prisma.chatSession.create({
          data: {
            sessionIdentifier,
            title: prompt.substring(0, 30) || 'New Chat Session',
            userId,
          },
        });
      }

      // 2. Save user message to database
      await prisma.chatMessage.create({
        data: {
          chatSessionId: chatSession.id,
          role: 'USER',
          message: prompt,
        },
      });

      // 3. Setup Redis Subscriber to wait for the response
      const defaultClient = getRedisClient();
      const subscriber = defaultClient.duplicate();
      subscriber.on('error', (err) => {
        logger.error(err, 'Redis sendMessage subscriber error');
      });
      await subscriber.connect();

      let resolved = false;
      const timeoutMs = 120000; // 120s timeout for full RAG pipeline (retrieval + LLM inference)

      const cleanUp = async () => {
        try {
          await subscriber.unsubscribe(RedisChannels.CHAT_JOBS);
          await subscriber.disconnect();
        } catch (e) {
          logger.error(e, 'Error disconnecting subscriber in sendMessage');
        }
      };

      const timeoutHandle = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          await cleanUp();
          res.status(504).json({
            success: false,
            error: {
              code: 'CHAT_TIMEOUT',
              message: 'AI Service response timed out',
            },
          });
        }
      }, timeoutMs);

      await subscriber.subscribe(RedisChannels.CHAT_JOBS, async (messageStr) => {
        try {
          const event = JSON.parse(messageStr);
          const type = event.eventType || event.type;
          if (event.requestId === requestId && type === 'CHAT_RESPONSE') {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeoutHandle);
              await cleanUp();

              const answer = event.payload.answer || '';
              const citations = event.payload.citations || [];
              const confidence = event.payload.confidence || 'LOW';
              const suggestedFollowUps = event.payload.suggestedFollowUps || [];
              const tokenUsage = event.payload.tokenUsage || {};

              // Save AI response message to database
              await prisma.chatMessage.create({
                data: {
                  chatSessionId: chatSession!.id,
                  role: 'ASSISTANT',
                  message: answer,
                  sources: citations,
                  tokenUsage,
                },
              });

              res.status(200).json({
                answer,
                confidence,
                citations,
                executionTime: (event.payload.executionTimeMs || 0) / 1000.0,
                suggestedFollowUps,
              });
            }
          }
        } catch (err) {
          logger.error(err, 'Error parsing Redis message in sendMessage subscriber');
        }
      });

      // 4. Publish CHAT_REQUEST to Redis
      const event = RedisEventFactory.createEvent(
        'CHAT_REQUEST',
        {
          chatSessionId: sessionIdentifier,
          prompt,
          documentIds: documentIds || [], // Empty array means query all user documents
        },
        requestId,
      );

      // Bind metadata for Python service tracing
      (event as any).metadata = {
        userId,
        service: 'ragcx-backend',
        environment: appConfig.env,
        publishedAt: new Date().toISOString(),
        schemaVersion: '1.0',
        retryCount: 0,
      };

      await RedisPublisher.publish(RedisChannels.CHAT_JOBS, event);
    } catch (error) {
      next(error);
    }
  }
}
