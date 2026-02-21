import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../services/api';
import { useAuthStore } from '../store/authStore';

// Module codes matching backend
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

export interface PermissionsData {
  isAdmin: boolean;
  permissions: Record<string, string[]>;
  modules: ModulePermission[];
}

/**
 * Hook to fetch and check user permissions
 */
export function usePermissions() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const { data, isLoading, error } = useQuery<PermissionsData>({
    queryKey: ['my-permissions'],
    queryFn: () => get('/settings/my-permissions'),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const isAdmin = user?.isAdmin || data?.isAdmin || false;
  const permissions = data?.permissions || {};

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (moduleCode: ModuleCode | string, action: ActionType | string): boolean => {
    if (isAdmin) return true;
    const modulePermissions = permissions[moduleCode];
    return modulePermissions ? modulePermissions.includes(action) : false;
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (checks: Array<{ module: ModuleCode | string; action: ActionType | string }>): boolean => {
    if (isAdmin) return true;
    return checks.some(({ module, action }) => hasPermission(module, action));
  };

  /**
   * Check if user can view a module
   */
  const canView = (moduleCode: ModuleCode | string): boolean => hasPermission(moduleCode, 'view');

  /**
   * Check if user can create in a module
   */
  const canCreate = (moduleCode: ModuleCode | string): boolean => hasPermission(moduleCode, 'create');

  /**
   * Check if user can edit in a module
   */
  const canEdit = (moduleCode: ModuleCode | string): boolean => hasPermission(moduleCode, 'edit');

  /**
   * Check if user can delete in a module
   */
  const canDelete = (moduleCode: ModuleCode | string): boolean => hasPermission(moduleCode, 'delete');

  /**
   * Check if user can post documents in a module
   */
  const canPost = (moduleCode: ModuleCode | string): boolean => hasPermission(moduleCode, 'post');

  /**
   * Check if user can void documents in a module
   */
  const canVoid = (moduleCode: ModuleCode | string): boolean => hasPermission(moduleCode, 'void');

  return {
    isLoading,
    error,
    isAdmin,
    permissions,
    modules: data?.modules || [],
    hasPermission,
    hasAnyPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canPost,
    canVoid,
  };
}

/**
 * Component to conditionally render based on permissions
 */
export function PermissionGate({
  module,
  action,
  children,
  fallback = null,
}: {
  module: ModuleCode | string;
  action: ActionType | string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) return null;
  if (!hasPermission(module, action)) return <>{fallback}</>;
  return <>{children}</>;
}

export default usePermissions;
