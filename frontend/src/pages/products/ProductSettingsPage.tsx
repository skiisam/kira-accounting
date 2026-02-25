import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { get, post, put, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';
import {
  CubeIcon,
  ArrowLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface SettingsConfig {
  endpoint: string;
  title: string;
  columns: { key: string; header: string }[];
}

const settingsConfig: Record<string, SettingsConfig> = {
  groups: {
    endpoint: 'product-groups',
    title: 'Product Groups',
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Name' },
    ],
  },
  types: {
    endpoint: 'product-types',
    title: 'Product Types',
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Name' },
    ],
  },
  uom: {
    endpoint: 'uom',
    title: 'Units of Measure',
    columns: [
      { key: 'code', header: 'Code' },
      { key: 'name', header: 'Name' },
    ],
  },
};

export default function ProductSettingsPage() {
  const location = useLocation();
  // Extract type from path: /products/groups -> groups
  const type = location.pathname.split('/').pop();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const config = settingsConfig[type || 'groups'];
  
  if (!config) {
    return <div>Invalid settings type</div>;
  }

  const { data, isLoading } = useQuery({
    queryKey: [config.endpoint],
    queryFn: () => get(`/settings/${config.endpoint}`),
  });

  const items = Array.isArray(data) ? data : [];

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingItem?.id) {
        return put(`/settings/${config.endpoint}/${editingItem.id}`, data);
      } else {
        return post(`/settings/${config.endpoint}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      toast.success(editingItem ? 'Updated successfully' : 'Created successfully');
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => del(`/settings/${config.endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.endpoint] });
      toast.success('Deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete');
    }
  });

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };

  const displayColumns = [
    ...config.columns,
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <button 
            onClick={() => handleEdit(row)} 
            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.id)} 
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/products"
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-500 text-white">
                <CubeIcon className="w-6 h-6" />
              </span>
              {config.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage {config.title.toLowerCase()}
            </p>
          </div>
        </div>
        <button onClick={handleAdd} className="btn btn-primary">
          <PlusIcon className="w-5 h-5" />
          Add New
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable columns={displayColumns} data={items} loading={isLoading} />
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editingItem ? 'Edit' : 'Add New'} {config.title.replace(/s$/, '')}
            </h3>
            <div className="space-y-4">
              {config.columns.map(col => (
                <div key={col.key}>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {col.header}
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData[col.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
                    placeholder={`Enter ${col.header.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                disabled={saveMutation.isPending} 
                className="btn btn-primary"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
