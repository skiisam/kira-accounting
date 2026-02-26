import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '../../services/api';
import toast from 'react-hot-toast';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface UserGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count?: {
    users: number;
    accessRights: number;
  };
}

interface AccessRight {
  id?: number;
  groupId: number;
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

// Available modules and their display names
const MODULES = [
  { code: 'SALES', name: 'Sales', functions: ['Invoice', 'Quotation', 'DeliveryOrder', 'CreditNote', 'DebitNote'] },
  { code: 'PURCHASE', name: 'Purchases', functions: ['Invoice', 'Order', 'GoodsReceived', 'CreditNote', 'DebitNote'] },
  { code: 'AR', name: 'Accounts Receivable', functions: ['Payment', 'Receipt', 'Refund'] },
  { code: 'AP', name: 'Accounts Payable', functions: ['Payment', 'Refund'] },
  { code: 'GL', name: 'General Ledger', functions: ['JournalEntry', 'ChartOfAccounts'] },
  { code: 'STOCK', name: 'Inventory', functions: ['Adjustment', 'Transfer', 'StockTake'] },
  { code: 'PRODUCTS', name: 'Products', functions: ['Product', 'Category', 'PriceList'] },
  { code: 'CUSTOMERS', name: 'Customers', functions: ['Customer', 'CustomerGroup'] },
  { code: 'VENDORS', name: 'Vendors', functions: ['Vendor', 'VendorGroup'] },
  { code: 'REPORTS', name: 'Reports', functions: ['Financial', 'Sales', 'Purchase', 'Inventory'] },
  { code: 'SETTINGS', name: 'Settings', functions: ['Company', 'TaxCodes', 'Currency', 'UOM'] },
  { code: 'USERS', name: 'User Management', functions: ['Users', 'Groups', 'AccessRights'] },
];

export default function AccessRightsPage() {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ code: '', name: '', description: '', isActive: true });

  // Fetch user groups
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['user-groups'],
    queryFn: () => get('/access-rights/groups'),
  });

  // Fetch permissions for selected group
  const { data: groupPermissions = [], isLoading: loadingPermissions } = useQuery<AccessRight[]>({
    queryKey: ['group-permissions', selectedGroup?.id],
    queryFn: () => get(`/access-rights/groups/${selectedGroup?.id}/permissions`),
    enabled: !!selectedGroup?.id,
  });

  // Save group mutation
  const saveGroupMutation = useMutation({
    mutationFn: async (data: typeof groupForm) => {
      if (editingGroup) {
        return put(`/access-rights/groups/${editingGroup.id}`, data);
      }
      return post('/access-rights/groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success(editingGroup ? 'Group updated' : 'Group created');
      setShowGroupModal(false);
      setEditingGroup(null);
      setGroupForm({ code: '', name: '', description: '', isActive: true });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to save group');
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => del(`/access-rights/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Group deleted');
      if (selectedGroup?.id === editingGroup?.id) {
        setSelectedGroup(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete group');
    },
  });

  // Save permissions mutation
  const savePermissionsMutation = useMutation({
    mutationFn: (data: { groupId: number; permissions: AccessRight[] }) => 
      put(`/access-rights/groups/${data.groupId}/permissions`, { permissions: data.permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-permissions', selectedGroup?.id] });
      toast.success('Permissions saved');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to save permissions');
    },
  });

  const openAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({ code: '', name: '', description: '', isActive: true });
    setShowGroupModal(true);
  };

  const openEditGroup = (group: UserGroup) => {
    setEditingGroup(group);
    setGroupForm({
      code: group.code,
      name: group.name,
      description: group.description || '',
      isActive: group.isActive,
    });
    setShowGroupModal(true);
  };

  const handleSelectGroup = (group: UserGroup) => {
    setSelectedGroup(group);
  };

  const getPermission = (moduleCode: string, functionCode: string): AccessRight => {
    const existing = (groupPermissions || []).find(
      (p: AccessRight) => p.moduleCode === moduleCode && p.functionCode === functionCode
    );
    return existing || {
      groupId: selectedGroup?.id || 0,
      moduleCode,
      functionCode,
      canView: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canPrint: false,
      canExport: false,
    };
  };

  const updatePermission = (moduleCode: string, functionCode: string, field: keyof AccessRight, value: boolean) => {
    const current = getPermission(moduleCode, functionCode);
    const updated = { ...current, [field]: value };
    
    // Update local state
    const newPermissions = [...(groupPermissions || [])];
    const idx = newPermissions.findIndex(
      (p: AccessRight) => p.moduleCode === moduleCode && p.functionCode === functionCode
    );
    if (idx >= 0) {
      newPermissions[idx] = updated;
    } else {
      newPermissions.push(updated);
    }
    
    // Auto-save
    if (selectedGroup) {
      savePermissionsMutation.mutate({
        groupId: selectedGroup.id,
        permissions: [updated],
      });
    }
  };

  const toggleAllForModule = (moduleCode: string, field: keyof AccessRight, value: boolean) => {
    const module = MODULES.find(m => m.code === moduleCode);
    if (!module || !selectedGroup) return;

    const updates = module.functions.map(fn => ({
      ...getPermission(moduleCode, fn),
      [field]: value,
    }));

    savePermissionsMutation.mutate({
      groupId: selectedGroup.id,
      permissions: updates,
    });
  };

  const PermissionCheckbox = ({ 
    moduleCode, 
    functionCode, 
    field,
    disabled = false,
  }: { 
    moduleCode: string; 
    functionCode: string; 
    field: keyof AccessRight;
    disabled?: boolean;
  }) => {
    const perm = getPermission(moduleCode, functionCode);
    const checked = perm[field] as boolean;
    
    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => updatePermission(moduleCode, functionCode, field, e.target.checked)}
        disabled={disabled || savePermissionsMutation.isPending}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
      />
    );
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - User Groups */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              User Groups
            </h2>
            <button
              onClick={openAddGroup}
              className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              title="Add Group"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500">Select a group to manage permissions</p>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
          {loadingGroups ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : (groups as UserGroup[]).length === 0 ? (
            <div className="p-4 text-center text-gray-500">No groups found</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {(groups as UserGroup[]).map((group) => (
                <li
                  key={group.id}
                  className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 ${
                    selectedGroup?.id === group.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectGroup(group)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-gray-500">{group.code}</div>
                      {group.description && (
                        <div className="text-xs text-gray-400 mt-1">{group.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {group._count && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                          {group._count.users} users
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditGroup(group); }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <PencilIcon className="h-4 w-4 text-gray-500" />
                      </button>
                      {group.code !== 'ADMIN' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteGroupMutation.mutate(group.id); }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Panel - Permissions Matrix */}
      <div className="flex-1 overflow-hidden">
        {!selectedGroup ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <ShieldCheckIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Select a user group to manage permissions</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
                Permissions for: {selectedGroup.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Configure what users in this group can access
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loadingPermissions ? (
                <div className="text-center py-8 text-gray-500">Loading permissions...</div>
              ) : (
                <div className="space-y-6">
                  {MODULES.map((module) => (
                    <div key={module.code} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                        <h3 className="font-semibold">{module.name}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase">
                              <th className="text-left px-4 py-2 w-48">Function</th>
                              <th className="text-center px-2 py-2 w-20">View</th>
                              <th className="text-center px-2 py-2 w-20">Add</th>
                              <th className="text-center px-2 py-2 w-20">Edit</th>
                              <th className="text-center px-2 py-2 w-20">Delete</th>
                              <th className="text-center px-2 py-2 w-20">Print</th>
                              <th className="text-center px-2 py-2 w-20">Export</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {/* All row */}
                            <tr className="bg-gray-50/50 dark:bg-slate-700/50">
                              <td className="px-4 py-2 font-medium text-sm">All Functions</td>
                              {['canView', 'canAdd', 'canEdit', 'canDelete', 'canPrint', 'canExport'].map((field) => (
                                <td key={field} className="text-center px-2 py-2">
                                  <button
                                    onClick={() => toggleAllForModule(module.code, field as keyof AccessRight, true)}
                                    className="text-xs text-blue-600 hover:text-blue-800 mr-1"
                                    title="Check all"
                                  >
                                    <CheckIcon className="h-4 w-4 inline" />
                                  </button>
                                  <button
                                    onClick={() => toggleAllForModule(module.code, field as keyof AccessRight, false)}
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                    title="Uncheck all"
                                  >
                                    <XMarkIcon className="h-4 w-4 inline" />
                                  </button>
                                </td>
                              ))}
                            </tr>
                            {module.functions.map((fn) => (
                              <tr key={fn} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                <td className="px-4 py-2 text-sm">{fn}</td>
                                <td className="text-center px-2 py-2">
                                  <PermissionCheckbox moduleCode={module.code} functionCode={fn} field="canView" />
                                </td>
                                <td className="text-center px-2 py-2">
                                  <PermissionCheckbox moduleCode={module.code} functionCode={fn} field="canAdd" />
                                </td>
                                <td className="text-center px-2 py-2">
                                  <PermissionCheckbox moduleCode={module.code} functionCode={fn} field="canEdit" />
                                </td>
                                <td className="text-center px-2 py-2">
                                  <PermissionCheckbox moduleCode={module.code} functionCode={fn} field="canDelete" />
                                </td>
                                <td className="text-center px-2 py-2">
                                  <PermissionCheckbox moduleCode={module.code} functionCode={fn} field="canPrint" />
                                </td>
                                <td className="text-center px-2 py-2">
                                  <PermissionCheckbox moduleCode={module.code} functionCode={fn} field="canExport" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingGroup ? 'Edit User Group' : 'Add User Group'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input
                  className="input w-full"
                  value={groupForm.code}
                  onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })}
                  disabled={!!editingGroup}
                  placeholder="e.g., SALES_TEAM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  className="input w-full"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="e.g., Sales Team"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="input w-full"
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={groupForm.isActive}
                  onChange={(e) => setGroupForm({ ...groupForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="isActive" className="text-sm">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowGroupModal(false); setEditingGroup(null); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => saveGroupMutation.mutate(groupForm)}
                className="btn btn-primary"
                disabled={!groupForm.code || !groupForm.name || saveGroupMutation.isPending}
              >
                {saveGroupMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
