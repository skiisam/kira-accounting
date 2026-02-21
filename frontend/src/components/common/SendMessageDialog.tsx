import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { get, post } from '../../services/api';
import toast from 'react-hot-toast';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface SendMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'INVOICE' | 'STATEMENT' | 'RECEIPT' | 'PAYMENT_REMINDER';
  documentId?: number;
  documentNo?: string;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  amount?: string;
  dueDate?: string;
  onSuccess?: () => void;
}

const platformOptions = [
  { value: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
  { value: 'TELEGRAM', label: 'Telegram', icon: '✈️' },
];

const documentTypeLabels: Record<string, string> = {
  INVOICE: 'Invoice',
  STATEMENT: 'Customer Statement',
  RECEIPT: 'Payment Receipt',
  PAYMENT_REMINDER: 'Payment Reminder',
};

export default function SendMessageDialog({
  isOpen,
  onClose,
  documentType,
  documentId,
  documentNo,
  customerId,
  customerName,
  customerPhone,
  amount,
  dueDate,
  onSuccess,
}: SendMessageDialogProps) {
  const [platform, setPlatform] = useState<'WHATSAPP' | 'TELEGRAM'>('WHATSAPP');
  const [phone, setPhone] = useState(customerPhone || '');
  const [customMessage, setCustomMessage] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);

  // Fetch templates for this document type
  const { data: templates } = useQuery({
    queryKey: ['message-templates', documentType],
    queryFn: () => get<any[]>(`/messaging/templates?category=${documentType}`),
    enabled: isOpen,
  });

  // Get endpoint based on document type
  const getEndpoint = () => {
    switch (documentType) {
      case 'INVOICE':
        return '/messaging/send-invoice';
      case 'STATEMENT':
        return '/messaging/send-statement';
      case 'RECEIPT':
        return '/messaging/send-receipt';
      case 'PAYMENT_REMINDER':
        return '/messaging/send-reminder';
      default:
        return '/messaging/send';
    }
  };

  const sendMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        platform,
        recipientPhone: phone,
        customerId,
        customerName,
        amount,
        dueDate,
      };

      if (documentType === 'INVOICE' || documentType === 'PAYMENT_REMINDER') {
        payload.invoiceId = documentId;
        payload.invoiceNo = documentNo;
        payload.outstandingAmount = amount;
      } else if (documentType === 'RECEIPT') {
        payload.paymentId = documentId;
        payload.receiptNo = documentNo;
        payload.paymentAmount = amount;
      } else if (documentType === 'STATEMENT') {
        payload.totalOutstanding = amount;
      }

      if (!useTemplate && customMessage) {
        payload.customMessage = customMessage;
      }

      return post(getEndpoint(), payload);
    },
    onSuccess: () => {
      toast.success(`Message sent via ${platform}`);
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to send message');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-md">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Send {documentTypeLabels[documentType]}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="card-body space-y-4">
          {/* Document Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              {documentNo && (
                <div>
                  <span className="text-gray-500">Document:</span>{' '}
                  <span className="font-medium">{documentNo}</span>
                </div>
              )}
              {customerName && (
                <div>
                  <span className="text-gray-500">Customer:</span>{' '}
                  <span className="font-medium">{customerName}</span>
                </div>
              )}
              {amount && (
                <div>
                  <span className="text-gray-500">Amount:</span>{' '}
                  <span className="font-medium">{amount}</span>
                </div>
              )}
              {dueDate && (
                <div>
                  <span className="text-gray-500">Due:</span>{' '}
                  <span className="font-medium">{dueDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <label className="label">Send via</label>
            <div className="flex gap-2">
              {platformOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlatform(opt.value as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                    platform === opt.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="label">
              {platform === 'WHATSAPP' ? 'WhatsApp Number' : 'Telegram Chat ID'}
            </label>
            <input
              type="text"
              className="input"
              placeholder={platform === 'WHATSAPP' ? '+60123456789' : 'Chat ID or phone'}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {platform === 'WHATSAPP' && (
              <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +60 for Malaysia)</p>
            )}
          </div>

          {/* Message Options */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(e) => setUseTemplate(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">Use default template</span>
            </label>
          </div>

          {!useTemplate && (
            <div>
              <label className="label">Custom Message</label>
              <textarea
                className="input min-h-[100px]"
                placeholder="Enter your custom message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {'{'}customerName{'}'}, {'{'}documentNo{'}'}, {'{'}amount{'}'}, {'{'}dueDate{'}'}
              </p>
            </div>
          )}

          {/* Template Preview */}
          {useTemplate && templates && templates.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Template Preview:</p>
              <p className="text-sm text-blue-800">
                {templates[0]?.body
                  ?.replace('{{customerName}}', customerName || 'Customer')
                  ?.replace('{{documentNo}}', documentNo || 'DOC-001')
                  ?.replace('{{amount}}', amount || '0.00')
                  ?.replace('{{dueDate}}', dueDate || 'N/A')
                  ?.substring(0, 150)}
                ...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || !phone}
              className="btn btn-primary"
            >
              {sendMutation.isPending ? (
                'Sending...'
              ) : (
                <>
                  <PaperAirplaneIcon className="w-4 h-4 mr-1" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick action buttons to be used inline
export function SendMessageButtons({
  documentType,
  documentId,
  documentNo,
  customerId,
  customerName,
  customerPhone,
  amount,
  dueDate,
  className = '',
}: Omit<SendMessageDialogProps, 'isOpen' | 'onClose'> & { className?: string }) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div className={`flex gap-1 ${className}`}>
        <button
          onClick={() => setShowDialog(true)}
          className="btn btn-secondary btn-sm text-xs"
          title="Send via WhatsApp"
        >
          💬 WhatsApp
        </button>
        <button
          onClick={() => setShowDialog(true)}
          className="btn btn-secondary btn-sm text-xs"
          title="Send via Telegram"
        >
          ✈️ Telegram
        </button>
      </div>

      <SendMessageDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        documentType={documentType}
        documentId={documentId}
        documentNo={documentNo}
        customerId={customerId}
        customerName={customerName}
        customerPhone={customerPhone}
        amount={amount}
        dueDate={dueDate}
      />
    </>
  );
}
