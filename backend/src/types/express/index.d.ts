import { Session, Role } from '@prisma/client';
import { Permission } from '../../modules/auth/constants/auth.constants.js';
import { AuthenticatedUser } from '../../modules/auth/types/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: Session;
      sessionId?: string;
      permissions?: Permission[];
      role?: Role;
    }
  }
}
export {};
