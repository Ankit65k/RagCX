import { Router } from 'express';
import { publicRoutes } from './public.routes.js';
import { protectedRoutes } from './protected.routes.js';
import { adminRoutes } from './admin.routes.js';

const router = Router();

// Mount public routes at root or specific prefix
router.use('/', publicRoutes);

// Mount protected routes (would apply Auth middleware here globally if desired)
router.use('/', protectedRoutes);

// Mount admin routes
router.use('/admin', adminRoutes);

export const routes = router;
export default routes;
