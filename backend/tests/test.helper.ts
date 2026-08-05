import { prisma } from '../src/database/client/index.js';

/**
 * Clears all dynamic database tables to ensure test independence.
 */
export const clearDatabase = async (): Promise<void> => {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
};

/**
 * Seeds a test user in the database.
 */
export const seedUser = async (overrides: {
  email?: string;
  passwordHash?: string;
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
} = {}) => {
  return prisma.user.create({
    data: {
      email: overrides.email || `test-${crypto.randomUUID()}@example.com`,
      passwordHash: overrides.passwordHash || '$2b$12$DUMMYHASHPASSWORDFORCOMPARECHECK1234567890', // matches bcrypt formatting
      role: overrides.role || 'USER',
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    },
  });
};

/**
 * Seeds a test session.
 */
export const seedSession = async (overrides: {
  userId: string;
  hashedRefreshToken?: string;
  isRevoked?: boolean;
  expiresAt?: Date;
}) => {
  return prisma.session.create({
    data: {
      id: crypto.randomUUID(),
      userId: overrides.userId,
      hashedRefreshToken: overrides.hashedRefreshToken || 'dummy-hash-1234',
      isRevoked: overrides.isRevoked || false,
      expiresAt: overrides.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    },
  });
};
export default clearDatabase;
