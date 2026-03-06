import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts (keep eager - needed immediately)
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Lazy load all page components
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const SetupWizardPage = lazy(() => import('./pages/setup/SetupWizardPage'));
const CompanySelectPage = lazy(() => import('./pages/setup/CompanySelectPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CustomerListPage = lazy(() => import('./pages/customers/CustomerListPage'));
const CustomerFormPage = lazy(() => import('./pages/customers/CustomerFormPage'));
const VendorListPage = lazy(() => import('./pages/vendors/VendorListPage'));
const VendorFormPage = lazy(() => import('./pages/vendors/VendorFormPage'));
const ProductListPage = lazy(() => import('./pages/products/ProductListPage'));
const ProductFormPage = lazy(() => import('./pages/products/ProductFormPage'));
const ProductSettingsPage = lazy(() => import('./pages/products/ProductSettingsPage'));
const SalesListPage = lazy(() => import('./pages/sales/SalesListPage'));
const SalesFormPage = lazy(() => import('./pages/sales/SalesFormPage'));
const PurchaseListPage = lazy(() => import('./pages/purchases/PurchaseListPage'));
const PurchaseFormPage = lazy(() => import('./pages/purchases/PurchaseFormPage'));
const ARInvoiceListPage = lazy(() => import('./pages/ar/ARInvoiceListPage'));
const ARInvoiceFormPage = lazy(() => import('./pages/ar/ARInvoiceFormPage'));
const BankSettingsPage = lazy(() => import('./pages/banking/BankSettingsPage'));
const BankReconciliationPage = lazy(() => import('./pages/banking/BankReconciliationPage'));
const ARPaymentFormPage = lazy(() => import('./pages/ar/ARPaymentFormPage'));
const APInvoiceListPage = lazy(() => import('./pages/ap/APInvoiceListPage'));
const APInvoiceFormPage = lazy(() => import('./pages/ap/APInvoiceFormPage'));
const APPaymentFormPage = lazy(() => import('./pages/ap/APPaymentFormPage'));
const AccountListPage = lazy(() => import('./pages/accounts/AccountListPage'));
const JournalListPage = lazy(() => import('./pages/journals/JournalListPage'));
const StockBalancePage = lazy(() => import('./pages/stock/StockBalancePage'));
const StockAdjustmentListPage = lazy(() => import('./pages/stock/StockAdjustmentListPage'));
const StockAdjustmentFormPage = lazy(() => import('./pages/stock/StockAdjustmentFormPage'));
const StockTransferListPage = lazy(() => import('./pages/stock/StockTransferListPage'));
const StockTransferFormPage = lazy(() => import('./pages/stock/StockTransferFormPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const ProfitAndLossPage = lazy(() => import('./pages/reports/ProfitAndLossPage'));
const StockCardPage = lazy(() => import('./pages/reports/StockCardPage'));
const DebtorStatementPage = lazy(() => import('./pages/reports/DebtorStatementPage'));
const CreditorStatementPage = lazy(() => import('./pages/reports/CreditorStatementPage'));
const AuditTrailPage = lazy(() => import('./pages/tools/AuditTrailPage'));
const BalanceSheetPage = lazy(() => import('./pages/reports/BalanceSheetPage'));
const TrialBalancePage = lazy(() => import('./pages/reports/TrialBalancePage'));
const LedgerPage = lazy(() => import('./pages/reports/LedgerPage'));
const JournalTransactionPage = lazy(() => import('./pages/reports/JournalTransactionPage'));
const DebtorAgingPage = lazy(() => import('./pages/reports/DebtorAgingPage'));
const CreditorAgingPage = lazy(() => import('./pages/reports/CreditorAgingPage'));
const CashBookEntryPage = lazy(() => import('./pages/accounting/CashBookEntryPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const AIScannerPage = lazy(() => import('./pages/ai/AIScannerPage'));
const AIReportsPage = lazy(() => import('./pages/ai/AIReportsPage'));
const SocialSettingsPage = lazy(() => import('./pages/social/SocialSettingsPage'));
const SocialInboxPage = lazy(() => import('./pages/social/SocialInboxPage'));
const MessagingInboxPage = lazy(() => import('./pages/messaging/MessagingInboxPage'));
const BatchSOASendPage = lazy(() => import('./pages/messaging/BatchSOASendPage'));
const BatchPaymentNotifyPage = lazy(() => import('./pages/messaging/BatchPaymentNotifyPage'));
const BatchInvoiceSendPage = lazy(() => import('./pages/messaging/BatchInvoiceSendPage'));
const LeadKanbanPage = lazy(() => import('./pages/crm/LeadKanbanPage'));
const EInvoiceDashboardPage = lazy(() => import('./pages/einvoice/EInvoiceDashboardPage'));
const EInvoiceListPage = lazy(() => import('./pages/einvoice/EInvoiceListPage'));
const ReportDesignEditorPage = lazy(() => import('./pages/tools/ReportDesignEditorPage'));
const ReportDesignerPage = lazy(() => import('./pages/tools/ReportDesignerPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        <Route
          path="/company/select"
          element={<PrivateRoute><CompanySelectPage /></PrivateRoute>}
        />

        <Route
          path="/setup"
          element={<PrivateRoute><SetupWizardPage /></PrivateRoute>}
        />

        {/* Main App Routes */}
        <Route
          element={<PrivateRoute><MainLayout /></PrivateRoute>}
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id" element={<CustomerFormPage />} />

          <Route path="/vendors" element={<VendorListPage />} />
          <Route path="/vendors/new" element={<VendorFormPage />} />
          <Route path="/vendors/:id" element={<VendorFormPage />} />

          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/groups" element={<ProductSettingsPage />} />
          <Route path="/products/types" element={<ProductSettingsPage />} />
          <Route path="/products/uom" element={<ProductSettingsPage />} />
          <Route path="/products/:id" element={<ProductFormPage />} />

          <Route path="/sales/quotations" element={<SalesListPage type="quotation" />} />
          <Route path="/sales/orders" element={<SalesListPage type="order" />} />
          <Route path="/sales/delivery-orders" element={<SalesListPage type="do" />} />
          <Route path="/sales/invoices" element={<SalesListPage type="invoice" />} />
          <Route path="/sales/cash-sales" element={<SalesListPage type="cash" />} />
          <Route path="/sales/credit-notes" element={<SalesListPage type="cn" />} />
          <Route path="/sales/debit-notes" element={<SalesListPage type="dn" />} />
          <Route path="/sales/new/:type" element={<SalesFormPage />} />
          <Route path="/sales/:type/:id" element={<SalesFormPage />} />

          <Route path="/purchases/requests" element={<PurchaseListPage type="request" />} />
          <Route path="/purchases/orders" element={<PurchaseListPage type="order" />} />
          <Route path="/purchases/grn" element={<PurchaseListPage type="grn" />} />
          <Route path="/purchases/invoices" element={<PurchaseListPage type="invoice" />} />
          <Route path="/purchases/credit-notes" element={<PurchaseListPage type="cn" />} />
          <Route path="/purchases/debit-notes" element={<PurchaseListPage type="dn" />} />
          <Route path="/purchases/new/:type" element={<PurchaseFormPage />} />
          <Route path="/purchases/:type/:id" element={<PurchaseFormPage />} />

          <Route path="/bank/settings" element={<BankSettingsPage />} />
          <Route path="/bank/reconciliation" element={<BankReconciliationPage />} />

          <Route path="/ar/invoices" element={<ARInvoiceListPage />} />
          <Route path="/ar/invoices/:id" element={<ARInvoiceFormPage />} />
          <Route path="/ar/payments" element={<ARInvoiceListPage type="payment" />} />
          <Route path="/ar/payments/new" element={<ARPaymentFormPage />} />
          <Route path="/ar/payments/:id" element={<ARPaymentFormPage />} />

          <Route path="/ap/invoices" element={<APInvoiceListPage />} />
          <Route path="/ap/invoices/:id" element={<APInvoiceFormPage />} />
          <Route path="/ap/payments" element={<APInvoiceListPage type="payment" />} />
          <Route path="/ap/payments/new" element={<APPaymentFormPage />} />
          <Route path="/ap/payments/:id" element={<APPaymentFormPage />} />

          <Route path="/gl/accounts" element={<AccountListPage />} />
          <Route path="/accounting/chart-of-accounts" element={<AccountListPage />} />
          <Route path="/gl/journals" element={<JournalListPage />} />
          <Route path="/accounting/cashbook" element={<CashBookEntryPage />} />

          <Route path="/stock/balance" element={<StockBalancePage />} />
          <Route path="/stock/adjustment" element={<StockAdjustmentListPage />} />
          <Route path="/stock/adjustment/new" element={<StockAdjustmentFormPage />} />
          <Route path="/stock/adjustment/:id" element={<StockAdjustmentFormPage />} />
          <Route path="/stock/transfer" element={<StockTransferListPage />} />
          <Route path="/stock/transfer/new" element={<StockTransferFormPage />} />
          <Route path="/stock/transfer/:id" element={<StockTransferFormPage />} />

          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/profit-loss" element={<ProfitAndLossPage />} />
          <Route path="/reports/stock-card" element={<StockCardPage />} />
          <Route path="/reports/debtor-statement" element={<DebtorStatementPage />} />
          <Route path="/reports/creditor-statement" element={<CreditorStatementPage />} />
          <Route path="/reports/balance-sheet" element={<BalanceSheetPage />} />
          <Route path="/reports/trial-balance" element={<TrialBalancePage />} />
          <Route path="/reports/ledger" element={<LedgerPage />} />
          <Route path="/reports/journal-transactions" element={<JournalTransactionPage />} />
          <Route path="/reports/debtor-aging" element={<DebtorAgingPage />} />
          <Route path="/reports/creditor-aging" element={<CreditorAgingPage />} />
          <Route path="/reports/:reportId" element={<ReportsPage />} />

          <Route path="/tools/report-designer" element={<ReportDesignerPage />} />
          <Route path="/tools/audit-trail" element={<AuditTrailPage />} />
          <Route path="/tools/report-designer/:id" element={<ReportDesignerPage />} />
          <Route path="/tools/report-designer/:id/edit" element={<ReportDesignEditorPage />} />

          <Route path="/settings/*" element={<SettingsPage />} />

          <Route path="/ai/scanner" element={<AIScannerPage />} />
          <Route path="/ai/reports" element={<AIReportsPage />} />

          <Route path="/social/inbox" element={<SocialInboxPage />} />
          <Route path="/social/settings" element={<SocialSettingsPage />} />

          <Route path="/messaging/inbox" element={<MessagingInboxPage />} />
          <Route path="/messaging/batch-soa" element={<BatchSOASendPage />} />
          <Route path="/messaging/payment-notify" element={<BatchPaymentNotifyPage />} />
          <Route path="/messaging/batch-invoices" element={<BatchInvoiceSendPage />} />

          <Route path="/crm/leads" element={<LeadKanbanPage />} />

          <Route path="/einvoice" element={<EInvoiceDashboardPage />} />
          <Route path="/einvoice/dashboard" element={<EInvoiceDashboardPage />} />
          <Route path="/einvoice/list" element={<EInvoiceListPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
