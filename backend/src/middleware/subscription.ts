import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { FEATURES, FeatureCode, SUBSCRIPTION_STATUS } from '../constants/plans';

interface CompanyWithPlan {
  id: number;
  planCode: string;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  plan: {
    code: string;
    maxUsers: number;
    maxCompanies: number;
    maxInvoicesMonth: number;
    maxProducts: number;
    maxCustomers: number;
    storageGb: number;
    features: Record<string, boolean> | null;
  } | null;
}

// Cache for company subscription data
const subscriptionCache = new Map<number, { data: CompanyWithPlan; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get company subscription data with caching
 */
export async function getCompanySubscription(companyId: number): Promise<CompanyWithPlan | null> {
  const cached = subscriptionCache.get(companyId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      planCode: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      plan: {
        select: {
          code: true,
          maxUsers: true,
          maxCompanies: true,
          maxInvoicesMonth: true,
          maxProducts: true,
          maxCustomers: true,
          storageGb: true,
          features: true,
        },
      },
    },
  });

  if (company) {
    subscriptionCache.set(companyId, {
      data: company as CompanyWithPlan,
      expiresAt: Date.now() + CACHE_TTL,
    });
  }

  return company as CompanyWithPlan | null;
}

/**
 * Clear subscription cache for a company
 */
export function clearSubscriptionCache(companyId?: number) {
  if (companyId) {
    subscriptionCache.delete(companyId);
  } else {
    subscriptionCache.clear();
  }
}

/**
 * Check if subscription is active (not expired)
 */
export function isSubscriptionActive(company: CompanyWithPlan): boolean {
  const status = company.subscriptionStatus;
  
  // Check status
  if (status === SUBSCRIPTION_STATUS.CANCELLED || status === SUBSCRIPTION_STATUS.EXPIRED) {
    return false;
  }
  
  // Check trial expiry
  if (status === SUBSCRIPTION_STATUS.TRIAL && company.trialEndsAt) {
    return new Date(company.trialEndsAt) > new Date();
  }
  
  // Check subscription expiry
  if (status === SUBSCRIPTION_STATUS.ACTIVE && company.subscriptionEndsAt) {
    return new Date(company.subscriptionEndsAt) > new Date();
  }
  
  return status === SUBSCRIPTION_STATUS.ACTIVE || status === SUBSCRIPTION_STATUS.TRIAL;
}

/**
 * Check if a feature is available for the company's plan
 */
export function hasFeature(company: CompanyWithPlan, feature: FeatureCode): boolean {
  if (!company.plan?.features) return false;
  const features = company.plan.features as Record<string, boolean>;
  return features[feature] === true;
}

/**
 * Get plan limits for a company
 */
export function getPlanLimits(company: CompanyWithPlan) {
  return {
    maxUsers: company.plan?.maxUsers ?? 1,
    maxCompanies: company.plan?.maxCompanies ?? 1,
    maxInvoicesMonth: company.plan?.maxInvoicesMonth ?? 50,
    maxProducts: company.plan?.maxProducts ?? 100,
    maxCustomers: company.plan?.maxCustomers ?? 100,
    storageGb: company.plan?.storageGb ?? 1,
  };
}

/**
 * Middleware: Require active subscription
 */
export function requireActiveSubscription() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) {
        return res.status(401).json({ 
          success: false, 
          error: { code: 'NO_COMPANY', message: 'No company associated with user' } 
        });
      }

      const company = await getCompanySubscription(companyId);
      if (!company) {
        return res.status(404).json({ 
          success: false, 
          error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found' } 
        });
      }

      if (!isSubscriptionActive(company)) {
        return res.status(403).json({ 
          success: false, 
          error: { 
            code: 'SUBSCRIPTION_INACTIVE', 
            message: 'Your subscription has expired. Please renew to continue.',
            status: company.subscriptionStatus,
          } 
        });
      }

      // Attach subscription data to request
      (req as any).subscription = company;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware: Require specific feature
 */
export function requireFeature(feature: FeatureCode) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) {
        return res.status(401).json({ 
          success: false, 
          error: { code: 'NO_COMPANY', message: 'No company associated with user' } 
        });
      }

      const company = await getCompanySubscription(companyId);
      if (!company) {
        return res.status(404).json({ 
          success: false, 
          error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found' } 
        });
      }

      if (!isSubscriptionActive(company)) {
        return res.status(403).json({ 
          success: false, 
          error: { 
            code: 'SUBSCRIPTION_INACTIVE', 
            message: 'Your subscription has expired.',
          } 
        });
      }

      if (!hasFeature(company, feature)) {
        return res.status(403).json({ 
          success: false, 
          error: { 
            code: 'FEATURE_NOT_AVAILABLE', 
            message: `This feature requires a higher plan. Please upgrade.`,
            feature,
            currentPlan: company.planCode,
          } 
        });
      }

      (req as any).subscription = company;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware: Check usage limit (e.g., max invoices per month)
 */
export function checkLimit(limitType: 'invoices' | 'products' | 'customers' | 'users') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) {
        return res.status(401).json({ 
          success: false, 
          error: { code: 'NO_COMPANY', message: 'No company associated with user' } 
        });
      }

      const company = await getCompanySubscription(companyId);
      if (!company) {
        return res.status(404).json({ 
          success: false, 
          error: { code: 'COMPANY_NOT_FOUND', message: 'Company not found' } 
        });
      }

      const limits = getPlanLimits(company);
      let currentCount = 0;
      let maxLimit = 0;
      let limitName = '';

      switch (limitType) {
        case 'invoices':
          // Count invoices created this month
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          currentCount = await prisma.aRInvoice.count({
            where: { createdAt: { gte: startOfMonth } },
          });
          maxLimit = limits.maxInvoicesMonth;
          limitName = 'invoices this month';
          break;
        
        case 'products':
          currentCount = await prisma.product.count();
          maxLimit = limits.maxProducts;
          limitName = 'products';
          break;
        
        case 'customers':
          currentCount = await prisma.customer.count();
          maxLimit = limits.maxCustomers;
          limitName = 'customers';
          break;
        
        case 'users':
          currentCount = await prisma.user.count({ where: { companyId, isActive: true } });
          maxLimit = limits.maxUsers;
          limitName = 'users';
          break;
      }

      // 0 means unlimited
      if (maxLimit > 0 && currentCount >= maxLimit) {
        return res.status(403).json({ 
          success: false, 
          error: { 
            code: 'LIMIT_REACHED', 
            message: `You have reached the maximum ${limitName} (${maxLimit}) for your plan. Please upgrade.`,
            limitType,
            current: currentCount,
            max: maxLimit,
            currentPlan: company.planCode,
          } 
        });
      }

      (req as any).subscription = company;
      (req as any).usageInfo = { limitType, current: currentCount, max: maxLimit };
      next();
    } catch (error) {
      next(error);
    }
  };
}
