import { useQuery } from '@tanstack/react-query';
import { get } from '../services/api';
import { useAuthStore } from '../store/authStore';

// Feature codes - must match backend
export const FEATURES = {
  BASIC_INVOICING: 'basicInvoicing',
  BASIC_REPORTS: 'basicReports',
  EINVOICE_BASIC: 'einvoiceBasic',
  EINVOICE_ADVANCED: 'einvoiceAdvanced',
  MULTI_CURRENCY: 'multiCurrency',
  MULTI_LOCATION: 'multiLocation',
  MULTI_COMPANY: 'multiCompany',
  ADVANCED_REPORTS: 'advancedReports',
  CUSTOM_REPORTS: 'customReports',
  INVENTORY_MANAGEMENT: 'inventoryManagement',
  BATCH_SERIAL_TRACKING: 'batchSerialTracking',
  PROJECT_COSTING: 'projectCosting',
  BUDGET_MANAGEMENT: 'budgetManagement',
  API_ACCESS: 'apiAccess',
  WEBHOOK_NOTIFICATIONS: 'webhookNotifications',
  THIRD_PARTY_INTEGRATIONS: 'thirdPartyIntegrations',
  PRIORITY_SUPPORT: 'prioritySupport',
  DEDICATED_SUPPORT: 'dedicatedSupport',
  CUSTOM_BRANDING: 'customBranding',
  WHITE_LABEL: 'whiteLabel',
  AUDIT_TRAIL: 'auditTrail',
  ADVANCED_PERMISSIONS: 'advancedPermissions',
  TWO_FACTOR_AUTH: 'twoFactorAuth',
  SSO: 'sso',
} as const;

export type FeatureCode = typeof FEATURES[keyof typeof FEATURES];

export interface SubscriptionFeatures {
  planCode: string;
  status: string;
  isActive: boolean;
  features: Record<string, boolean>;
  limits: {
    maxUsers: number;
    maxInvoicesMonth: number;
    maxProducts: number;
    maxCustomers: number;
  };
  // Quick access helpers
  hasEinvoice: boolean;
  hasMultiCurrency: boolean;
  hasMultiLocation: boolean;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasInventory: boolean;
}

export interface SubscriptionPlan {
  code: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxUsers: number;
  maxCompanies: number;
  maxInvoicesMonth: number;
  maxProducts: number;
  maxCustomers: number;
  storageGb: number;
  features: Record<string, boolean>;
  sortOrder: number;
}

/**
 * Hook to get current subscription features and check feature availability
 */
export function useSubscription() {
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useQuery<SubscriptionFeatures>({
    queryKey: ['subscription-features'],
    queryFn: async () => {
      const response = await get('/subscription/features') as { data: SubscriptionFeatures };
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const features = data?.features || {};
  const isActive = data?.isActive ?? true;

  /**
   * Check if a feature is available in the current plan
   */
  const hasFeature = (feature: FeatureCode): boolean => {
    if (!isActive) return false;
    return features[feature] === true;
  };

  /**
   * Check if user has reached a limit
   */
  const isAtLimit = (limitType: 'users' | 'invoices' | 'products' | 'customers', current: number): boolean => {
    if (!data?.limits) return false;
    const limitMap: Record<string, number> = {
      users: data.limits.maxUsers,
      invoices: data.limits.maxInvoicesMonth,
      products: data.limits.maxProducts,
      customers: data.limits.maxCustomers,
    };
    const max = limitMap[limitType];
    return max > 0 && current >= max;
  };

  /**
   * Get remaining quota for a limit type
   */
  const getRemainingQuota = (limitType: 'users' | 'invoices' | 'products' | 'customers', current: number): number | 'unlimited' => {
    if (!data?.limits) return 0;
    const limitMap: Record<string, number> = {
      users: data.limits.maxUsers,
      invoices: data.limits.maxInvoicesMonth,
      products: data.limits.maxProducts,
      customers: data.limits.maxCustomers,
    };
    const max = limitMap[limitType];
    if (max === 0) return 'unlimited';
    return Math.max(0, max - current);
  };

  return {
    isLoading,
    error,
    planCode: data?.planCode || 'FREE',
    status: data?.status || 'TRIAL',
    isActive,
    features,
    limits: data?.limits,
    hasFeature,
    isAtLimit,
    getRemainingQuota,
    // Quick access
    hasEinvoice: data?.hasEinvoice || false,
    hasMultiCurrency: data?.hasMultiCurrency || false,
    hasMultiLocation: data?.hasMultiLocation || false,
    hasAdvancedReports: data?.hasAdvancedReports || false,
    hasApiAccess: data?.hasApiAccess || false,
    hasInventory: data?.hasInventory || false,
  };
}

/**
 * Hook to fetch available subscription plans
 */
export function useSubscriptionPlans() {
  const { data, isLoading, error } = useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await get('/subscription/plans') as { data: SubscriptionPlan[] };
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    plans: data || [],
    isLoading,
    error,
  };
}

/**
 * Hook for checking a single feature
 * Usage: const canUseEinvoice = useFeature(FEATURES.EINVOICE_BASIC);
 */
export function useFeature(feature: FeatureCode): boolean {
  const { hasFeature } = useSubscription();
  return hasFeature(feature);
}
