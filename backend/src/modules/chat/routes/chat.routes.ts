import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth/auth.middleware.js';
import { ChatController } from '../controllers/chat.controller.js';

const router = Router();
const chatCtrl = new ChatController();

/**
 * Chat conversation management endpoints.
 */
router.get('/sessions', requireAuth, chatCtrl.listSessions.bind(chatCtrl));
router.post('/sessions', requireAuth, chatCtrl.createSession.bind(chatCtrl));
router.delete('/sessions/:id', requireAuth, chatCtrl.deleteSession.bind(chatCtrl));
router.get('/sessions/:id/messages', requireAuth, chatCtrl.getSessionMessages.bind(chatCtrl));
router.post('/sessions/:id/messages', requireAuth, chatCtrl.sendMessage.bind(chatCtrl));

export const chatRoutes = router;
export default chatRoutes;
