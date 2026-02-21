import { useState } from 'react';
import {
  SparklesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  BanknotesIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  CubeIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

interface AIInsight {
  id: string;
  type: 'positive' | 'warning' | 'info' | 'suggestion';
  title: string;
  description: string;
  metric?: string;
  change?: number;
}

interface AIReport {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  status: 'ready' | 'generating' | 'completed';
}

const mockInsights: AIInsight[] = [
  {
    id: '1',
    type: 'positive',
    title: 'Revenue Growth',
    description: 'Your sales revenue has increased by 24% compared to last month. Top performing products are Widget A and Gadget Pro X.',
    metric: 'RM 250,000',
    change: 24,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Overdue Receivables',
    description: '5 invoices totaling RM 32,500 are overdue. Consider following up with ABC Trading and Premier Industries.',
    metric: 'RM 32,500',
    change: -15,
  },
  {
    id: '3',
    type: 'suggestion',
    title: 'Cash Flow Optimization',
    description: 'Based on your payment patterns, you could improve cash flow by offering 2% early payment discount to your top 3 customers.',
  },
  {
    id: '4',
    type: 'info',
    title: 'Stock Alert',
    description: '12 products are below reorder level. Raw Material A and Widget B should be restocked within the next week.',
    metric: '12 items',
  },
  {
    id: '5',
    type: 'positive',
    title: 'Expense Reduction',
    description: 'Operating expenses decreased by 8% this month due to better vendor negotiations on Raw Material purchases.',
    metric: 'RM 4,200 saved',
    change: -8,
  },
  {
    id: '6',
    type: 'suggestion',
    title: 'Pricing Opportunity',
    description: 'Gadget Pro X has high demand with 95% sell-through rate. Consider a 5-10% price increase without affecting sales volume.',
  },
];

const reportTemplates: AIReport[] = [
  {
    id: 'financial-summary',
    name: 'Financial Summary',
    description: 'AI-generated executive summary of your financial position, including key ratios and trends.',
    icon: BanknotesIcon,
    color: 'from-blue-500 to-indigo-600',
    status: 'ready',
  },
  {
    id: 'sales-analysis',
    name: 'Sales Analysis',
    description: 'Deep dive into sales performance, customer segments, product mix, and growth opportunities.',
    icon: ShoppingCartIcon,
    color: 'from-emerald-500 to-teal-600',
    status: 'ready',
  },
  {
    id: 'cash-flow-forecast',
    name: 'Cash Flow Forecast',
    description: 'AI-predicted cash flow for the next 30/60/90 days based on historical patterns.',
    icon: ArrowTrendingUpIcon,
    color: 'from-violet-500 to-purple-600',
    status: 'ready',
  },
  {
    id: 'ar-aging-analysis',
    name: 'AR Aging Analysis',
    description: 'Detailed analysis of receivables aging with collection probability scores.',
    icon: CreditCardIcon,
    color: 'from-orange-500 to-amber-600',
    status: 'ready',
  },
  {
    id: 'inventory-optimization',
    name: 'Inventory Optimization',
    description: 'Stock level recommendations based on demand patterns and lead times.',
    icon: CubeIcon,
    color: 'from-pink-500 to-rose-600',
    status: 'ready',
  },
  {
    id: 'anomaly-detection',
    name: 'Anomaly Detection',
    description: 'AI-detected unusual transactions or patterns that may require attention.',
    icon: ExclamationTriangleIcon,
    color: 'from-red-500 to-orange-600',
    status: 'ready',
  },
];

const generatedReportContent = `
## Executive Financial Summary
### Period: February 2026

---

### Key Financial Highlights

| Metric | Current | Previous | Change |
|--------|---------|----------|--------|
| Total Revenue | RM 250,000 | RM 201,600 | +24.0% |
| Gross Profit | RM 87,500 | RM 72,576 | +20.6% |
| Net Profit | RM 45,000 | RM 38,300 | +17.5% |
| Operating Expenses | RM 42,500 | RM 34,276 | +24.0% |

---

### Revenue Analysis

**Top Performing Products:**
1. **Gadget Pro X** - RM 75,000 (30% of revenue)
2. **Widget A - Standard** - RM 62,500 (25% of revenue)
3. **Widget B - Premium** - RM 43,750 (17.5% of revenue)

**Customer Concentration:**
- Top 5 customers account for 65% of revenue
- ABC Trading remains the largest customer (18% of revenue)
- New customer acquisition: 3 this month

---

### Cash Position

**Current Cash Balance:** RM 125,000

**Expected Inflows (Next 30 days):**
- AR Collections: RM 89,500
- Expected Sales: RM 85,000

**Expected Outflows (Next 30 days):**
- AP Payments: RM 45,000
- Payroll: RM 35,000
- Operating Expenses: RM 25,000

**Projected Cash Balance (30 days):** RM 194,500

---

### Key Ratios

| Ratio | Value | Industry Avg | Status |
|-------|-------|--------------|--------|
| Current Ratio | 2.4 | 1.8 | ✅ Good |
| Quick Ratio | 1.8 | 1.2 | ✅ Good |
| Gross Margin | 35% | 32% | ✅ Good |
| AR Days | 38 | 45 | ✅ Good |
| AP Days | 32 | 30 | ⚠️ Watch |

---

### AI Recommendations

1. **Optimize Inventory Levels**
   - Reduce Widget B stock by 20% (slow moving)
   - Increase Raw Material A buffer stock (high demand)

2. **Improve Collections**
   - Follow up on 5 overdue invoices (RM 32,500)
   - Consider early payment discounts for large customers

3. **Pricing Strategy**
   - Gadget Pro X shows inelastic demand - consider 5% price increase
   - Review Widget B pricing due to lower turnover

4. **Cost Management**
   - Negotiate better terms with top 3 vendors
   - Review utility expenses (10% above budget)

---

*Report generated by KIRA AI on February 11, 2026*
`;

export default function AIReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<AIReport | null>(null);

  const handleGenerateReport = async (report: AIReport) => {
    setGenerating(report.id);
    setSelectedReport(report);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setGeneratedReport(generatedReportContent);
    setGenerating(null);
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'positive':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
      case 'suggestion':
        return <LightBulbIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <ChartBarIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getInsightBg = (type: AIInsight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'suggestion':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
              <SparklesIcon className="w-6 h-6" />
            </span>
            AI Insights & Reports
          </h1>
          <p className="page-subtitle">AI-powered financial analysis and intelligent recommendations</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-amber-500" />
            Smart Insights
          </h2>
          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-medium">
            AI Generated
          </span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockInsights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-xl border ${getInsightBg(insight.type)} transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {insight.title}
                      </h3>
                      {insight.change !== undefined && (
                        <span className={`text-xs font-medium ${insight.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {insight.change >= 0 ? '+' : ''}{insight.change}%
                        </span>
                      )}
                    </div>
                    {insight.metric && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                        {insight.metric}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Templates */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardDocumentListIcon className="w-5 h-5 text-blue-500" />
            AI Report Generator
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTemplates.map((report) => (
              <div
                key={report.id}
                className="relative p-5 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all hover:shadow-lg group cursor-pointer"
                onClick={() => handleGenerateReport(report)}
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${report.color} text-white shadow-lg mb-4`}>
                  <report.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {report.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {report.description}
                </p>
                <button
                  className="w-full btn btn-secondary text-sm group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20"
                  disabled={generating === report.id}
                >
                  {generating === report.id ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4" />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Report Modal/Display */}
      {generatedReport && selectedReport && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedReport.color} text-white`}>
                <selectedReport.icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedReport.name}
                </h2>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <CheckBadgeIcon className="w-3 h-3" />
                  Generated by KIRA AI
                </p>
              </div>
            </div>
            <button
              onClick={() => setGeneratedReport(null)}
              className="btn btn-secondary text-sm"
            >
              Close
            </button>
          </div>
          <div className="card-body">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                {generatedReport}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn btn-primary">
                <ClipboardDocumentListIcon className="w-5 h-5" />
                Export PDF
              </button>
              <button className="btn btn-secondary">
                Share Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
