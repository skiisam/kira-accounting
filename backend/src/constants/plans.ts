/**
 * Subscription Plan Definitions for KIRA Accounting
 */

export const PLAN_CODES = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
} as const;

export type PlanCode = typeof PLAN_CODES[keyof typeof PLAN_CODES];

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
} as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];

// Feature flags that can be enabled/disabled per plan
export const FEATURES = {
  // Core Features
  BASIC_INVOICING: 'basicInvoicing',
  BASIC_REPORTS: 'basicReports',
  
  // E-Invoice
  EINVOICE_BASIC: 'einvoiceBasic',         // Submit to LHDN
  EINVOICE_ADVANCED: 'einvoiceAdvanced',   // Bulk submit, auto-sync
  
  // Multi-X Features
  MULTI_CURRENCY: 'multiCurrency',
  MULTI_LOCATION: 'multiLocation',
  MULTI_COMPANY: 'multiCompany',
  
  // Advanced Features
  ADVANCED_REPORTS: 'advancedReports',     // P&L, Balance Sheet, Cash Flow
  CUSTOM_REPORTS: 'customReports',         // Report builder
  INVENTORY_MANAGEMENT: 'inventoryManagement',
  BATCH_SERIAL_TRACKING: 'batchSerialTracking',
  PROJECT_COSTING: 'projectCosting',
  BUDGET_MANAGEMENT: 'budgetManagement',
  
  // Integration
  API_ACCESS: 'apiAccess',
  WEBHOOK_NOTIFICATIONS: 'webhookNotifications',
  THIRD_PARTY_INTEGRATIONS: 'thirdPartyIntegrations',
  
  // Support & Customization
  PRIORITY_SUPPORT: 'prioritySupport',
  CUSTOM_BRANDING: 'customBranding',
  WHITE_LABEL: 'whiteLabel',
  DEDICATED_SUPPORT: 'dedicatedSupport',
  
  // Security
  AUDIT_TRAIL: 'auditTrail',
  ADVANCED_PERMISSIONS: 'advancedPermissions',
  TWO_FACTOR_AUTH: 'twoFactorAuth',
  SSO: 'sso',
} as const;

export type FeatureCode = typeof FEATURES[keyof typeof FEATURES];

// Default plan configurations
export const DEFAULT_PLANS: Array<{
  code: PlanCode;
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
}> = [
  {
    code: PLAN_CODES.FREE,
    name: 'Free',
    description: 'Perfect for trying out KIRA. Basic invoicing with limited features.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxUsers: 1,
    maxCompanies: 1,
    maxInvoicesMonth: 20,
    maxProducts: 50,
    maxCustomers: 50,
    storageGb: 1,
    features: {
      [FEATURES.BASIC_INVOICING]: true,
      [FEATURES.BASIC_REPORTS]: true,
      [FEATURES.AUDIT_TRAIL]: false,
      [FEATURES.EINVOICE_BASIC]: false,
      [FEATURES.MULTI_CURRENCY]: false,
      [FEATURES.MULTI_LOCATION]: false,
      [FEATURES.ADVANCED_REPORTS]: false,
      [FEATURES.API_ACCESS]: false,
    },
    sortOrder: 1,
  },
  {
    code: PLAN_CODES.STARTER,
    name: 'Starter',
    description: 'For small businesses getting started with e-invoicing.',
    monthlyPrice: 49,
    yearlyPrice: 490,  // ~17% discount
    maxUsers: 3,
    maxCompanies: 1,
    maxInvoicesMonth: 200,
    maxProducts: 500,
    maxCustomers: 500,
    storageGb: 5,
    features: {
      [FEATURES.BASIC_INVOICING]: true,
      [FEATURES.BASIC_REPORTS]: true,
      [FEATURES.AUDIT_TRAIL]: true,
      [FEATURES.EINVOICE_BASIC]: true,
      [FEATURES.MULTI_CURRENCY]: false,
      [FEATURES.MULTI_LOCATION]: false,
      [FEATURES.ADVANCED_REPORTS]: true,
      [FEATURES.INVENTORY_MANAGEMENT]: true,
      [FEATURES.API_ACCESS]: false,
      [FEATURES.TWO_FACTOR_AUTH]: true,
    },
    sortOrder: 2,
  },
  {
    code: PLAN_CODES.PROFESSIONAL,
    name: 'Professional',
    description: 'For growing businesses that need advanced features.',
    monthlyPrice: 149,
    yearlyPrice: 1490,  // ~17% discount
    maxUsers: 10,
    maxCompanies: 3,
    maxInvoicesMonth: 0,  // Unlimited
    maxProducts: 0,       // Unlimited
    maxCustomers: 0,      // Unlimited
    storageGb: 20,
    features: {
      [FEATURES.BASIC_INVOICING]: true,
      [FEATURES.BASIC_REPORTS]: true,
      [FEATURES.AUDIT_TRAIL]: true,
      [FEATURES.EINVOICE_BASIC]: true,
      [FEATURES.EINVOICE_ADVANCED]: true,
      [FEATURES.MULTI_CURRENCY]: true,
      [FEATURES.MULTI_LOCATION]: true,
      [FEATURES.ADVANCED_REPORTS]: true,
      [FEATURES.CUSTOM_REPORTS]: true,
      [FEATURES.INVENTORY_MANAGEMENT]: true,
      [FEATURES.BATCH_SERIAL_TRACKING]: true,
      [FEATURES.PROJECT_COSTING]: true,
      [FEATURES.API_ACCESS]: true,
      [FEATURES.WEBHOOK_NOTIFICATIONS]: true,
      [FEATURES.PRIORITY_SUPPORT]: true,
      [FEATURES.CUSTOM_BRANDING]: true,
      [FEATURES.TWO_FACTOR_AUTH]: true,
      [FEATURES.ADVANCED_PERMISSIONS]: true,
    },
    sortOrder: 3,
  },
  {
    code: PLAN_CODES.ENTERPRISE,
    name: 'Enterprise',
    description: 'For large organizations with custom requirements.',
    monthlyPrice: 399,
    yearlyPrice: 3990,  // ~17% discount
    maxUsers: 0,        // Unlimited
    maxCompanies: 0,    // Unlimited
    maxInvoicesMonth: 0,
    maxProducts: 0,
    maxCustomers: 0,
    storageGb: 100,
    features: {
      [FEATURES.BASIC_INVOICING]: true,
      [FEATURES.BASIC_REPORTS]: true,
      [FEATURES.AUDIT_TRAIL]: true,
      [FEATURES.EINVOICE_BASIC]: true,
      [FEATURES.EINVOICE_ADVANCED]: true,
      [FEATURES.MULTI_CURRENCY]: true,
      [FEATURES.MULTI_LOCATION]: true,
      [FEATURES.MULTI_COMPANY]: true,
      [FEATURES.ADVANCED_REPORTS]: true,
      [FEATURES.CUSTOM_REPORTS]: true,
      [FEATURES.INVENTORY_MANAGEMENT]: true,
      [FEATURES.BATCH_SERIAL_TRACKING]: true,
      [FEATURES.PROJECT_COSTING]: true,
      [FEATURES.BUDGET_MANAGEMENT]: true,
      [FEATURES.API_ACCESS]: true,
      [FEATURES.WEBHOOK_NOTIFICATIONS]: true,
      [FEATURES.THIRD_PARTY_INTEGRATIONS]: true,
      [FEATURES.PRIORITY_SUPPORT]: true,
      [FEATURES.DEDICATED_SUPPORT]: true,
      [FEATURES.CUSTOM_BRANDING]: true,
      [FEATURES.WHITE_LABEL]: true,
      [FEATURES.TWO_FACTOR_AUTH]: true,
      [FEATURES.ADVANCED_PERMISSIONS]: true,
      [FEATURES.SSO]: true,
    },
    sortOrder: 4,
  },
];

