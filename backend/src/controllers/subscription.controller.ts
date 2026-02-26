import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { DEFAULT_PLANS, FEATURES, FEATURE_LABELS, SUBSCRIPTION_STATUS } from '../constants/plans';
import { clearSubscriptionCache, getCompanySubscription, getPlanLimits, hasFeature } from '../middleware/subscription';
import { NotFoundError, ValidationError } from '../middleware/errorHandler';

/**
 * Subscription Controller
 * Handles plan management and subscription operations
 */
export class SubscriptionController {
  /**
   * GET /api/v1/subscription/plans
   * List all available subscription plans
   */
  listPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      res.json({ 
        success: true, 
        data: plans.map(plan => ({
          ...plan,
          features: plan.features || {},
          featureLabels: FEATURE_LABELS,
        })),
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/subscription/current
   * Get current company's subscription status
   */
  getCurrentSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) {
        return res.status(401).json({ success: false, error: { message: 'No company associated' } });
      }

      const company = await getCompanySubscription(companyId);
      if (!company) {
        throw NotFoundError('Company not found');
      }

      // Get usage stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [invoiceCount, productCount, customerCount, userCount] = await Promise.all([
        prisma.aRInvoice.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.product.count(),
        prisma.customer.count(),
        prisma.user.count({ where: { companyId, isActive: true } }),
      ]);

      const limits = getPlanLimits(company);
      const features = (company.plan?.features || {}) as Record<string, boolean>;

      res.json({
        success: true,
        data: {
          planCode: company.planCode,
          planName: company.plan?.code,
          status: company.subscriptionStatus,
          trialEndsAt: company.trialEndsAt,
          subscriptionEndsAt: company.subscriptionEndsAt,
          limits,
          usage: {
            invoicesThisMonth: invoiceCount,
            products: productCount,
            customers: customerCount,
            users: userCount,
          },
          features,
          featureList: Object.entries(features)
            .filter(([_, enabled]) => enabled)
            .map(([code]) => ({
              code,
              ...FEATURE_LABELS[code],
            })),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/subscription/features
   * Get available features for current plan (for frontend feature gating)
   */
  getFeatures = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId;
      if (!companyId) {
        // Return free tier features for unauthenticated
        const freePlan = DEFAULT_PLANS.find(p => p.code === 'FREE');
        return res.json({
          success: true,
          data: {
            planCode: 'FREE',
            features: freePlan?.features || {},
            limits: {
              maxUsers: freePlan?.maxUsers || 1,
              maxInvoicesMonth: freePlan?.maxInvoicesMonth || 50,
              maxProducts: freePlan?.maxProducts || 100,
              maxCustomers: freePlan?.maxCustomers || 100,
            },
          },
        });
      }

      const company = await getCompanySubscription(companyId);
      if (!company) {
        throw NotFoundError('Company not found');
      }

      const features = (company.plan?.features || {}) as Record<string, boolean>;
      const limits = getPlanLimits(company);

      res.json({
        success: true,
        data: {
          planCode: company.planCode,
          status: company.subscriptionStatus,
          isActive: company.subscriptionStatus === 'ACTIVE' || company.subscriptionStatus === 'TRIAL',
          features,
          limits,
          // Quick access helpers
          hasEinvoice: features[FEATURES.EINVOICE_BASIC] || false,
          hasMultiCurrency: features[FEATURES.MULTI_CURRENCY] || false,
          hasMultiLocation: features[FEATURES.MULTI_LOCATION] || false,
          hasAdvancedReports: features[FEATURES.ADVANCED_REPORTS] || false,
          hasApiAccess: features[FEATURES.API_ACCESS] || false,
          hasInventory: features[FEATURES.INVENTORY_MANAGEMENT] || false,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscription/upgrade
   * Initiate plan upgrade (placeholder for Stripe integration)
   */
  upgradePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = (req as any).user?.companyId;
      const { planCode, billingCycle } = req.body;

      if (!companyId) {
        return res.status(401).json({ success: false, error: { message: 'No company associated' } });
      }

      if (!planCode) {
        throw ValidationError({ message: 'Plan code is required' });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
      if (!plan) {
        throw NotFoundError('Plan not found');
      }

      // For now, just update the plan directly
      // In production, this would create a Stripe checkout session
      const company = await prisma.company.update({
        where: { id: companyId },
        data: {
          planCode,
          billingCycle: billingCycle || 'MONTHLY',
          subscriptionStatus: SUBSCRIPTION_STATUS.ACTIVE,
          subscriptionStartAt: new Date(),
          subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        },
      });

      clearSubscriptionCache(companyId);

      res.json({
        success: true,
        message: `Upgraded to ${plan.name} plan`,
        data: {
          planCode: company.planCode,
          status: company.subscriptionStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscription/extend-trial
   * Extend trial period (admin only)
   */
  extendTrial = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { companyId, days } = req.body;
      
      if (!companyId || !days) {
        throw ValidationError({ message: 'companyId and days are required' });
      }

      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        throw NotFoundError('Company not found');
      }

      const currentTrialEnd = company.trialEndsAt || new Date();
      const newTrialEnd = new Date(currentTrialEnd.getTime() + days * 24 * 60 * 60 * 1000);

      await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: SUBSCRIPTION_STATUS.TRIAL,
          trialEndsAt: newTrialEnd,
        },
      });

      clearSubscriptionCache(companyId);

      res.json({
        success: true,
        message: `Trial extended by ${days} days until ${newTrialEnd.toISOString()}`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/subscription/check-feature/:feature
   * Quick check if a feature is available
   */
  checkFeature = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { feature } = req.params;
      const companyId = (req as any).user?.companyId;

      if (!companyId) {
        return res.json({ success: true, data: { available: false, reason: 'No company' } });
      }

      const company = await getCompanySubscription(companyId);
      if (!company) {
        return res.json({ success: true, data: { available: false, reason: 'Company not found' } });
      }

      const available = hasFeature(company, feature as any);
      
      res.json({
        success: true,
        data: {
          feature,
          available,
          currentPlan: company.planCode,
          reason: available ? null : 'Feature not included in your plan',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // ==================== ADMIN ONLY ====================

  /**
   * POST /api/v1/subscription/plans (Admin)
   * Create or update subscription plan
   */
  upsertPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, description, monthlyPrice, yearlyPrice, ...rest } = req.body;

      if (!code || !name) {
        throw ValidationError({ message: 'Code and name are required' });
      }

      const plan = await prisma.subscriptionPlan.upsert({
        where: { code },
        update: { name, description, monthlyPrice, yearlyPrice, ...rest },
        create: { code, name, description, monthlyPrice, yearlyPrice, ...rest },
      });

      res.json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/subscription/seed-plans (Admin)
   * Seed default plans
   */
  seedPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = [];
      
      for (const plan of DEFAULT_PLANS) {
        const result = await prisma.subscriptionPlan.upsert({
          where: { code: plan.code },
          update: {
            name: plan.name,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
            maxUsers: plan.maxUsers,
            maxCompanies: plan.maxCompanies,
            maxInvoicesMonth: plan.maxInvoicesMonth,
            maxProducts: plan.maxProducts,
            maxCustomers: plan.maxCustomers,
            storageGb: plan.storageGb,
            features: plan.features,
            sortOrder: plan.sortOrder,
          },
          create: {
            code: plan.code,
            name: plan.name,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
            maxUsers: plan.maxUsers,
            maxCompanies: plan.maxCompanies,
            maxInvoicesMonth: plan.maxInvoicesMonth,
            maxProducts: plan.maxProducts,
            maxCustomers: plan.maxCustomers,
            storageGb: plan.storageGb,
            features: plan.features,
            sortOrder: plan.sortOrder,
          },
        });
        results.push(result);
      }

      res.json({ success: true, message: `Seeded ${results.length} plans`, data: results });
    } catch (error) {
      next(error);
    }
  };
}

export const subscriptionController = new SubscriptionController();
