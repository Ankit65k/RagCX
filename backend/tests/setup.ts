import { vi } from 'vitest';

// In-memory mock store
let users: any[] = [];
let sessions: any[] = [];

export const mockPrisma = {
  user: {
    create: vi.fn().mockImplementation(async ({ data }) => {
      const newUser = { id: crypto.randomUUID(), ...data };
      users.push(newUser);
      return newUser;
    }),
    findUnique: vi.fn().mockImplementation(async ({ where }) => {
      const match = users.find((u) => u.id === where.id || u.email === where.email);
      return match || null;
    }),
    update: vi.fn().mockImplementation(async ({ where, data }) => {
      const match = users.find((u) => u.id === where.id);
      if (match) {
        Object.assign(match, data);
      }
      return match || null;
    }),
    deleteMany: vi.fn().mockImplementation(async () => {
      users = [];
      return { count: 0 };
    }),
  },
  session: {
    create: vi.fn().mockImplementation(async ({ data }) => {
      const newSession = { id: crypto.randomUUID(), ...data };
      sessions.push(newSession);
      return newSession;
    }),
    findUnique: vi.fn().mockImplementation(async ({ where }) => {
      const match = sessions.find((s) => s.id === where.id);
      return match || null;
    }),
    findMany: vi.fn().mockImplementation(async (args) => {
      let matches = sessions;
      if (args && args.where) {
        matches = matches.filter((s) => {
          if (args.where.userId && s.userId !== args.where.userId) return false;
          if (args.where.isRevoked !== undefined && s.isRevoked !== args.where.isRevoked) return false;
          return true;
        });
      }
      return matches;
    }),
    update: vi.fn().mockImplementation(async ({ where, data }) => {
      const match = sessions.find((s) => s.id === where.id);
      if (match) {
        Object.assign(match, data);
      }
      return match || null;
    }),
    updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
      const matches = sessions.filter((s) => s.userId === where.userId);
      matches.forEach((s) => Object.assign(s, data));
      return { count: matches.length };
    }),
    deleteMany: vi.fn().mockImplementation(async () => {
      sessions = [];
      return { count: 0 };
    }),
  },
};

// Mock the prisma client globally across all test files
vi.mock('../src/database/client/index.js', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));
