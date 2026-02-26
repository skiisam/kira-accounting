import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { get } from '../services/api';
import {
  BanknotesIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  CubeIcon,
  PlusIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  arOutstanding: number;
  apOutstanding: number;
  salesThisMonth: number;
  lowStockItems: number;
  totalLeads: number;
  dealsValue: number;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data: companyData } = useQuery({
    queryKey: ['settings:company'],
    queryFn: () => get('/settings/company'),
  });
  const company = (companyData as any)?.data || companyData || {};

  const { data: statsResp } = useQuery({
    queryKey: ['dashboard:stats'],
    queryFn: () => get('/dashboard/stats'),
  });
  const statsData: DashboardStats = ((statsResp as any)?.data || statsResp || {
    arOutstanding: 0, apOutstanding: 0, salesThisMonth: 0, lowStockItems: 0, totalLeads: 0, dealsValue: 0,
  }) as DashboardStats;

  const { data: recentResp } = useQuery({
    queryKey: ['dashboard:recent'],
    queryFn: () => get('/dashboard/recent'),
  });
  const recentActivity = Array.isArray((recentResp as any)?.data) ? (recentResp as any).data : (Array.isArray(recentResp) ? recentResp : []);

  const { data: topProductsResp } = useQuery({
    queryKey: ['dashboard:top-products'],
    queryFn: () => get('/dashboard/top-products'),
  });
  const topProducts = Array.isArray((topProductsResp as any)?.data) ? (topProductsResp as any).data : (Array.isArray(topProductsResp) ? topProductsResp : []);

  const { data: alertsResp } = useQuery({
    queryKey: ['dashboard:alerts'],
    queryFn: () => get('/dashboard/alerts'),
  });
  const alertsData = (alertsResp as any)?.data || alertsResp || {};

  // Stats configuration with translation keys
  const stats = [
    { 
      nameKey: 'dashboard.arOutstanding',
      key: 'arOutstanding', 
      icon: BanknotesIcon, 
      gradient: 'from-cyan-500 to-blue-600',
      shadowColor: 'shadow-blue-500/30',
      trend: '+12%',
      trendUp: true,
      href: '/ar/invoices',
    },
    { 
      nameKey: 'dashboard.apOutstanding',
      key: 'apOutstanding', 
      icon: CreditCardIcon, 
      gradient: 'from-rose-500 to-pink-600',
      shadowColor: 'shadow-pink-500/30',
      trend: '-5%',
      trendUp: false,
      href: '/ap/invoices',
    },
    { 
      nameKey: 'dashboard.salesThisMonth',
      key: 'salesThisMonth', 
      icon: ShoppingCartIcon, 
      gradient: 'from-emerald-500 to-teal-600',
      shadowColor: 'shadow-emerald-500/30',
      trend: '+24%',
      trendUp: true,
      href: '/reports/sales-summary',
    },
    { 
      nameKey: 'dashboard.lowStockItems',
      key: 'lowStockItems', 
      icon: CubeIcon, 
      gradient: 'from-amber-500 to-orange-600',
      shadowColor: 'shadow-orange-500/30',
      trend: '3 new',
      trendUp: false,
      href: '/stock/balance',
    },
    { 
      nameKey: 'dashboard.activeLeads',
      key: 'totalLeads', 
      icon: UserGroupIcon, 
      gradient: 'from-purple-500 to-pink-600',
      shadowColor: 'shadow-purple-500/30',
      trend: '+8',
      trendUp: true,
      isNumber: true,
      href: '/crm/leads',
    },
    { 
      nameKey: 'dashboard.pipelineValue',
      key: 'dealsValue', 
      icon: CurrencyDollarIcon, 
      gradient: 'from-indigo-500 to-violet-600',
      shadowColor: 'shadow-indigo-500/30',
      trend: '+18%',
      trendUp: true,
      href: '/crm/deals',
    },
  ];

  const quickActions = [
    { nameKey: 'dashboard.newInvoice', href: '/sales/new/invoice', icon: DocumentTextIcon, color: 'from-blue-500 to-indigo-600' },
    { nameKey: 'dashboard.newQuotation', href: '/sales/new/quotation', icon: ClipboardDocumentListIcon, color: 'from-emerald-500 to-teal-600' },
    { nameKey: 'dashboard.newLead', href: '/crm/leads/new', icon: UserGroupIcon, color: 'from-purple-500 to-pink-600' },
    { nameKey: 'dashboard.newDeal', href: '/crm/deals/new', icon: CurrencyDollarIcon, color: 'from-indigo-500 to-violet-600' },
  ];

  const alerts = [
    { type: 'warning', icon: ExclamationTriangleIcon, messageKey: 'dashboard.productsBelow', count: alertsData.productsBelow || 0, bgColor: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-800 dark:text-amber-300', iconColor: 'text-amber-500', href: '/stock/balance' },
    { type: 'danger', icon: ClockIcon, messageKey: 'dashboard.invoicesOverdue', count: alertsData.invoicesOverdue || 0, bgColor: 'bg-red-50 dark:bg-red-900/20', textColor: 'text-red-800 dark:text-red-300', iconColor: 'text-red-500', href: '/ar/invoices' },
    { type: 'info', icon: ClipboardDocumentListIcon, messageKey: 'dashboard.quotationsExpiring', count: alertsData.quotationsExpiring || 0, bgColor: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-800 dark:text-blue-300', iconColor: 'text-blue-500', href: '/sales/quotations' },
  ];

  const formatCurrency = (value: number) => {
    const currency = company?.baseCurrency || 'MYR';
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <p className="page-subtitle">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats Grid - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const value = statsData[stat.key as keyof DashboardStats] as number;
          const displayValue = stat.key === 'lowStockItems' || (stat as any).isNumber
            ? value.toString() 
            : formatCurrency(value);

          return (
            <Link 
              key={stat.key} 
              to={stat.href}
              className={`stat-card bg-gradient-to-br ${stat.gradient} shadow-xl ${stat.shadowColor} transform hover:scale-[1.02] transition-all duration-300 cursor-pointer`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background decoration */}
              <div className="absolute inset-0 bg-white/5 rounded-xl" />
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              
              {/* Icon */}
              <stat.icon className="stat-card-icon" />
              
              {/* Content */}
              <div className="relative">
                <p className="text-sm font-medium text-white/80 mb-1">{t(stat.nameKey)}</p>
                <p className="text-3xl font-bold text-white mb-2">{displayValue}</p>
                <div className={`inline-flex items-center gap-1 text-xs font-medium ${stat.trendUp ? 'text-white/90' : 'text-white/70'}`}>
                  <ArrowTrendingUpIcon className={`w-3.5 h-3.5 ${!stat.trendUp && 'rotate-180'}`} />
                  {stat.trend} {t('dashboard.fromLastMonth')}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PlusIcon className="w-5 h-5 text-primary-500" />
              {t('dashboard.quickActions')}
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.nameKey}
                  to={action.href}
                  className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${action.color} text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-sm">{t(action.nameKey)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-primary-500" />
              {t('dashboard.recentActivity')}
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {recentActivity.map((item: any, index: number) => (
                <div 
                  key={index}
                  className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-purple-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.doc}</span>
                  </div>
                  <span className={`badge ${item.statusColor}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
              {t('dashboard.salesOverview')}
            </h2>
          </div>
          <div className="card-body">
            <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/30 dark:to-slate-800/30 rounded-xl">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white mb-3">
                  <ArrowTrendingUpIcon className="w-8 h-8" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboard.salesChartPlaceholder')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-purple-500" />
              {t('dashboard.topProducts')}
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {topProducts.map((product: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{product.sales} {t('dashboard.unitsSold')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts - Clickable */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            {t('dashboard.alertsNotifications')}
          </h2>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <Link 
                key={index}
                to={alert.href}
                className={`flex items-center gap-4 p-4 rounded-xl ${alert.bgColor} transition-all hover:scale-[1.01] cursor-pointer`}
              >
                <div className={`p-2 rounded-lg bg-white/50 dark:bg-white/10 ${alert.iconColor}`}>
                  <alert.icon className="w-5 h-5" />
                </div>
                <span className={`text-sm font-medium ${alert.textColor}`}>
                  {alert.count} {t(alert.messageKey)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
