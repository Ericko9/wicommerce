import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';
export * from './tenant-extension';

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}
