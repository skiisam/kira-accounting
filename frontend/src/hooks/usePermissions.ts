import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { get } from '../services/api';

// Module codes - must match backend
export const MODULES = {
  SALES: 'SALES',
  PURCHASE: 'PURCHASE',
  AR: 'AR',
  AP: 'AP',
  STOCK: 'STOCK',
  GL: 'GL',
  REPORTS: 'REPORTS',
  SETTINGS: 'SETTINGS',
  USERS: 'USERS',
  CRM: 'CRM',
  PRODUCTS: 'PRODUCTS',
  CUSTOMERS: 'CUSTOMERS',
  VENDORS: 'VENDORS',
} as const;

// Action types
export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  POST: 'post',
  VOID: 'void',
  PRINT: 'print',
  EXPORT: 'export',
  APPROVE: 'approve',
  MANAGE: 'manage',
} as const;

export type ModuleCode = typeof MODULES[keyof typeof MODULES];
export type ActionType = typeof ACTIONS[keyof typeof ACTIONS];

export interface Permission {
  moduleCode: string;
  functionCode: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canExport: boolean;
  customPermissions?: Record<string, boolean>;
}

export interface UserPermissions {
  isAdmin: boolean;
  groupId: number;
  groupCode: string;
  permissions: Permission[];
}

/**
 * Hook to fetch and check user permissions
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuthStore();

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['my-permissions'],
    queryFn: () => get('/access-rights/my-permissions'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const permissions = permissionsData as UserPermissions | undefined;
  const isAdmin = user?.isAdmin || permissions?.isAdmin || false;

  /**
   * Check if user can perform an action on a module
   */
  const can = (module: ModuleCode, action: ActionType): boolean => {
    // Admin has full access
    if (isAdmin) return true;

    if (!permissions?.permissions) return false;

    const perm = permissions.permissions.find(
      p => p.moduleCode === module || p.moduleCode === module.toLowerCase()
    );

    if (!perm) return false;

    switch (action) {
      case ACTIONS.VIEW:
        return perm.canView;
      case ACTIONS.CREATE:
        return perm.canAdd;
      case ACTIONS.EDIT:
        return perm.canEdit;
      case ACTIONS.DELETE:
        return perm.canDelete;
      case ACTIONS.PRINT:
        return perm.canPrint;
      case ACTIONS.EXPORT:
        return perm.canExport;
      case ACTIONS.POST:
      case ACTIONS.VOID:
      case ACTIONS.APPROVE:
      case ACTIONS.MANAGE:
        return perm.customPermissions?.[action] ?? false;
      default:
        return false;
    }
  };

  /**
   * Check if user can view a module
   */
  const canView = (module: ModuleCode): boolean => can(module, ACTIONS.VIEW);
  
  /**
   * Check if user can create in a module
   */
  const canCreate = (module: ModuleCode): boolean => can(module, ACTIONS.CREATE);
  
  /**
   * Check if user can edit in a module
   */
  const canEdit = (module: ModuleCode): boolean => can(module, ACTIONS.EDIT);
  
  /**
   * Check if user can delete in a module
   */
  const canDelete = (module: ModuleCode): boolean => can(module, ACTIONS.DELETE);

  /**
   * Get all permissions for a module
   */
  const getModulePermissions = (module: ModuleCode): Permission | null => {
    if (isAdmin) {
      return {
        moduleCode: module,
        functionCode: '*',
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canPrint: true,
        canExport: true,
      };
    }
    return permissions?.permissions?.find(p => p.moduleCode === module) || null;
  };

  /**
   * Check if user can post/approve in a module
   */
  const canPost = (module: ModuleCode): boolean => can(module, ACTIONS.POST);
  
  /**
   * Check if user can print in a module
   */
  const canPrint = (module: ModuleCode): boolean => can(module, ACTIONS.PRINT);

  /**
   * Alias for can() - for backward compatibility
   */
  const hasPermission = (module: ModuleCode, action: ActionType | string): boolean => {
    return can(module, action as ActionType);
  };

  return {
    isLoading,
    isAdmin,
    permissions: permissions?.permissions || [],
    groupCode: permissions?.groupCode,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canPost,
    canPrint,
    hasPermission,
    getModulePermissions,
  };
}

/**
 * Hook for checking a single permission
 * Usage: const canEditSales = usePermission(MODULES.SALES, ACTIONS.EDIT);
 */
export function usePermission(module: ModuleCode, action: ActionType): boolean {
  const { can } = usePermissions();
  return can(module, action);
}
