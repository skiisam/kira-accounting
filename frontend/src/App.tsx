import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import SetupWizardPage from './pages/setup/SetupWizardPage';
import DashboardPage from './pages/DashboardPage';
import CustomerListPage from './pages/customers/CustomerListPage';
import CustomerFormPage from './pages/customers/CustomerFormPage';
import VendorListPage from './pages/vendors/VendorListPage';
import VendorFormPage from './pages/vendors/VendorFormPage';
import ProductListPage from './pages/products/ProductListPage';
import ProductFormPage from './pages/products/ProductFormPage';
import SalesListPage from './pages/sales/SalesListPage';
import SalesFormPage from './pages/sales/SalesFormPage';
import PurchaseListPage from './pages/purchases/PurchaseListPage';
import PurchaseFormPage from './pages/purchases/PurchaseFormPage';
import ARInvoiceListPage from './pages/ar/ARInvoiceListPage';
import ARPaymentFormPage from './pages/ar/ARPaymentFormPage';
import APInvoiceListPage from './pages/ap/APInvoiceListPage';
import APPaymentFormPage from './pages/ap/APPaymentFormPage';
import AccountListPage from './pages/accounts/AccountListPage';
import JournalListPage from './pages/journals/JournalListPage';
import StockBalancePage from './pages/stock/StockBalancePage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import AIScannerPage from './pages/ai/AIScannerPage';
import AIReportsPage from './pages/ai/AIReportsPage';
import SocialSettingsPage from './pages/social/SocialSettingsPage';
import SocialInboxPage from './pages/social/SocialInboxPage';
import MessagingInboxPage from './pages/messaging/MessagingInboxPage';

// CRM Pages - TODO: Fix CRM models
// import LeadListPage from './pages/crm/LeadListPage';
// import LeadFormPage from './pages/crm/LeadFormPage';
// import DealPipelinePage from './pages/crm/DealPipelinePage';
// import DealFormPage from './pages/crm/DealFormPage';
// import ActivityListPage from './pages/crm/ActivityListPage';
// import ActivityFormPage from './pages/crm/ActivityFormPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Setup Wizard (requires auth but no main layout) */}
      <Route
        path="/setup"
        element={
          <PrivateRoute>
            <SetupWizardPage />
          </PrivateRoute>
        }
      />

      {/* Main App Routes */}
      <Route
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Customers */}
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:id" element={<CustomerFormPage />} />

        {/* Vendors */}
        <Route path="/vendors" element={<VendorListPage />} />
        <Route path="/vendors/new" element={<VendorFormPage />} />
        <Route path="/vendors/:id" element={<VendorFormPage />} />

        {/* Products */}
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id" element={<ProductFormPage />} />

        {/* Sales */}
        <Route path="/sales/quotations" element={<SalesListPage type="quotation" />} />
        <Route path="/sales/orders" element={<SalesListPage type="order" />} />
        <Route path="/sales/delivery-orders" element={<SalesListPage type="do" />} />
        <Route path="/sales/invoices" element={<SalesListPage type="invoice" />} />
        <Route path="/sales/cash-sales" element={<SalesListPage type="cash" />} />
        <Route path="/sales/credit-notes" element={<SalesListPage type="cn" />} />
        <Route path="/sales/debit-notes" element={<SalesListPage type="dn" />} />
        <Route path="/sales/new/:type" element={<SalesFormPage />} />
        <Route path="/sales/:type/:id" element={<SalesFormPage />} />

        {/* Purchases */}
        <Route path="/purchases/orders" element={<PurchaseListPage type="order" />} />
        <Route path="/purchases/grn" element={<PurchaseListPage type="grn" />} />
        <Route path="/purchases/invoices" element={<PurchaseListPage type="invoice" />} />
        <Route path="/purchases/credit-notes" element={<PurchaseListPage type="cn" />} />
        <Route path="/purchases/debit-notes" element={<PurchaseListPage type="dn" />} />
        <Route path="/purchases/new/:type" element={<PurchaseFormPage />} />
        <Route path="/purchases/:type/:id" element={<PurchaseFormPage />} />

        {/* AR */}
        <Route path="/ar/invoices" element={<ARInvoiceListPage />} />
        <Route path="/ar/payments" element={<ARInvoiceListPage type="payment" />} />
        <Route path="/ar/payments/new" element={<ARPaymentFormPage />} />
        <Route path="/ar/payments/:id" element={<ARPaymentFormPage />} />

        {/* AP */}
        <Route path="/ap/invoices" element={<APInvoiceListPage />} />
        <Route path="/ap/payments" element={<APInvoiceListPage type="payment" />} />
        <Route path="/ap/payments/new" element={<APPaymentFormPage />} />
        <Route path="/ap/payments/:id" element={<APPaymentFormPage />} />

        {/* GL */}
        <Route path="/gl/accounts" element={<AccountListPage />} />
        <Route path="/gl/journals" element={<JournalListPage />} />

        {/* Stock */}
        <Route path="/stock/balance" element={<StockBalancePage />} />

        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:reportId" element={<ReportsPage />} />

        {/* Settings */}
        <Route path="/settings/*" element={<SettingsPage />} />

        {/* AI Features */}
        <Route path="/ai/scanner" element={<AIScannerPage />} />
        <Route path="/ai/reports" element={<AIReportsPage />} />

        {/* Social Media */}
        <Route path="/social/inbox" element={<SocialInboxPage />} />
        <Route path="/social/settings" element={<SocialSettingsPage />} />

        {/* Messaging */}
        <Route path="/messaging/inbox" element={<MessagingInboxPage />} />

        {/* CRM - TODO: Fix CRM models
        <Route path="/crm/leads" element={<LeadListPage />} />
        <Route path="/crm/leads/new" element={<LeadFormPage />} />
        <Route path="/crm/leads/:id" element={<LeadFormPage />} />
        <Route path="/crm/deals" element={<DealPipelinePage />} />
        <Route path="/crm/deals/new" element={<DealFormPage />} />
        <Route path="/crm/deals/:id" element={<DealFormPage />} />
        <Route path="/crm/activities" element={<ActivityListPage />} />
        <Route path="/crm/activities/new" element={<ActivityFormPage />} />
        <Route path="/crm/activities/:id" element={<ActivityFormPage />} />
        */}
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
