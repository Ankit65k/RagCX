import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth/auth.middleware.js';
import { QuestionsController } from '../controllers/questions.controller.js';

const router = Router();
const questionsCtrl = new QuestionsController();

/**
 * Suggested questions endpoints.
 */
router.get('/', requireAuth, questionsCtrl.getSuggestedQuestions.bind(questionsCtrl));
router.post('/regenerate', requireAuth, questionsCtrl.regenerateQuestions.bind(questionsCtrl));

export const questionsRoutes = router;
export default questionsRoutes;
