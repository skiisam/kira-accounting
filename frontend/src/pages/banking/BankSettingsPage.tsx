import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BuildingLibraryIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowUpIcon,
  LinkIcon,
  TrashIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { get, post, put, del } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import toast from 'react-hot-toast';

// ====================
// Types
// ====================

interface Bank {
  id: string;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  swiftCode?: string;
}

interface BankAccount {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  balance: number;
  linkedGLAccountId?: number;
  linkedGLAccountName?: string;
  lastSync?: string;
}

interface BankConnection {
  bankId: string;
  connected: boolean;
  businessRegNo?: string;
  connectedAt?: string;
  accounts: BankAccount[];
}

interface GLAccount {
  id: number;
  accountNo: string;
  name: string;
}

interface ImportPreviewRow {
  date: string;
  description: string;
  reference?: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

// ====================
// Malaysian Banks Configuration
// ====================

const MALAYSIAN_BANKS: Bank[] = [
  { id: 'maybank', name: 'Maybank', shortName: 'MBB', color: 'bg-yellow-400', textColor: 'text-yellow-900', swiftCode: 'MABORNYM' },
  { id: 'cimb', name: 'CIMB Bank', shortName: 'CIMB', color: 'bg-red-600', textColor: 'text-white', swiftCode: 'CIBBMYKL' },
  { id: 'publicbank', name: 'Public Bank', shortName: 'PBB', color: 'bg-pink-500', textColor: 'text-white', swiftCode: 'PABORNYM' },
  { id: 'rhb', name: 'RHB Bank', shortName: 'RHB', color: 'bg-blue-600', textColor: 'text-white', swiftCode: 'RHBBMYKL' },
  { id: 'hongleong', name: 'Hong Leong Bank', shortName: 'HLB', color: 'bg-blue-800', textColor: 'text-white', swiftCode: 'HLBBMYKL' },
  { id: 'ambank', name: 'AmBank', shortName: 'AMB', color: 'bg-red-700', textColor: 'text-white', swiftCode: 'ARBKMYKL' },
  { id: 'uob', name: 'UOB Malaysia', shortName: 'UOB', color: 'bg-blue-500', textColor: 'text-white', swiftCode: 'UOVBMYKL' },
  { id: 'ocbc', name: 'OCBC Bank', shortName: 'OCBC', color: 'bg-red-500', textColor: 'text-white', swiftCode: 'OCBCMYKL' },
  { id: 'hsbc', name: 'HSBC Malaysia', shortName: 'HSBC', color: 'bg-red-600', textColor: 'text-white', swiftCode: 'HSBCMYKX' },
  { id: 'standardchartered', name: 'Standard Chartered', shortName: 'SCB', color: 'bg-teal-600', textColor: 'text-white', swiftCode: 'SCBLMYKX' },
  { id: 'bankislam', name: 'Bank Islam', shortName: 'BIMB', color: 'bg-green-700', textColor: 'text-white', swiftCode: 'BIMBMYKL' },
  { id: 'bsn', name: 'BSN', shortName: 'BSN', color: 'bg-orange-500', textColor: 'text-white', swiftCode: 'BSNAMYKL' },
  { id: 'affin', name: 'Affin Bank', shortName: 'AFFIN', color: 'bg-indigo-700', textColor: 'text-white', swiftCode: 'PHBMMYKL' },
  { id: 'alliancebank', name: 'Alliance Bank', shortName: 'ABM', color: 'bg-purple-600', textColor: 'text-white', swiftCode: 'MFBBMYKL' },
  { id: 'agrobank', name: 'Agrobank', shortName: 'AGRO', color: 'bg-green-600', textColor: 'text-white', swiftCode: 'BPMBMYKL' },
];

const BANK_STATEMENT_FORMATS = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'maybank_csv', label: 'Maybank CSV' },
  { value: 'cimb_csv', label: 'CIMB CSV' },
  { value: 'publicbank_csv', label: 'Public Bank CSV' },
  { value: 'rhb_csv', label: 'RHB CSV' },
  { value: 'generic_ofx', label: 'OFX (Open Financial Exchange)' },
  { value: 'generic_qif', label: 'QIF (Quicken)' },
  { value: 'generic_csv', label: 'Generic CSV' },
];

