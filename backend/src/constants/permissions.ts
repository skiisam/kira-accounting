/**
 * Permission definitions for TRAE Accounting
 * Module code -> Function code -> Actions
 */

export const MODULES = {
  SALES: 'SALES',
  PURCHASE: 'PURCHASE',
  AR: 'AR',
  AP: 'AP',
  STOCK: 'STOCK',
  REPORTS: 'REPORTS',
  SETTINGS: 'SETTINGS',
  USERS: 'USERS',
} as const;

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  POST: 'post',
  VOID: 'void',
  ADJUST: 'adjust',
  TRANSFER: 'transfer',
  MANAGE: 'manage',
} as const;

export type ModuleCode = typeof MODULES[keyof typeof MODULES];
export type ActionType = typeof ACTIONS[keyof typeof ACTIONS];

export interface ModulePermission {
  code: string;
  name: string;
  actions: ActionType[];
}

// Define what actions are available for each module
export const MODULE_PERMISSIONS: ModulePermission[] = [
  {
    code: MODULES.SALES,
    name: 'Sales',
    actions: ['view', 'create', 'edit', 'delete', 'post', 'void'],
  },
  {
    code: MODULES.PURCHASE,
    name: 'Purchases',
    actions: ['view', 'create', 'edit', 'delete', 'post', 'void'],
  },
  {
    code: MODULES.AR,
    name: 'Accounts Receivable',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    code: MODULES.AP,
    name: 'Accounts Payable',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    code: MODULES.STOCK,
    name: 'Stock/Inventory',
    actions: ['view', 'adjust', 'transfer'],
  },
  {
    code: MODULES.REPORTS,
    name: 'Reports',
    actions: ['view'],
  },
  {
    code: MODULES.SETTINGS,
    name: 'Settings',
    actions: ['view', 'edit'],
  },
  {
    code: MODULES.USERS,
    name: 'User Management',
    actions: ['manage'],
  },
];

// Default permissions for Admin role (full access)
export const ADMIN_PERMISSIONS: Record<string, ActionType[]> = {
  [MODULES.SALES]: ['view', 'create', 'edit', 'delete', 'post', 'void'],
  [MODULES.PURCHASE]: ['view', 'create', 'edit', 'delete', 'post', 'void'],
  [MODULES.AR]: ['view', 'create', 'edit', 'delete'],
  [MODULES.AP]: ['view', 'create', 'edit', 'delete'],
  [MODULES.STOCK]: ['view', 'adjust', 'transfer'],
  [MODULES.REPORTS]: ['view'],
  [MODULES.SETTINGS]: ['view', 'edit'],
  [MODULES.USERS]: ['manage'],
};

// Default permissions for Staff role (limited access)
export const STAFF_PERMISSIONS: Record<string, ActionType[]> = {
  [MODULES.SALES]: ['view', 'create', 'edit'],
  [MODULES.PURCHASE]: ['view', 'create', 'edit'],
  [MODULES.AR]: ['view'],
  [MODULES.AP]: ['view'],
  [MODULES.STOCK]: ['view'],
  [MODULES.REPORTS]: ['view'],
  [MODULES.SETTINGS]: ['view'],
  [MODULES.USERS]: [],
};

// Action descriptions for UI
export const ACTION_LABELS: Record<ActionType, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  post: 'Post',
  void: 'Void',
  adjust: 'Adjust',
  transfer: 'Transfer',
  manage: 'Manage',
};
