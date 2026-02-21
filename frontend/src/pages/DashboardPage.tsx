import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  CubeIcon,
  PlusIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  // TruckIcon,
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

const stats = [
  { 
    name: 'AR Outstanding', 
    key: 'arOutstanding', 
    icon: BanknotesIcon, 
    gradient: 'from-cyan-500 to-blue-600',
    shadowColor: 'shadow-blue-500/30',
    trend: '+12%',
    trendUp: true,
  },
  { 
    name: 'AP Outstanding', 
    key: 'apOutstanding', 
    icon: CreditCardIcon, 
    gradient: 'from-rose-500 to-pink-600',
    shadowColor: 'shadow-pink-500/30',
    trend: '-5%',
    trendUp: false,
  },
  { 
    name: 'Sales This Month', 
    key: 'salesThisMonth', 
    icon: ShoppingCartIcon, 
    gradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/30',
    trend: '+24%',
    trendUp: true,
  },
  { 
    name: 'Low Stock Items', 
    key: 'lowStockItems', 
    icon: CubeIcon, 
    gradient: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-orange-500/30',
    trend: '3 new',
    trendUp: false,
  },
  { 
    name: 'Active Leads', 
    key: 'totalLeads', 
    icon: UserGroupIcon, 
    gradient: 'from-purple-500 to-pink-600',
    shadowColor: 'shadow-purple-500/30',
    trend: '+8',
    trendUp: true,
    isNumber: true,
  },
  { 
    name: 'Pipeline Value', 
    key: 'dealsValue', 
    icon: CurrencyDollarIcon, 
    gradient: 'from-indigo-500 to-violet-600',
    shadowColor: 'shadow-indigo-500/30',
    trend: '+18%',
    trendUp: true,
  },
];

const quickActions = [
  { name: 'New Invoice', href: '/sales/new/invoice', icon: DocumentTextIcon, color: 'from-blue-500 to-indigo-600' },
  { name: 'New Quotation', href: '/sales/new/quotation', icon: ClipboardDocumentListIcon, color: 'from-emerald-500 to-teal-600' },
  { name: 'New Lead', href: '/crm/leads/new', icon: UserGroupIcon, color: 'from-purple-500 to-pink-600' },
  { name: 'New Deal', href: '/crm/deals/new', icon: CurrencyDollarIcon, color: 'from-indigo-500 to-violet-600' },
];

const recentActivity = [
  { type: 'invoice', doc: 'INV-000123', status: 'Posted', statusColor: 'badge-success' },
  { type: 'receipt', doc: 'OR-000045', status: 'RM 5,000', statusColor: 'badge-info' },
  { type: 'po', doc: 'PO-000089', status: 'Pending', statusColor: 'badge-warning' },
  { type: 'grn', doc: 'GRN-000034', status: 'Received', statusColor: 'badge-success' },
];

const alerts = [
  { type: 'warning', icon: ExclamationTriangleIcon, message: '12 products are below reorder level', bgColor: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-800 dark:text-amber-300', iconColor: 'text-amber-500' },
  { type: 'danger', icon: ClockIcon, message: '5 invoices are overdue', bgColor: 'bg-red-50 dark:bg-red-900/20', textColor: 'text-red-800 dark:text-red-300', iconColor: 'text-red-500' },
  { type: 'info', icon: ClipboardDocumentListIcon, message: '3 quotations expiring this week', bgColor: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-800 dark:text-blue-300', iconColor: 'text-blue-500' },
];

export default function DashboardPage() {
  // In production, this would fetch real data
  const mockStats: DashboardStats = {
    arOutstanding: 125000,
    apOutstanding: 85000,
    salesThisMonth: 250000,
    lowStockItems: 12,
    totalLeads: 47,
    dealsValue: 320000,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening with your business.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const value = mockStats[stat.key as keyof DashboardStats];
          const displayValue = stat.key === 'lowStockItems' || (stat as any).isNumber
            ? value.toString() 
            : formatCurrency(value);

          return (
            <div 
              key={stat.name} 
              className={`stat-card bg-gradient-to-br ${stat.gradient} shadow-xl ${stat.shadowColor} transform hover:scale-[1.02] transition-all duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background decoration */}
              <div className="absolute inset-0 bg-white/5 rounded-xl" />
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
              
              {/* Icon */}
              <stat.icon className="stat-card-icon" />
              
              {/* Content */}
              <div className="relative">
                <p className="text-sm font-medium text-white/80 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-white mb-2">{displayValue}</p>
                <div className={`inline-flex items-center gap-1 text-xs font-medium ${stat.trendUp ? 'text-white/90' : 'text-white/70'}`}>
                  <ArrowTrendingUpIcon className={`w-3.5 h-3.5 ${!stat.trendUp && 'rotate-180'}`} />
                  {stat.trend} from last month
                </div>
              </div>
            </div>
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
              Quick Actions
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  to={action.href}
                  className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${action.color} text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-sm">{action.name}</span>
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
              Recent Activity
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {recentActivity.map((item, index) => (
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

      {/* Charts Row - Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
              Sales Overview
            </h2>
          </div>
          <div className="card-body">
            <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/30 dark:to-slate-800/30 rounded-xl">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white mb-3">
                  <ArrowTrendingUpIcon className="w-8 h-8" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Sales chart will be displayed here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-purple-500" />
              Top Products
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {[
                { name: 'Widget A', sales: 1234, color: 'from-blue-500 to-indigo-500' },
                { name: 'Widget B', sales: 987, color: 'from-emerald-500 to-teal-500' },
                { name: 'Widget C', sales: 654, color: 'from-orange-500 to-amber-500' },
                { name: 'Widget D', sales: 432, color: 'from-pink-500 to-rose-500' },
              ].map((product, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${product.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{product.sales} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            Alerts & Notifications
          </h2>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div 
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl ${alert.bgColor} transition-all hover:scale-[1.01] cursor-pointer`}
              >
                <div className={`p-2 rounded-lg bg-white/50 dark:bg-white/10 ${alert.iconColor}`}>
                  <alert.icon className="w-5 h-5" />
                </div>
                <span className={`text-sm font-medium ${alert.textColor}`}>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
