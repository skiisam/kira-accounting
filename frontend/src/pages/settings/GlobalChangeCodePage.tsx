import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  ArrowPathIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  CalculatorIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { post } from '../../services/api';
import toast from 'react-hot-toast';

type EntityType = 'customer' | 'vendor' | 'product' | 'account';

interface ChangeResult {
  success: boolean;
  message: string;
  updatedRecords?: number;
}

export default function GlobalChangeCodePage() {
  const [entityType, setEntityType] = useState<EntityType>('customer');
  const [oldCode, setOldCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [result, setResult] = useState<ChangeResult | null>(null);

  const changeMutation = useMutation({
    mutationFn: ({ type, oldCode, newCode }: { type: EntityType; oldCode: string; newCode: string }) =>
      post<ChangeResult>(`/settings/change-code/${type}`, { oldCode, newCode }),
    onSuccess: (data) => {
      setResult({ success: true, message: data.message || 'Code changed successfully', updatedRecords: data.updatedRecords });
      toast.success('Code changed successfully!');
      setOldCode('');
      setNewCode('');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to change code';
      setResult({ success: false, message });
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldCode.trim() || !newCode.trim()) {
      toast.error('Please enter both old and new codes');
      return;
    }
    if (oldCode === newCode) {
      toast.error('New code must be different from old code');
      return;
    }
    setResult(null);
    changeMutation.mutate({ type: entityType, oldCode: oldCode.trim(), newCode: newCode.trim() });
  };

  const entityOptions = [
    { value: 'customer', label: 'Customer', icon: UsersIcon, color: 'blue' },
    { value: 'vendor', label: 'Vendor', icon: BuildingStorefrontIcon, color: 'amber' },
    { value: 'product', label: 'Product', icon: CubeIcon, color: 'purple' },
    { value: 'account', label: 'Account', icon: CalculatorIcon, color: 'emerald' },
  ];

  const selectedEntity = entityOptions.find(e => e.value === entityType)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <span className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
            <ArrowPathIcon className="w-6 h-6" />
          </span>
          Global Change Code
        </h1>
        <p className="page-subtitle">
          Change entity codes across all transactions and records
        </p>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Important Notice</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              This function will update the code in the master record AND all related transactions 
              (invoices, payments, orders, etc.). This action cannot be undone. Please ensure you 
              have a backup before proceeding.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Change Code</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Entity Type Selection */}
          <div>
            <label className="label">Select Entity Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {entityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setEntityType(option.value as EntityType); setResult(null); }}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    entityType === option.value
                      ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <option.icon className={`w-8 h-8 ${
                    entityType === option.value ? `text-${option.color}-600` : 'text-gray-400'
                  }`} />
                  <span className={`font-medium ${
                    entityType === option.value ? `text-${option.color}-700 dark:text-${option.color}-300` : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Inputs */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="oldCode" className="label">
                Current {selectedEntity.label} Code
              </label>
              <input
                id="oldCode"
                type="text"
                value={oldCode}
                onChange={(e) => setOldCode(e.target.value.toUpperCase())}
                placeholder={`Enter current ${entityType} code`}
                className="input mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The existing code you want to change
              </p>
            </div>
            <div>
              <label htmlFor="newCode" className="label">
                New {selectedEntity.label} Code
              </label>
              <input
                id="newCode"
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder={`Enter new ${entityType} code`}
                className="input mt-1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The new code to replace with
              </p>
            </div>
          </div>

          {/* Result Message */}
          {result && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${
              result.success 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {result.success ? (
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className={result.success ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}>
                  {result.message}
                </p>
                {result.updatedRecords !== undefined && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                    Updated {result.updatedRecords} transaction records
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changeMutation.isPending || !oldCode || !newCode}
              className="btn btn-primary"
            >
              {changeMutation.isPending ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-5 h-5" />
                  Change Code
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Instructions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">How it works</h2>
        </div>
        <div className="p-6">
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
            <li>Select the type of entity (Customer, Vendor, Product, or Account)</li>
            <li>Enter the current code that you want to change</li>
            <li>Enter the new code you want to use</li>
            <li>Click "Change Code" to update</li>
          </ol>
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">What gets updated:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li><strong>Customer:</strong> Customer master + all invoices, quotations, orders, receipts</li>
              <li><strong>Vendor:</strong> Vendor master + all purchase orders, GRNs, invoices, payments</li>
              <li><strong>Product:</strong> Product master + all sales/purchase document lines</li>
              <li><strong>Account:</strong> Account master + all journal entries, GL transactions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
