import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { get } from '../../services/api';
import { format } from 'date-fns';
import { MagnifyingGlassIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface TransferFromDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (document: any) => void;
  documentType: 'sales' | 'purchases';
  targetType: string; // The document type we're creating (e.g., 'invoice', 'grn')
}

// Map target type to source types that can be transferred from
const salesTransferSources: Record<string, { label: string; type: string; endpoint: string }[]> = {
  order: [
    { label: 'Quotation', type: 'quotation', endpoint: '/sales/quotations' },
  ],
  do: [
    { label: 'Sales Order', type: 'order', endpoint: '/sales/orders' },
    { label: 'Quotation', type: 'quotation', endpoint: '/sales/quotations' },
  ],
  invoice: [
    { label: 'Delivery Order', type: 'do', endpoint: '/sales/delivery-orders' },
    { label: 'Sales Order', type: 'order', endpoint: '/sales/orders' },
    { label: 'Quotation', type: 'quotation', endpoint: '/sales/quotations' },
  ],
};

const purchaseTransferSources: Record<string, { label: string; type: string; endpoint: string }[]> = {
  grn: [
    { label: 'Purchase Order', type: 'order', endpoint: '/purchases/orders' },
  ],
  invoice: [
    { label: 'GRN', type: 'grn', endpoint: '/purchases/grn' },
    { label: 'Purchase Order', type: 'order', endpoint: '/purchases/orders' },
  ],
};

export default function TransferFromDialog({ isOpen, onClose, onSelect, documentType, targetType }: TransferFromDialogProps) {
  const [selectedSourceType, setSelectedSourceType] = useState<string>('');
  const [search, setSearch] = useState('');
  
  const sources = documentType === 'sales' 
    ? salesTransferSources[targetType] || []
    : purchaseTransferSources[targetType] || [];

  useEffect(() => {
    if (isOpen && sources.length > 0 && !selectedSourceType) {
      setSelectedSourceType(sources[0].type);
    }
  }, [isOpen, sources, selectedSourceType]);

  const selectedSource = sources.find(s => s.type === selectedSourceType);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['transfer-from', documentType, selectedSourceType, search],
    queryFn: async () => {
      if (!selectedSource) return [];
      const result = await get<any>(selectedSource.endpoint, { 
        status: 'OPEN',
        transferStatus: 'NONE,PARTIAL',
        search,
        pageSize: 50 
      });
      // Handle paginated or direct array response
      return Array.isArray(result) ? result : result.data || [];
    },
    enabled: isOpen && !!selectedSource,
  });

  const formatCurrency = (val: number, currency: string = 'MYR') =>
    new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(val);

  const handleSelect = async (doc: any) => {
    // Fetch full document with details
    const fullDoc = await get<any>(`${selectedSource?.endpoint}/${doc.id}`);
    onSelect({
      ...fullDoc,
      sourceType: selectedSourceType,
      sourceEndpoint: selectedSource?.endpoint,
    });
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Transfer From Existing Document
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Source Type Tabs */}
                <div className="flex gap-2 mb-4">
                  {sources.map((source) => (
                    <button
                      key={source.type}
                      onClick={() => setSelectedSourceType(source.type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedSourceType === source.type
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {source.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by document number or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input pl-10 w-full"
                  />
                </div>

                {/* Document List */}
                <div className="max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading...</div>
                  ) : !documents || documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No open documents found</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-slate-700 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Doc No</th>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                          <th className="text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {documentType === 'sales' ? 'Customer' : 'Vendor'}
                          </th>
                          <th className="text-right px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Total</th>
                          <th className="text-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                        {documents.map((doc: any) => (
                          <tr
                            key={doc.id}
                            onClick={() => handleSelect(doc)}
                            className="hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              {doc.documentNo}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(doc.documentDate), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                              {doc.customerCode || doc.vendorCode} - {doc.customerName || doc.vendorName}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-mono text-gray-900 dark:text-white">
                              {formatCurrency(doc.netTotal, doc.currencyCode)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`badge ${
                                doc.transferStatus === 'PARTIAL' ? 'badge-warning' : 'badge-info'
                              }`}>
                                {doc.transferStatus === 'PARTIAL' ? 'Partial' : 'Open'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex justify-end mt-4 pt-4 border-t dark:border-slate-600">
                  <button onClick={onClose} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
