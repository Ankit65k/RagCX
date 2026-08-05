import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './index.js';

export type TransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export const executeTransaction = async <T>(
  fn: (tx: TransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  },
): Promise<T> => {
  try {
    const prismaTxFn = fn as unknown as Parameters<typeof prisma.$transaction>[0];
    const result = await prisma.$transaction(prismaTxFn, options);
    return result as T;
  } catch (error) {
    // Prisma transactions roll back automatically when an error is thrown
    throw error;
  }
};

export default executeTransaction;
