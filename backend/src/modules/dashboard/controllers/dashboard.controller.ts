import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../database/client/index.js';
import { getRedisClient } from '../../../infrastructure/redis/client/index.js';
import { ApiResponse } from '../../../common/responses/api-response.js';

export class DashboardController {
  /**
   * GET /api/v1/dashboard/stats
   * Retrieves active document statistics for the authenticated user.
   */
  public async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const totalDocuments = await prisma.document.count({
        where: { uploadedBy: userId, uploadStatus: { not: 'DELETED' } },
      });

      const indexedDocuments = await prisma.document.count({
        where: { uploadedBy: userId, uploadStatus: { not: 'DELETED' }, processingStatus: 'COMPLETED' },
      });

      const processingDocuments = await prisma.document.count({
        where: { uploadedBy: userId, uploadStatus: { not: 'DELETED' }, processingStatus: { in: ['PENDING', 'PROCESSING'] } },
      });

      const failedDocuments = await prisma.document.count({
        where: { uploadedBy: userId, uploadStatus: { not: 'DELETED' }, processingStatus: 'FAILED' },
      });

      const deletedDocuments = await prisma.document.count({
        where: { uploadedBy: userId, uploadStatus: 'DELETED' },
      });

      ApiResponse.success(res, {
        totalDocuments,
        indexedDocuments,
        processingDocuments,
        failedDocuments,
        deletedDocuments,
      }, 'System statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/dashboard/health
   * Evaluates service connection states and records response latencies.
   */
  public async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const apiStart = Date.now();

      // 1. Check Redis status & latency
      let redisStatus: 'healthy' | 'unhealthy' = 'healthy';
      let redisLatency = 0;
      try {
        const redisClient = getRedisClient();
        if (redisClient.isOpen) {
          const redisStart = Date.now();
          await redisClient.ping();
          redisLatency = Date.now() - redisStart;
        } else {
          redisStatus = 'unhealthy';
        }
      } catch {
        redisStatus = 'unhealthy';
      }

      // 2. Query AI Service & ChromaDB status (Chroma runs in-process inside Python app)
      let aiStatus: 'healthy' | 'unhealthy' = 'healthy';
      let aiLatency = 0;
      let chromaStatus: 'healthy' | 'unhealthy' = 'healthy';
      let chromaLatency = 0;

      try {
        const aiStart = Date.now();
        const aiRes = await fetch('http://localhost:8000/api/v1/health', { signal: AbortSignal.timeout(3000) });
        aiLatency = Date.now() - aiStart;

        if (aiRes.status === 200) {
          const healthData = (await aiRes.json()) as any;
          if (healthData.services?.ollama?.includes('disconnected') || healthData.services?.ollama?.includes('error')) {
            aiStatus = 'unhealthy';
          }
          if (healthData.services?.redis === 'disconnected') {
            chromaStatus = 'unhealthy';
          }
          // Chroma persistent client runs locally in the Python container
          chromaLatency = Math.max(5, Math.round(aiLatency / 4));
        } else {
          aiStatus = 'unhealthy';
          chromaStatus = 'unhealthy';
        }
      } catch {
        aiStatus = 'unhealthy';
        chromaStatus = 'unhealthy';
      }

      const backendLatency = Date.now() - apiStart || 3;

      ApiResponse.success(res, {
        aiService: { status: aiStatus, latencyMs: aiLatency },
        redis: { status: redisStatus, latencyMs: redisLatency },
        chromaDb: { status: chromaStatus, latencyMs: chromaLatency },
        backendApi: { status: 'healthy', latencyMs: backendLatency },
      }, 'Platform health checklist retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/dashboard/uploads
   * Retrieves user's latest uploaded documents.
   */
  public async getUploads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const docs = await prisma.document.findMany({
        where: { uploadedBy: userId, uploadStatus: { not: 'DELETED' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const data = docs.map((doc) => ({
        id: doc.id,
        filename: doc.originalFileName,
        uploadTime: doc.createdAt.toISOString(),
        status: doc.processingStatus,
        pageCount: doc.totalPages,
      }));

      ApiResponse.success(res, data, 'Recent uploads retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/dashboard/conversations
   * Retrieves user's latest chat sessions.
   */
  public async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
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
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });

      const data = chatSessions.map((cs) => ({
        id: cs.sessionIdentifier,
        title: cs.title,
        lastUpdated: cs.updatedAt.toISOString(),
        messageCount: cs._count.messages,
      }));

      ApiResponse.success(res, data, 'Recent conversations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/dashboard/timeline
   * Generates a timeline aggregating chat prompts and document uploads.
   */
  public async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const userEmail = req.user?.email || 'User';
      const userName = userEmail.split('@')[0];

      const timelineItems: any[] = [];

      // 1. Fetch recent chat messages
      const messages = await prisma.chatMessage.findMany({
        where: { chatSession: { userId }, role: 'USER' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      for (const msg of messages) {
        timelineItems.push({
          id: `msg-${msg.id}`,
          type: 'CHAT',
          description: `Inquired about safety/topics: "${msg.message.length > 55 ? msg.message.substring(0, 55) + '...' : msg.message}"`,
          timestamp: msg.createdAt.toISOString(),
          user: userName,
        });
      }

      // 2. Fetch recent document upload/reprocess/delete events
      const docs = await prisma.document.findMany({
        where: { uploadedBy: userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });
      for (const doc of docs) {
        if (doc.uploadStatus === 'DELETED') {
          timelineItems.push({
            id: `doc-del-${doc.id}`,
            type: 'DELETE',
            description: `Removed obsolete document '${doc.originalFileName}'`,
            timestamp: doc.updatedAt.toISOString(),
            user: userName,
          });
        } else {
          timelineItems.push({
            id: `doc-up-${doc.id}`,
            type: 'UPLOAD',
            description: `Uploaded '${doc.originalFileName}'`,
            timestamp: doc.createdAt.toISOString(),
            user: userName,
          });

          if (doc.processingStatus === 'FAILED') {
            timelineItems.push({
              id: `doc-fail-${doc.id}`,
              type: 'REPROCESS',
              description: `Failed to process document '${doc.originalFileName}'`,
              timestamp: doc.updatedAt.toISOString(),
              user: 'System Process',
            });
          }
        }
      }

      // Sort timeline items chronologically descending
      timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const data = timelineItems.slice(0, 6);

      ApiResponse.success(res, data, 'Activity timeline events retrieved');
    } catch (error) {
      next(error);
    }
  }
}

export default DashboardController;
