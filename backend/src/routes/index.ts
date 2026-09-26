import { Router } from 'express';
import { publicRoutes } from './public.routes.js';
import { protectedRoutes } from './protected.routes.js';
import { adminRoutes } from './admin.routes.js';

const router = Router();

// Mount public routes at /v1
router.use('/v1', publicRoutes);

// Mount protected routes (would apply Auth middleware here globally if desired)
router.use('/v1', protectedRoutes);

// Mount admin routes
router.use('/v1/admin', adminRoutes);

export const routes = router;
export default routes;
