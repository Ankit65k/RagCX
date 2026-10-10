import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../../database/client/index.js';
import { getRedisClient } from '../../../infrastructure/redis/client/index.js';
import { RedisPublisher } from '../../../infrastructure/redis/publisher/index.js';
import { RedisEventFactory } from '../../../infrastructure/redis/events/index.js';
import { RedisChannels } from '../../../infrastructure/redis/channels/index.js';
import { logger } from '../../../infrastructure/logger/logger.js';
import { appConfig } from '../../../config/app.config.js';

export class QuestionsController {
  /**
   * GET /api/v1/suggested-questions
   * Generates suggested questions for a document or user's latest document.
   */
  public async getSuggestedQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      let { documentId } = req.query;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Verify document existence and ownership
      if (documentId) {
        const doc = await prisma.document.findUnique({
          where: { id: documentId as string },
        });
        if (!doc || doc.uploadedBy !== userId) {
          res.status(403).json({ message: 'Access denied to this document' });
          return;
        }

        // Check document processing status
        if (doc.processingStatus === 'PROCESSING' || doc.processingStatus === 'PENDING') {
          res.status(202).json({
            success: false,
            message: 'Document is still processing. Please wait a moment and try again.',
            code: 'DOCUMENT_PROCESSING',
            retryAfter: 5
          });
          return;
        }

        if (doc.processingStatus === 'FAILED') {
          res.status(422).json({
            success: false,
            message: 'Document processing failed. Please re-upload the document.',
            code: 'DOCUMENT_PROCESSING_FAILED'
          });
          return;
        }

        if (doc.chunkCount === 0) {
          res.status(422).json({
            success: false,
            message: 'No content could be extracted from this document. Please try a different PDF.',
            code: 'NO_CONTENT_EXTRACTED'
          });
          return;
        }
      }

      // If documentId is not provided, fetch the latest processed document for this user
      if (!documentId) {
        const latestDoc = await prisma.document.findFirst({
          where: { uploadedBy: userId, processingStatus: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
        });
        if (latestDoc) {
          documentId = latestDoc.id;
        }
      }

      if (!documentId) {
        // No document found, return empty array
        res.status(200).json([]);
        return;
      }

      const requestId = req.id || uuidv4();

      // Setup Redis subscriber to wait for SUGGESTED_QUESTIONS_RESPONSE
      const defaultClient = getRedisClient();
      const subscriber = defaultClient.duplicate();
      subscriber.on('error', (err) => {
        logger.error(err, 'Redis getSuggestedQuestions subscriber error');
      });
      await subscriber.connect();

      let resolved = false;
      const timeoutMs = 150000; // 150s timeout (120s LLM generation + 30s buffer)

      const cleanUp = async () => {
        try {
          await subscriber.unsubscribe(RedisChannels.CHAT_JOBS);
          await subscriber.disconnect();
        } catch (e) {
          logger.error(e, 'Error disconnecting subscriber in getSuggestedQuestions');
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
              message: 'Suggested questions generation timed out',
            },
          });
        }
      }, timeoutMs);

      await subscriber.subscribe(RedisChannels.CHAT_JOBS, async (messageStr) => {
        try {
          const event = JSON.parse(messageStr);
          const type = event.eventType || event.type;
          if (event.requestId === requestId) {
            if (type === 'SUGGESTED_QUESTIONS_RESPONSE') {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutHandle);
                await cleanUp();

                const questions = event.payload.questions || [];
                res.status(200).json(questions);
              }
            } else if (type === 'SUGGESTED_QUESTIONS_ERROR') {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutHandle);
                await cleanUp();
                res.status(500).json({
                  success: false,
                  message: event.payload.reason || 'Failed to generate suggested questions',
                });
              }
            }
          }
        } catch (err) {
          logger.error(err, 'Error parsing Redis message in getSuggestedQuestions subscriber');
        }
      });

      // Publish SUGGESTED_QUESTIONS_REQUEST
      const event = RedisEventFactory.createEvent(
        'SUGGESTED_QUESTIONS_REQUEST',
        {
          documentId,
        },
        requestId,
      );

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

  /**
   * POST /api/v1/suggested-questions/regenerate
   * Regenerates suggested questions for a document or user's latest document.
   */
  public async regenerateQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Simply delegate to getSuggestedQuestions as the generation is on-the-fly and doesn't store state
    return this.getSuggestedQuestions(req, res, next);
  }
}