// Feature labels for UI
export const FEATURE_LABELS: Record<string, { name: string; description: string }> = {
  [FEATURES.BASIC_INVOICING]: { name: 'Basic Invoicing', description: 'Create and manage invoices' },
  [FEATURES.BASIC_REPORTS]: { name: 'Basic Reports', description: 'Sales and purchase reports' },
  [FEATURES.EINVOICE_BASIC]: { name: 'E-Invoice', description: 'LHDN MyInvois integration' },
  [FEATURES.EINVOICE_ADVANCED]: { name: 'Advanced E-Invoice', description: 'Bulk submit and auto-sync' },
  [FEATURES.MULTI_CURRENCY]: { name: 'Multi-Currency', description: 'Handle multiple currencies' },
  [FEATURES.MULTI_LOCATION]: { name: 'Multi-Location', description: 'Multiple warehouses/branches' },
  [FEATURES.MULTI_COMPANY]: { name: 'Multi-Company', description: 'Manage multiple companies' },
  [FEATURES.ADVANCED_REPORTS]: { name: 'Advanced Reports', description: 'P&L, Balance Sheet, Cash Flow' },
  [FEATURES.CUSTOM_REPORTS]: { name: 'Custom Reports', description: 'Build your own reports' },
  [FEATURES.INVENTORY_MANAGEMENT]: { name: 'Inventory', description: 'Stock tracking and management' },
  [FEATURES.BATCH_SERIAL_TRACKING]: { name: 'Batch/Serial', description: 'Track batches and serial numbers' },
  [FEATURES.PROJECT_COSTING]: { name: 'Project Costing', description: 'Track costs by project' },
  [FEATURES.BUDGET_MANAGEMENT]: { name: 'Budget Management', description: 'Create and track budgets' },
  [FEATURES.API_ACCESS]: { name: 'API Access', description: 'Integrate with other systems' },
  [FEATURES.WEBHOOK_NOTIFICATIONS]: { name: 'Webhooks', description: 'Real-time event notifications' },
  [FEATURES.THIRD_PARTY_INTEGRATIONS]: { name: 'Integrations', description: 'Connect to 3rd party apps' },
  [FEATURES.PRIORITY_SUPPORT]: { name: 'Priority Support', description: 'Faster response times' },
  [FEATURES.DEDICATED_SUPPORT]: { name: 'Dedicated Support', description: 'Personal account manager' },
  [FEATURES.CUSTOM_BRANDING]: { name: 'Custom Branding', description: 'Your logo on documents' },
  [FEATURES.WHITE_LABEL]: { name: 'White Label', description: 'Remove KIRA branding' },
  [FEATURES.AUDIT_TRAIL]: { name: 'Audit Trail', description: 'Track all changes' },
  [FEATURES.ADVANCED_PERMISSIONS]: { name: 'Advanced Permissions', description: 'Granular access control' },
  [FEATURES.TWO_FACTOR_AUTH]: { name: '2FA', description: 'Two-factor authentication' },
  [FEATURES.SSO]: { name: 'SSO', description: 'Single sign-on integration' },
};
