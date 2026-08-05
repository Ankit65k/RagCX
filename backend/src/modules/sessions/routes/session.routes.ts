import { Router } from 'express';
import { SessionController } from '../controllers/session.controller.js';
import { requireAuth } from '../../../middleware/auth/auth.middleware.js';

const router = Router();
const sessionController = new SessionController();

/**
 * Session Lifecycle endpoints protected by JWT requireAuth middleware.
 */
router.get('/', requireAuth, sessionController.getActiveSessions.bind(sessionController));
router.delete('/:id', requireAuth, sessionController.revokeSession.bind(sessionController));

export const sessionRoutes = router;
export default sessionRoutes;
