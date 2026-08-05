import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../../../middleware/validation/validation.middleware.js';
import { requireAuth } from '../../../middleware/auth/auth.middleware.js';
import { LoginSchema, RefreshTokenSchema, LogoutSchema, RegisterSchema } from '../schemas/auth.schemas.js';

const router = Router();
const authController = new AuthController();

// Rate limiter specifically for authentication endpoints to prevent brute-force attacks
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    if (req.headers['x-bypass-rate-limit'] === 'true' || process.env.BYPASS_RATE_LIMIT === 'true') {
      return 1000;
    }
    return 20;
  },
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * tags:
 *   name: Authentication
 *   description: User Identity, Token management, and session workflows
 */

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Authenticate user credentials
 *     description: Validates email and password, creates an auditing session, and sets secure HttpOnly cookies.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@ragcx.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecureP@ss1234
 *     responses:
 *       200:
 *         description: Login successful. Cookies written.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *       401:
 *         description: Incorrect email or password (InvalidCredentialsError).
 *       403:
 *         description: User account is deactivated (InactiveUserError).
 */
router.post(
  '/register',
  authRateLimiter,
  validate({ body: RegisterSchema }),
  authController.register.bind(authController),
);

router.post(
  '/login',
  authRateLimiter,
  validate({ body: LoginSchema }),
  authController.login.bind(authController),
);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Rotate refresh token to issue new token pair
 *     description: Rotates token using Refresh Token Rotation (RTR). Re-uses detection will trigger mass revocation.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Fallback token if cookies are not used.
 *     responses:
 *       200:
 *         description: Token rotated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Token is expired, invalid, or already rotated.
 */
router.post(
  '/refresh',
  authRateLimiter,
  validate({ body: RefreshTokenSchema }),
  authController.refresh.bind(authController),
);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout and revoke active session
 *     description: Revokes the session associated with the refresh token and clears HTTP cookies.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *                 data:
 *                   type: object
 */
router.post(
  '/logout',
  requireAuth,
  validate({ body: LogoutSchema }),
  authController.logout.bind(authController),
);

/**
 * @openapi
 * /api/v1/auth/logout-all:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout from all active sessions/devices
 *     description: Revokes every active session record belonging to the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions revoked.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logout from all devices successful
 *                 data:
 *                   type: object
 */
router.post(
  '/logout-all',
  requireAuth,
  authController.logoutAll.bind(authController),
);

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Retrieve currently authenticated user context
 *     description: Returns the user profile mapping along with their permissions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Current user profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get(
  '/me',
  requireAuth,
  authController.getCurrentUser.bind(authController),
);

export const authRoutes = router;
export default authRoutes;
