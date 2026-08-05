import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth/auth.middleware.js';
import { DashboardController } from '../controllers/dashboard.controller.js';

const router = Router();
const dashboardCtrl = new DashboardController();

router.get('/stats', requireAuth, dashboardCtrl.getStats.bind(dashboardCtrl));
router.get('/health', requireAuth, dashboardCtrl.getHealth.bind(dashboardCtrl));
router.get('/uploads', requireAuth, dashboardCtrl.getUploads.bind(dashboardCtrl));
router.get('/conversations', requireAuth, dashboardCtrl.getConversations.bind(dashboardCtrl));
router.get('/timeline', requireAuth, dashboardCtrl.getTimeline.bind(dashboardCtrl));

export const dashboardRoutes = router;
export default dashboardRoutes;
