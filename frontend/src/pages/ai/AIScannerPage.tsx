import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  CameraIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ReceiptPercentIcon,
  TruckIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface ScanResult {
  type: 'invoice' | 'receipt' | 'purchase_order' | 'delivery_order';
  confidence: number;
  extractedData: {
    documentNo?: string;
    date?: string;
    vendorName?: string;
    customerName?: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
}

const documentTypes = [
  { id: 'invoice', name: 'Sales Invoice', icon: DocumentTextIcon, color: 'from-blue-500 to-indigo-600' },
  { id: 'receipt', name: 'Receipt/Bill', icon: ReceiptPercentIcon, color: 'from-emerald-500 to-teal-600' },
  { id: 'purchase_order', name: 'Purchase Order', icon: TruckIcon, color: 'from-orange-500 to-amber-600' },
  { id: 'delivery_order', name: 'Delivery Order', icon: DocumentDuplicateIcon, color: 'from-purple-500 to-pink-600' },
];

// Simulated AI scan results for demo
const mockScanResults: Record<string, ScanResult> = {
  invoice: {
    type: 'invoice',
    confidence: 0.94,
    extractedData: {
      documentNo: 'INV-2026-0234',
      date: '2026-02-10',
      customerName: 'ABC Trading Sdn Bhd',
      items: [
        { description: 'Widget A - Standard', quantity: 50, unitPrice: 25.00, amount: 1250.00 },
        { description: 'Widget B - Premium', quantity: 20, unitPrice: 35.00, amount: 700.00 },
        { description: 'Installation Service', quantity: 1, unitPrice: 200.00, amount: 200.00 },
      ],
      subtotal: 2150.00,
      tax: 129.00,
      total: 2279.00,
      currency: 'MYR',
    },
  },
  receipt: {
    type: 'receipt',
    confidence: 0.91,
    extractedData: {
      documentNo: 'RCP-8847291',
      date: '2026-02-11',
      vendorName: 'Office Supplies Mart',
      items: [
        { description: 'A4 Paper (5 reams)', quantity: 5, unitPrice: 18.90, amount: 94.50 },
        { description: 'Printer Ink Cartridge', quantity: 2, unitPrice: 89.00, amount: 178.00 },
        { description: 'Stapler Heavy Duty', quantity: 1, unitPrice: 45.00, amount: 45.00 },
      ],
      subtotal: 317.50,
      tax: 19.05,
      total: 336.55,
      currency: 'MYR',
    },
  },
  purchase_order: {
    type: 'purchase_order',
    confidence: 0.89,
    extractedData: {
      documentNo: 'PO-2026-0089',
      date: '2026-02-09',
      vendorName: 'Premier Supplies Sdn Bhd',
      items: [
        { description: 'Raw Material A', quantity: 500, unitPrice: 5.00, amount: 2500.00 },
        { description: 'Raw Material B', quantity: 300, unitPrice: 7.00, amount: 2100.00 },
      ],
      subtotal: 4600.00,
      tax: 276.00,
      total: 4876.00,
      currency: 'MYR',
    },
  },
  delivery_order: {
    type: 'delivery_order',
    confidence: 0.87,
    extractedData: {
      documentNo: 'DO-2026-0156',
      date: '2026-02-08',
      customerName: 'XYZ Enterprise',
      items: [
        { description: 'Gadget Pro X', quantity: 10, unitPrice: 150.00, amount: 1500.00 },
        { description: 'Widget A - Standard', quantity: 25, unitPrice: 25.00, amount: 625.00 },
      ],
      subtotal: 2125.00,
      tax: 0,
      total: 2125.00,
      currency: 'MYR',
    },
  },
};

export default function AIScannerPage() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setScanResult(null);
    setScanning(true);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Return mock result based on random selection
    const types = Object.keys(mockScanResults);
    const randomType = types[Math.floor(Math.random() * types.length)];
    setScanResult(mockScanResults[randomType]);
    setScanning(false);
    toast.success('Document scanned successfully!');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleCreateDocument = () => {
    if (!scanResult) return;
    
    const typeRoutes: Record<string, string> = {
      invoice: '/sales/new/invoice',
      receipt: '/purchases/new/invoice',
      purchase_order: '/purchases/new/order',
      delivery_order: '/sales/new/do',
    };
    
    toast.success('Redirecting to create document...');
    navigate(typeRoutes[scanResult.type] || '/dashboard');
  };

  const formatCurrency = (amount: number, currency: string = 'MYR') => {
    return new Intl.NumberFormat('en-MY', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
              <SparklesIcon className="w-6 h-6" />
            </span>
            AI Document Scanner
          </h1>
          <p className="page-subtitle">Upload invoices, receipts, or purchase orders to extract data automatically</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CloudArrowUpIcon className="w-5 h-5 text-blue-500" />
              Upload Document
            </h2>
          </div>
          <div className="card-body">
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-slate-600 hover:border-primary-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Uploaded document"
                    className="max-h-64 mx-auto rounded-lg shadow-lg"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {uploadedFile?.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30">
                    <CameraIcon className="w-10 h-10 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                      Drag & drop your document here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      or click to browse files
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports: JPG, PNG, PDF (max 10MB)
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {scanning && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <div className="flex items-center gap-3">
                  <ArrowPathIcon className="w-6 h-6 text-violet-600 animate-spin" />
                  <div>
                    <p className="font-medium text-violet-800 dark:text-violet-300">AI is analyzing your document...</p>
                    <p className="text-sm text-violet-600 dark:text-violet-400">Extracting text, numbers, and line items</p>
                  </div>
                </div>
              </div>
            )}

            {/* Supported document types */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Supported document types:</p>
              <div className="grid grid-cols-2 gap-3">
                {documentTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
                  >
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${type.color} text-white`}>
                      <type.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scan Results */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-emerald-500" />
              Extracted Data
            </h2>
          </div>
          <div className="card-body">
            {scanResult ? (
              <div className="space-y-6">
                {/* Confidence Score */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">
                      {documentTypes.find(t => t.id === scanResult.type)?.name || 'Document'} Detected
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-600">
                    {(scanResult.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>

                {/* Document Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Document No.</label>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {scanResult.extractedData.documentNo}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Date</label>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {scanResult.extractedData.date}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">
                      {scanResult.extractedData.vendorName ? 'Vendor' : 'Customer'}
                    </label>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {scanResult.extractedData.vendorName || scanResult.extractedData.customerName}
                    </p>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Line Items</label>
                  <div className="space-y-2">
                    {scanResult.extractedData.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 text-sm"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.description}</p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} × {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(scanResult.extractedData.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(scanResult.extractedData.tax)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-emerald-600">
                      {formatCurrency(scanResult.extractedData.total)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateDocument}
                    className="btn btn-primary flex-1"
                  >
                    <BanknotesIcon className="w-5 h-5" />
                    Create Document
                  </button>
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setUploadedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Scan Another
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-slate-700 mb-4">
                  <SparklesIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  Upload a document to see AI-extracted data
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
