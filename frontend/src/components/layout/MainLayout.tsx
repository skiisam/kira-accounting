import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { isDemoMode } from '../../services/api';
import LanguageSwitcher from '../common/LanguageSwitcher';
import {
  HomeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ShoppingCartIcon,
  TruckIcon,
  BanknotesIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  ChartPieIcon,
  ArchiveBoxIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DocumentCheckIcon,
  // UserGroupIcon, // TODO: CRM
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ShoppingCartIcon as ShoppingCartIconSolid,
  UsersIcon as UsersIconSolid,
} from '@heroicons/react/24/solid';

const navigation = [
  { nameKey: 'nav.dashboard', href: '/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid, color: 'from-violet-500 to-purple-500' },
  {
    nameKey: 'nav.sales',
    icon: ShoppingCartIcon,
    iconSolid: ShoppingCartIconSolid,
    color: 'from-emerald-500 to-teal-500',
    children: [
      { nameKey: 'nav.quotations', href: '/sales/quotations' },
      { nameKey: 'nav.salesOrders', href: '/sales/orders' },
      { nameKey: 'nav.deliveryOrders', href: '/sales/delivery-orders' },
      { nameKey: 'nav.invoices', href: '/sales/invoices' },
      { nameKey: 'nav.cashSales', href: '/sales/cash-sales' },
      { nameKey: 'nav.creditNotes', href: '/sales/credit-notes' },
      { nameKey: 'nav.debitNotes', href: '/sales/debit-notes' },
    ],
  },
  {
    nameKey: 'nav.purchases',
    icon: TruckIcon,
    color: 'from-orange-500 to-amber-500',
    children: [
      { nameKey: 'nav.purchaseOrders', href: '/purchases/orders' },
      { nameKey: 'nav.goodsReceived', href: '/purchases/grn' },
      { nameKey: 'nav.purchaseInvoices', href: '/purchases/invoices' },
      { nameKey: 'nav.supplierCreditNotes', href: '/purchases/credit-notes' },
      { nameKey: 'nav.supplierDebitNotes', href: '/purchases/debit-notes' },
    ],
  },
  {
    nameKey: 'nav.receivables',
    icon: BanknotesIcon,
    color: 'from-cyan-500 to-blue-500',
    children: [
      { nameKey: 'nav.arInvoices', href: '/ar/invoices' },
      { nameKey: 'nav.receipts', href: '/ar/payments' },
    ],
  },
  {
    nameKey: 'nav.payables',
    icon: CreditCardIcon,
    color: 'from-rose-500 to-pink-500',
    children: [
      { nameKey: 'nav.apInvoices', href: '/ap/invoices' },
      { nameKey: 'nav.payments', href: '/ap/payments' },
    ],
  },
  { nameKey: 'nav.customers', href: '/customers', icon: UsersIcon, iconSolid: UsersIconSolid, color: 'from-blue-500 to-indigo-500' },
  { nameKey: 'nav.vendors', href: '/vendors', icon: BuildingStorefrontIcon, color: 'from-amber-500 to-yellow-500' },
  { nameKey: 'nav.products', href: '/products', icon: CubeIcon, color: 'from-fuchsia-500 to-purple-500' },
  {
    nameKey: 'nav.messaging',
    icon: ChatBubbleLeftRightIcon,
    color: 'from-pink-500 to-rose-500',
    children: [
      { nameKey: 'nav.messagingInbox', href: '/messaging/inbox' },
      { nameKey: 'nav.batchSoa', href: '/messaging/batch-soa' },
      { nameKey: 'nav.paymentNotify', href: '/messaging/payment-notify' },
      { nameKey: 'nav.socialInbox', href: '/social/inbox' },
      { nameKey: 'nav.socialSettings', href: '/social/settings' },
    ],
  },
  {
    nameKey: 'nav.generalLedger',
    icon: CalculatorIcon,
    color: 'from-slate-500 to-gray-500',
    children: [
      { nameKey: 'nav.chartOfAccounts', href: '/gl/accounts' },
      { nameKey: 'nav.journalEntries', href: '/gl/journals' },
    ],
  },
  {
    nameKey: 'nav.inventory',
    icon: ArchiveBoxIcon,
    color: 'from-lime-500 to-green-500',
    children: [
      { nameKey: 'nav.stockBalance', href: '/stock/balance' },
      { nameKey: 'nav.stockAdjustment', href: '/stock/adjustment' },
      { nameKey: 'nav.stockTransfer', href: '/stock/transfer' },
    ],
  },
  { nameKey: 'nav.reports', href: '/reports', icon: ChartPieIcon, color: 'from-indigo-500 to-violet-500' },
  {
    nameKey: 'nav.einvoice',
    icon: DocumentCheckIcon,
    color: 'from-cyan-500 to-teal-500',
    children: [
      { nameKey: 'nav.einvoiceDashboard', href: '/einvoice/dashboard' },
      { nameKey: 'nav.einvoiceList', href: '/einvoice/list' },
    ],
  },
  {
    nameKey: 'nav.aiTools',
    icon: SparklesIcon,
    color: 'from-violet-500 to-purple-600',
    children: [
      { nameKey: 'nav.documentScanner', href: '/ai/scanner' },
      { nameKey: 'nav.aiReports', href: '/ai/reports' },
    ],
  },
  { nameKey: 'nav.settings', href: '/settings', icon: Cog6ToothIcon, color: 'from-gray-500 to-slate-500' },
];

interface NavItemProps {
  item: typeof navigation[0];
  mobile?: boolean;
  t: (key: string) => string;
}

function NavItem({ item, mobile, t }: NavItemProps) {
  const [open, setOpen] = useState(false);
  const baseClass = mobile ? 'sidebar-link w-full' : 'sidebar-link';

  if ('children' in item && item.children) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setOpen(!open)}
          className={`${baseClass} sidebar-link-inactive justify-between w-full group`}
        >
          <span className="flex items-center gap-3">
            <span className={`p-1.5 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-lg`}>
              <item.icon className="w-4 h-4" />
            </span>
            {t(item.nameKey)}
          </span>
          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-11 mt-1 space-y-1 border-l-2 border-white/20 pl-3">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-white/20 text-white font-medium shadow-lg' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {t(child.nameKey)}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to={item.href!}
      className={({ isActive }) =>
        `${baseClass} group ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
      }
    >
      <span className={`p-1.5 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-lg group-hover:shadow-xl transition-shadow`}>
        <item.icon className="w-4 h-4" />
      </span>
      {t(item.nameKey)}
    </NavLink>
  );
}

function ThemeToggle() {
  const { mode, setMode } = useThemeStore();
  
  const modes = [
    { value: 'light', icon: SunIcon, label: 'Light' },
    { value: 'dark', icon: MoonIcon, label: 'Dark' },
    { value: 'auto', icon: ComputerDesktopIcon, label: 'Auto' },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 bg-white/10 rounded-lg">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={`p-1.5 rounded-md transition-all duration-200 ${
            mode === value 
              ? 'bg-white/20 text-white shadow-lg' 
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title={label}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}

export default function MainLayout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { isDark } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div 
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)} 
        />
        <div className="fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 shadow-2xl">
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/30">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">KIRA</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-4rem)]">
            {navigation.map((item) => (
              <NavItem key={item.nameKey} item={item} mobile t={t} />
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-indigo-900 via-purple-900 to-slate-900 hidden lg:block shadow-2xl shadow-purple-900/50">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/30 animate-pulse">
              <CurrencyDollarIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-wide">KIRA</span>
              <p className="text-xs text-white/50">Accounting System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1.5 overflow-y-auto h-[calc(100vh-8rem)]">
          {navigation.map((item, index) => (
            <div key={item.nameKey} style={{ animationDelay: `${index * 50}ms` }} className="animate-slide-in">
              <NavItem item={item} t={t} />
            </div>
          ))}
        </nav>

        {/* Theme Toggle & User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-gradient-to-t from-slate-900/80">
          <div className="flex items-center justify-between">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            
            {/* Demo mode indicator & search placeholder */}
            <div className="flex-1 px-4 flex items-center gap-4">
              {isDemoMode && (
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium shadow-lg animate-pulse">
                  🎮 DEMO MODE
                </span>
              )}
            </div>
            
            {/* User section */}
            <div className="flex items-center gap-4">
              {/* Language Switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>

              {/* Mobile theme toggle */}
              <div className="lg:hidden">
                <button
                  onClick={() => useThemeStore.getState().setMode(isDark ? 'light' : 'dark')}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user?.code}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-indigo-500/30">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
