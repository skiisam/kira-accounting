import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import toast from 'react-hot-toast';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface TransferLine {
  id: number;
  lineNo: number;
  productCode: string;
  description: string;
  quantity: number;
  outstandingQty: number;
  transferQty: number;
}

interface TransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentId: number;
  documentType: 'quotation' | 'order' | 'do';
  targetType: string;
  targetLabel: string;
  endpoint: string;
}

export default function TransferDialog({
  isOpen,
  onClose,
  onSuccess,
  documentId,
  documentType,
  targetType,
  targetLabel,
  endpoint,
}: TransferDialogProps) {
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [transferAll, setTransferAll] = useState(true);

  // Fetch transferable lines
  const { data: transferableLines, isLoading } = useQuery({
    queryKey: ['transferable-lines', documentType, documentId],
    queryFn: () => get<any[]>(`/sales/${endpoint}/${documentId}/transferable-lines`),
    enabled: isOpen,
  });

  useEffect(() => {
    if (transferableLines) {
      setLines(
        transferableLines.map((l: any) => ({
          id: l.id,
          lineNo: l.lineNo,
          productCode: l.productCode || '',
          description: l.description || '',
          quantity: Number(l.quantity),
          outstandingQty: Number(l.outstandingQty),
          transferQty: Number(l.outstandingQty), // Default to full transfer
        }))
      );
    }
  }, [transferableLines]);

  const transferMutation = useMutation({
    mutationFn: () => {
      const lineTransfers = transferAll
        ? undefined // Transfer all outstanding
        : lines
            .filter(l => l.transferQty > 0)
            .map(l => ({ lineId: l.id, transferQty: l.transferQty }));
      
      return post(`/sales/${endpoint}/${documentId}/transfer`, {
        targetType,
        lineTransfers,
      });
    },
    onSuccess: () => {
      toast.success(`Successfully transferred to ${targetLabel}`);
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Transfer failed');
    },
  });

  const updateTransferQty = (index: number, qty: number) => {
    const newLines = [...lines];
    newLines[index].transferQty = Math.min(qty, newLines[index].outstandingQty);
    setLines(newLines);
  };

  const totalTransferQty = lines.reduce((sum, l) => sum + l.transferQty, 0);
  const hasLinesToTransfer = lines.some(l => l.transferQty > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Transfer to {targetLabel}</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : lines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No items available to transfer</div>
          ) : (
            <>
              {/* Transfer Mode Toggle */}
              <div className="mb-4 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-gray-900 font-medium">
                  <input
                    type="radio"
                    checked={transferAll}
                    onChange={() => setTransferAll(true)}
                    className="form-radio accent-primary-600"
                  />
                  <span>Transfer All Outstanding</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-900 font-medium">
                  <input
                    type="radio"
                    checked={!transferAll}
                    onChange={() => setTransferAll(false)}
                    className="form-radio accent-primary-600"
                  />
                  <span>Partial Transfer</span>
                </label>
              </div>

              {/* Lines Table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-100 text-gray-700">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Code</th>
                    <th className="text-left py-2 px-2">Description</th>
                    <th className="text-right py-2 px-2">Original Qty</th>
                    <th className="text-right py-2 px-2">Outstanding</th>
                    {!transferAll && <th className="text-right py-2 px-2 w-32">Transfer Qty</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-800">{line.lineNo}</td>
                      <td className="py-2 px-2 font-mono text-gray-900">{line.productCode}</td>
                      <td className="py-2 px-2 text-gray-800">{line.description}</td>
                      <td className="py-2 px-2 text-right text-gray-900">{line.quantity.toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-semibold text-primary-700">{line.outstandingQty.toFixed(2)}</td>
                      {!transferAll && (
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            max={line.outstandingQty}
                            step="0.01"
                            value={line.transferQty}
                            onChange={(e) => updateTransferQty(index, parseFloat(e.target.value) || 0)}
                            className="input py-1 text-sm text-right w-full"
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {!transferAll && (
                  <tfoot>
                    <tr className="font-semibold text-gray-900">
                      <td colSpan={5} className="py-2 px-2 text-right">Total to Transfer:</td>
                      <td className="py-2 px-2 text-right">{totalTransferQty.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-100">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => transferMutation.mutate()}
            disabled={transferMutation.isPending || (!transferAll && !hasLinesToTransfer)}
            className="btn btn-primary"
          >
            <ArrowRightIcon className="w-4 h-4 mr-2" />
            {transferMutation.isPending ? 'Transferring...' : `Transfer to ${targetLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
