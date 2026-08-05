import { Router } from 'express';
import { healthRoutes } from '../modules/health/index.js';
import { authRoutes } from '../modules/auth/routes/auth.routes.js';

const router = Router();

// Mount public routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

export const publicRoutes = router;
export default publicRoutes;
