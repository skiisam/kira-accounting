import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { config } from './config';
import { basePrisma } from './database';

type Store = { client: PrismaClient };

const als = new AsyncLocalStorage<Store>();
const clientCache = new Map<string, PrismaClient>();

export function getTenantClient(): PrismaClient {
  const store = als.getStore();
  return store?.client || basePrisma;
}

export async function resolveTenantClientByCompanyId(companyId?: number): Promise<PrismaClient> {
  if (!companyId) return basePrisma;
  // Use any to avoid type mismatch if Prisma types aren't regenerated yet
  const company: any = await (basePrisma as any).company.findUnique({ where: { id: companyId } });
  const dbUrl: string | undefined = company?.dbUrl;
  if (!dbUrl) return basePrisma;
  if (clientCache.has(dbUrl)) return clientCache.get(dbUrl)!;
  const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  clientCache.set(dbUrl, client);
  return client;
}

export async function withTenantClient<T>(client: PrismaClient, fn: () => Promise<T>): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    als.run({ client }, async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  });
}