// ====================
// Bank Logo Component
// ====================

function BankLogo({ bank, size = 'md' }: { bank: Bank; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${bank.color} ${bank.textColor} rounded-lg flex items-center justify-center font-bold shadow-lg`}
    >
      {bank.shortName}
    </div>
  );
}

// ====================
// Connection Status Badge
// ====================

function ConnectionStatus({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium">
      <CheckCircleIcon className="w-4 h-4" />
      Connected
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-sm font-medium">
      <XCircleIcon className="w-4 h-4" />
      Disconnected
    </span>
  );
}

// ====================
// Link Account Modal
// ====================

function LinkAccountModal({
  isOpen,
  onClose,
  bankAccount,
  glAccounts,
  onLink,
}: {
  isOpen: boolean;
  onClose: () => void;
  bankAccount: BankAccount | null;
  glAccounts: GLAccount[];
  onLink: (bankAccountId: number, glAccountId: number) => void;
}) {
  const [selectedGL, setSelectedGL] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return glAccounts;
    const term = searchTerm.toLowerCase();
    return glAccounts.filter(
      (acc) =>
        acc.accountNo.toLowerCase().includes(term) ||
        acc.name.toLowerCase().includes(term)
    );
  }, [glAccounts, searchTerm]);

  if (!isOpen || !bankAccount) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Link Bank Account to GL Account
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Map your bank account to a General Ledger account for automatic reconciliation.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">Bank Account</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {bankAccount.accountNumber} - {bankAccount.accountName}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search GL Account
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by account number or name..."
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select GL Account
            </label>
            <select
              value={selectedGL}
              onChange={(e) => setSelectedGL(e.target.value ? parseInt(e.target.value) : '')}
              className="input w-full"
            >
              <option value="">-- Select GL Account --</option>
              {filteredAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNo} - {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedGL) {
                onLink(bankAccount.id, selectedGL);
                onClose();
              }
            }}
            disabled={!selectedGL}
            className="btn btn-primary"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Link Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ====================
// Bank Tab Content
// ====================

function BankTabContent({
  bank,
  connection,
  glAccounts,
  onConnect,
  onDisconnect,
  onGetAccounts,
  onLinkAccount,
  onUnlinkAccount,
  isConnecting,
}: {
  bank: Bank;
  connection: BankConnection | undefined;
  glAccounts: GLAccount[];
  onConnect: (bankId: string, regNo: string) => void;
  onDisconnect: (bankId: string) => void;
  onGetAccounts: (bankId: string) => void;
  onLinkAccount: (bankAccountId: number, glAccountId: number) => void;
  onUnlinkAccount: (bankAccountId: number) => void;
  isConnecting: boolean;
}) {
  const [regNo, setRegNo] = useState(connection?.businessRegNo || '');
  const [linkModal, setLinkModal] = useState<{ open: boolean; account: BankAccount | null }>({
    open: false,
    account: null,
  });

  const isConnected = connection?.connected || false;

  const accountColumns = [
    { key: 'accountNumber', header: 'Bank Account', render: (row: BankAccount) => (
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{row.accountNumber}</div>
        <div className="text-xs text-gray-500">{row.accountType}</div>
      </div>
    )},
    { key: 'accountName', header: 'Account Name' },
    { key: 'currency', header: 'Currency', render: (row: BankAccount) => (
      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
        {row.currency}
      </span>
    )},
    { key: 'balance', header: 'Balance', render: (row: BankAccount) => (
      <span className={`font-medium ${row.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {row.currency} {row.balance?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
      </span>
    )},
    { key: 'linkedGLAccount', header: 'Linked GL Account', render: (row: BankAccount) => (
      row.linkedGLAccountName ? (
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-green-500" />
          <span className="text-sm">{row.linkedGLAccountName}</span>
        </div>
      ) : (
        <span className="text-gray-400 text-sm">Not linked</span>
      )
    )},
    { key: 'lastSync', header: 'Last Sync', render: (row: BankAccount) => (
      row.lastSync ? (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.lastSync).toLocaleString('en-MY')}
        </span>
      ) : (
        <span className="text-gray-400 text-sm">Never</span>
      )
    )},
    { key: 'actions', header: 'Actions', render: (row: BankAccount) => (
      <div className="flex gap-2">
        {row.linkedGLAccountId ? (
          <button
            onClick={() => onUnlinkAccount(row.id)}
            className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
          >
            <TrashIcon className="w-4 h-4" />
            Unlink
          </button>
        ) : (
          <button
            onClick={() => setLinkModal({ open: true, account: row })}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            <LinkIcon className="w-4 h-4" />
            Link
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      {/* Bank Header */}
      <div className="flex items-start gap-6">
        <BankLogo bank={bank} size="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{bank.name}</h2>
            <ConnectionStatus connected={isConnected} />
          </div>
          {bank.swiftCode && (
            <p className="text-sm text-gray-500 dark:text-gray-400">SWIFT Code: {bank.swiftCode}</p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
              <li>Enter your Business Registration Number (SSM)</li>
              <li>Click Connect to authorize access via {bank.name}'s secure portal</li>
              <li>Select accounts to link with your GL accounts</li>
              <li>Import transactions automatically or manually</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Connection Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bank Connection</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Registration Number (SSM)
            </label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              placeholder="e.g., 202301012345 (12 digits)"
              className="input w-full"
              disabled={isConnected}
            />
          </div>
          <div className="flex items-end gap-3">
            {isConnected ? (
              <>
                <button
                  onClick={() => onGetAccounts(bank.id)}
                  className="btn btn-secondary"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Get Account Details
                </button>
                <button
                  onClick={() => onDisconnect(bank.id)}
                  className="btn btn-danger"
                >
                  <XCircleIcon className="w-4 h-4 mr-2" />
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => onConnect(bank.id, regNo)}
                disabled={!regNo || isConnecting}
                className="btn btn-primary"
              >
                {isConnecting ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <BuildingLibraryIcon className="w-4 h-4 mr-2" />
                    Connect to {bank.shortName}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {isConnected && connection?.connectedAt && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Connected on {new Date(connection.connectedAt).toLocaleString('en-MY')}
          </p>
        )}
      </div>

      {/* Linked Accounts */}
      {isConnected && connection?.accounts && connection.accounts.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Linked Bank Accounts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Link your bank accounts to GL accounts for automatic reconciliation
            </p>
          </div>
          <DataTable
            columns={accountColumns}
            data={connection.accounts}
            loading={false}
          />
        </div>
      )}

      {isConnected && (!connection?.accounts || connection.accounts.length === 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <BuildingLibraryIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Accounts Retrieved</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Click "Get Account Details" to fetch your bank accounts
          </p>
          <button onClick={() => onGetAccounts(bank.id)} className="btn btn-primary">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Get Account Details
          </button>
        </div>
      )}

      {/* Link Account Modal */}
      <LinkAccountModal
        isOpen={linkModal.open}
        onClose={() => setLinkModal({ open: false, account: null })}
        bankAccount={linkModal.account}
        glAccounts={glAccounts}
        onLink={onLinkAccount}
      />
    </div>
  );
}

// ====================
// Manual Import Section
// ====================

function ManualImportSection() {
  const [selectedFormat, setSelectedFormat] = useState('auto');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadedFile(file);
    // Simulate parsing preview
    const mockPreview: ImportPreviewRow[] = [
      { date: '2024-02-26', description: 'Payment from Customer ABC', reference: 'TXN001', debit: 0, credit: 5000.00, balance: 45000.00 },
      { date: '2024-02-25', description: 'Utilities - TNB', reference: 'BILL-TNB', debit: 350.00, credit: 0, balance: 40000.00 },
      { date: '2024-02-24', description: 'Supplier Payment - XYZ Sdn Bhd', reference: 'PAY-0023', debit: 12500.00, credit: 0, balance: 40350.00 },
      { date: '2024-02-23', description: 'Sales Collection', reference: 'INV-2024-001', debit: 0, credit: 8750.00, balance: 52850.00 },
      { date: '2024-02-22', description: 'Bank Charges', reference: 'FEE', debit: 25.00, credit: 0, balance: 44100.00 },
    ];
    setPreviewData(mockPreview);
    toast.success(`File "${file.name}" loaded successfully`);
  };

  const handleImport = async () => {
    if (!uploadedFile) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', uploadedFile);
      form.append('format', selectedFormat);
      await fetch('/api/v1/banking/import', {
        method: 'POST',
        body: form,
        credentials: 'include',
      }).then(async (r) => {
        const j = await r.json();
        if (!r.ok || j.success === false) throw new Error(j?.error?.message || 'Import failed');
        return j;
      });
      toast.success(`Imported ${previewData.length} transactions successfully`);
      setUploadedFile(null);
      setPreviewData([]);
    } catch (e: any) {
      toast.error(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const previewColumns = [
    { key: 'date', header: 'Date' },
    { key: 'description', header: 'Description' },
    { key: 'reference', header: 'Reference' },
    { key: 'debit', header: 'Debit (DR)', render: (row: ImportPreviewRow) => (
      row.debit ? (
        <span className="text-red-600 font-medium">
          {row.debit.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
        </span>
      ) : '-'
    )},
    { key: 'credit', header: 'Credit (CR)', render: (row: ImportPreviewRow) => (
      row.credit ? (
        <span className="text-green-600 font-medium">
          {row.credit.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
        </span>
      ) : '-'
    )},
    { key: 'balance', header: 'Balance', render: (row: ImportPreviewRow) => (
      <span className="font-medium">
        {row.balance?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
      </span>
    )},
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
          <DocumentArrowUpIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Bank Statement</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload CSV or OFX files to import transactions manually
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Zone */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Statement Format
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="input w-full"
            >
              {BANK_STATEMENT_FORMATS.map((fmt) => (
                <option key={fmt.value} value={fmt.value}>
                  {fmt.label}
                </option>
              ))}
            </select>
          </div>

          <label className="block">
            <input
              type="file"
              accept=".csv,.ofx,.qif"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </label>

          {uploadedFile && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DocumentArrowUpIcon className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setUploadedFile(null);
                  setPreviewData([]);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preview</h3>
          {previewData.length > 0 ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <DataTable
                columns={previewColumns}
                data={previewData}
                loading={false}
              />
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <EyeIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Upload a file to preview transactions
              </p>
            </div>
          )}
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => {
              setUploadedFile(null);
              setPreviewData([]);
            }}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="btn btn-primary"
          >
            {importing ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                Import {previewData.length} Transactions
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ====================
// Main Component
// ====================

export default function BankSettingsPage() {
  const [activeTab, setActiveTab] = useState<string>(MALAYSIAN_BANKS[0].id);
  const [tabScrollPosition, setTabScrollPosition] = useState(0);
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch bank connections
  const { data: connectionsData } = useQuery({
    queryKey: ['bank-connections'],
    queryFn: () => get('/banking/connections'),
  });

  // Fetch GL accounts for linking
  const { data: glAccountsData } = useQuery({
    queryKey: ['gl-accounts-banking'],
    queryFn: () => get('/gl/accounts'),
  });

  // Parse data
  const connections: Record<string, BankConnection> = useMemo(() => {
    const data = (connectionsData as any)?.data || connectionsData || [];
    const map: Record<string, BankConnection> = {};
    if (Array.isArray(data)) {
      data.forEach((conn: BankConnection) => {
        map[conn.bankId] = conn;
      });
    }
    return map;
  }, [connectionsData]);

  const glAccounts: GLAccount[] = useMemo(() => {
    const data = (glAccountsData as any)?.data || glAccountsData || [];
    // Filter to only bank-type accounts (usually 3xx accounts)
    return Array.isArray(data)
      ? data.filter((acc: any) => acc.type?.category === 'ASSET')
      : [];
  }, [glAccountsData]);

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: ({ bankId, regNo }: { bankId: string; regNo: string }) =>
      post('/banking/connect', { bankId, businessRegNo: regNo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] });
      toast.success('Bank connected successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to connect to bank');
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (bankId: string) => del(`/banking/connections/${bankId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] });
      toast.success('Bank disconnected');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to disconnect');
    },
  });

  // Get accounts mutation
  const getAccountsMutation = useMutation({
    mutationFn: (bankId: string) => post(`/banking/connections/${bankId}/accounts`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] });
      toast.success('Account details retrieved');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to get account details');
    },
  });

  // Link account mutation
  const linkAccountMutation = useMutation({
    mutationFn: ({ bankAccountId, glAccountId }: { bankAccountId: number; glAccountId: number }) =>
      put(`/banking/accounts/${bankAccountId}/link`, { glAccountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] });
      toast.success('Account linked successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to link account');
    },
  });

  // Unlink account mutation
  const unlinkAccountMutation = useMutation({
    mutationFn: (bankAccountId: number) =>
      del(`/banking/accounts/${bankAccountId}/link`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] });
      toast.success('Account unlinked');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Failed to unlink account');
    },
  });

  // Tab scroll handlers
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      const newPosition =
        direction === 'left'
          ? Math.max(0, tabScrollPosition - scrollAmount)
          : tabScrollPosition + scrollAmount;
      tabsContainerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setTabScrollPosition(newPosition);
    }
  };

  const activeBank = MALAYSIAN_BANKS.find((b) => b.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
            <BuildingLibraryIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Connect your bank accounts and manage transactions
            </p>
          </div>
        </div>
        <button className="btn btn-secondary">
          <Cog6ToothIcon className="w-5 h-5 mr-2" />
          Settings
        </button>
      </div>

      {/* Bank Tabs */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
        <button
          onClick={() => scrollTabs('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        <div
          ref={tabsContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-10"
          onScroll={(e) => setTabScrollPosition((e.target as HTMLDivElement).scrollLeft)}
        >
          {MALAYSIAN_BANKS.map((bank) => {
            const isActive = activeTab === bank.id;
            const isConnected = connections[bank.id]?.connected;

            return (
              <button
                key={bank.id}
                onClick={() => setActiveTab(bank.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gray-100 dark:bg-slate-700 shadow-inner'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <BankLogo bank={bank} size="sm" />
                <div className="text-left">
                  <div className={`font-medium ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {bank.shortName}
                  </div>
                  {isConnected && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircleIcon className="w-3 h-3" />
                      Connected
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scrollTabs('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Active Bank Content */}
      {activeBank && (
        <BankTabContent
          bank={activeBank}
          connection={connections[activeBank.id]}
          glAccounts={glAccounts}
          onConnect={(bankId, regNo) => connectMutation.mutate({ bankId, regNo })}
          onDisconnect={(bankId) => disconnectMutation.mutate(bankId)}
          onGetAccounts={(bankId) => getAccountsMutation.mutate(bankId)}
          onLinkAccount={(bankAccountId, glAccountId) =>
            linkAccountMutation.mutate({ bankAccountId, glAccountId })
          }
          onUnlinkAccount={(bankAccountId) => unlinkAccountMutation.mutate(bankAccountId)}
          isConnecting={connectMutation.isPending}
        />
      )}

      {/* Manual Import Section */}
      <ManualImportSection />
    </div>
  );
}
