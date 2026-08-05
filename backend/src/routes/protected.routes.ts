import { Router } from 'express';
import { sessionRoutes } from '../modules/sessions/routes/session.routes.js';
import { documentRoutes } from '../modules/documents/routes/document.routes.js';
import { chatRoutes } from '../modules/chat/routes/chat.routes.js';
import { questionsRoutes } from '../modules/chat/routes/questions.routes.js';
import { dashboardRoutes } from '../modules/dashboard/routes/dashboard.routes.js';

const router = Router();

router.use('/sessions', sessionRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);
router.use('/suggested-questions', questionsRoutes);
router.use('/dashboard', dashboardRoutes);

export const protectedRoutes = router;
export default protectedRoutes;
