import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

interface UserGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count?: { users: number };
}

interface ModulePermission {
  code: string;
  name: string;
  actions: string[];
}

interface AccessRightsData {
  groupId: number;
  permissions: Record<string, string[]>;
  modules: ModulePermission[];
}

const ACTION_LABELS: Record<string, string> = {
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

export default function UserGroupsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', description: '' });

  const { data: groups, isLoading } = useQuery<UserGroup[]>({
    queryKey: ['user-groups'],
    queryFn: () => get('/settings/user-groups'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => post('/settings/user-groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('User group created');
      setShowForm(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => put(`/settings/user-groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('User group updated');
      setShowForm(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => del(`/settings/user-groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('User group deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to delete'),
  });

  const resetForm = () => {
    setFormData({ code: '', name: '', description: '' });
    setEditingGroup(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (group: UserGroup) => {
    setEditingGroup(group);
    setFormData({ code: group.code, name: group.name, description: group.description || '' });
    setShowForm(true);
    setShowPermissions(false);
  };

  const handlePermissions = (group: UserGroup) => {
    setEditingGroup(group);
    setShowPermissions(true);
    setShowForm(false);
  };

  const handleDelete = (group: UserGroup) => {
    if ((group._count?.users || 0) > 0) {
      toast.error(`Cannot delete group with ${group._count?.users} users`);
      return;
    }
    if (confirm(`Delete user group "${group.name}"?`)) {
      deleteMutation.mutate(group.id);
    }
  };

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description' },
    { key: 'users', header: 'Users', render: (row: UserGroup) => row._count?.users || 0 },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: UserGroup) => (
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => handlePermissions(row)}>
            Permissions
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(row)}>
            Edit
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleDelete(row)}
            disabled={(row._count?.users || 0) > 0}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">User Groups</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
            setShowPermissions(false);
          }}
        >
          Add Group
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="card bg-gray-50">
          <div className="card-body">
            <h3 className="font-medium mb-4">{editingGroup ? 'Edit Group' : 'New Group'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Code</label>
                <input
                  className="input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  disabled={!!editingGroup}
                  required
                  maxLength={20}
                />
              </div>
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <input
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Editor */}
      {showPermissions && editingGroup && (
        <PermissionsEditor
          group={editingGroup}
          onClose={() => {
            setShowPermissions(false);
            setEditingGroup(null);
          }}
        />
      )}

      {/* Groups Table */}
      <DataTable columns={columns} data={groups || []} loading={isLoading} />
    </div>
  );
}

function PermissionsEditor({ group, onClose }: { group: UserGroup; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading } = useQuery<AccessRightsData>({
    queryKey: ['access-rights', group.id],
    queryFn: () => get(`/settings/access-rights/${group.id}`),
  });

  // Initialize permissions when data loads
  useState(() => {
    if (data?.permissions) {
      setPermissions(data.permissions);
    }
  });

  // Update when data changes
  if (data?.permissions && Object.keys(permissions).length === 0) {
    setPermissions(data.permissions);
  }

  const saveMutation = useMutation({
    mutationFn: (perms: Record<string, string[]>) => put(`/settings/access-rights/${group.id}`, { permissions: perms }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-rights', group.id] });
      queryClient.invalidateQueries({ queryKey: ['my-permissions'] });
      toast.success('Permissions saved');
      setHasChanges(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || 'Failed to save'),
  });

  const togglePermission = (moduleCode: string, action: string) => {
    setPermissions((prev) => {
      const modulePerms = prev[moduleCode] || [];
      const newPerms = modulePerms.includes(action)
        ? modulePerms.filter((a) => a !== action)
        : [...modulePerms, action];
      return { ...prev, [moduleCode]: newPerms };
    });
    setHasChanges(true);
  };

  const toggleAllForModule = (moduleCode: string, actions: string[]) => {
    const modulePerms = permissions[moduleCode] || [];
    const allEnabled = actions.every((a) => modulePerms.includes(a));
    setPermissions((prev) => ({
      ...prev,
      [moduleCode]: allEnabled ? [] : [...actions],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(permissions);
  };

  if (isLoading) {
    return <div className="card p-4">Loading permissions...</div>;
  }

  const modules = data?.modules || [];

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Permissions for: {group.name}</h3>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Permissions'}
            </button>
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-2 font-medium">Module</th>
                <th className="text-center p-2 font-medium">All</th>
                {Object.keys(ACTION_LABELS).map((action) => (
                  <th key={action} className="text-center p-2 font-medium">
                    {ACTION_LABELS[action]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => {
                const modulePerms = permissions[mod.code] || [];
                const allEnabled = mod.actions.every((a) => modulePerms.includes(a));
                return (
                  <tr key={mod.code} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{mod.name}</td>
                    <td className="text-center p-2">
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={allEnabled}
                        onChange={() => toggleAllForModule(mod.code, mod.actions)}
                      />
                    </td>
                    {Object.keys(ACTION_LABELS).map((action) => {
                      const isAvailable = mod.actions.includes(action);
                      const isChecked = modulePerms.includes(action);
                      return (
                        <td key={action} className="text-center p-2">
                          {isAvailable ? (
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(mod.code, action)}
                            />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasChanges && (
          <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            You have unsaved changes
          </div>
        )}
      </div>
    </div>
  );
}
