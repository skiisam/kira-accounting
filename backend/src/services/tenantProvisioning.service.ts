import { PrismaClient } from '@prisma/client';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { execFile } from 'child_process';
import { URL } from 'url';

function composeTenantUrl(baseUrl: string, dbName: string): string {
  const u = new URL(baseUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
}

function safeDbName(prefix: string): string {
  return prefix.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function execPrismaDbPush(env: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('npx', ['prisma', 'db', 'push', '--accept-data-loss'], { env: { ...process.env, ...env } }, (err, stdout, stderr) => {
      if (err) {
        logger.error('prisma db push failed', { stdout, stderr });
        return reject(err);
      }
      logger.info('prisma db push completed for tenant');
      resolve();
    });
  });
}

export async function provisionTenantDatabase(opts: {
  companyId: number;
  companyCode: string;
  companyName: string;
  userGroupId: number;
  userId: number;
  userCode: string;
  userName: string;
  email?: string | null;
  passwordHash: string;
}): Promise<string> {
  const superUrl = config.database.superUrl;
  if (!superUrl) {
    throw new Error('DATABASE_SUPER_URL is required to create tenant databases');
  }

  const dbName = safeDbName(`trae_${opts.companyCode}_${opts.companyId}`);
  const adminClient = new PrismaClient({ datasources: { db: { url: composeTenantUrl(superUrl, 'postgres') } } });
  try {
    // Create database
    await (adminClient as any).$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } catch (e: any) {
    if (!/already exists/i.test(String(e?.message || ''))) {
      throw e;
    }
    logger.warn(`Tenant database ${dbName} already exists, continuing`);
  } finally {
    await adminClient.$disconnect();
  }

  const tenantUrl = composeTenantUrl(superUrl, dbName);
  // Push schema to tenant
  await execPrismaDbPush({ DATABASE_URL: tenantUrl });

  // Seed minimal records into tenant with fixed IDs matching base DB
  const tenantClient = new PrismaClient({ datasources: { db: { url: tenantUrl } } });
  try {
    // Company
    await (tenantClient as any).company.create({
      data: {
        id: opts.companyId,
        code: opts.companyCode,
        name: opts.companyName,
        isActive: true,
      },
    });
    // User group
    await (tenantClient as any).userGroup.create({
      data: {
        id: opts.userGroupId,
        code: `${opts.companyCode}-ADMIN`,
        name: 'Company Admin',
        description: 'Full access to company data',
        isActive: true,
      },
    });
    // Admin user
    await (tenantClient as any).user.create({
      data: {
        id: opts.userId,
        code: opts.userCode,
        name: opts.userName,
        email: opts.email?.toLowerCase() || null,
        passwordHash: opts.passwordHash,
        groupId: opts.userGroupId,
        companyId: opts.companyId,
        isAdmin: true,
        isActive: false,
      },
    });
  } finally {
    await tenantClient.$disconnect();
  }

  return tenantUrl;
}
