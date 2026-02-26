import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { getTenantClient } from './tenant';

// Prevent multiple instances in development
declare global {
  var prisma: PrismaClient | undefined;
}

export const basePrisma = global.prisma || new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = basePrisma;
}

// Log queries in development
basePrisma.$on('query' as never, (e: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  }
});

// Connection test
export async function connectDatabase(): Promise<void> {
  try {
    await basePrisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Disconnect on shutdown
export async function disconnectDatabase(): Promise<void> {
  await basePrisma.$disconnect();
  logger.info('Database disconnected');
}

// Export a tenant-aware Prisma proxy to keep existing imports working
export const prisma: PrismaClient = new Proxy(basePrisma, {
  get(_target, prop, receiver) {
    const client = getTenantClient();
    return Reflect.get(client, prop, receiver);
  },
}) as unknown as PrismaClient;
