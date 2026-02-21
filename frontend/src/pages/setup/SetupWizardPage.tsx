import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { post, isDemoMode } from '../../services/api';
import {
  BuildingOfficeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const STEPS = [
  { id: 1, title: 'Company Info', icon: BuildingOfficeIcon },
  { id: 2, title: 'Fiscal Year', icon: CalendarIcon },
  { id: 3, title: 'Currency', icon: CurrencyDollarIcon },
  { id: 4, title: 'Chart of Accounts', icon: DocumentTextIcon },
  { id: 5, title: 'Complete', icon: CheckCircleIcon },
];

const CURRENCIES = [
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
];

interface CompanyInfoForm {
  name: string;
  registrationNo: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

interface FiscalYearForm {
  startDate: string;
  endDate: string;
}

export default function SetupWizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('MYR');
  const [coaTemplate, setCoaTemplate] = useState<'standard' | 'custom'>('standard');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const companyForm = useForm<CompanyInfoForm>({
    defaultValues: {
      name: user?.company || '',
      country: 'Malaysia',
    }
  });

  const fiscalYearForm = useForm<FiscalYearForm>({
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0].slice(0, 8) + '01',
      endDate: (() => {
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        nextYear.setDate(0); // Last day of previous month (Dec 31)
        return nextYear.toISOString().split('T')[0];
      })(),
    }
  });

  useEffect(() => {
    // Redirect to dashboard if not authenticated
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleNext = async () => {
    setLoading(true);
    try {
      switch (currentStep) {
        case 1: {
          const data = companyForm.getValues();
          if (!isDemoMode) {
            await post('/auth/setup/company-info', data);
          }
          break;
        }
        case 2: {
          const data = fiscalYearForm.getValues();
          if (!data.startDate || !data.endDate) {
            toast.error('Please select start and end dates');
            setLoading(false);
            return;
          }
          if (!isDemoMode) {
            await post('/auth/setup/fiscal-year', data);
          }
          break;
        }
        case 3: {
          if (!isDemoMode) {
            await post('/auth/setup/currency', { baseCurrency: selectedCurrency });
          }
          break;
        }
        case 4: {
          if (!isDemoMode) {
            await post('/auth/setup/chart-of-accounts', { template: coaTemplate });
            await post('/auth/setup/complete', {});
          }
          break;
        }
        case 5: {
          toast.success('Setup complete! Redirecting to dashboard...');
          navigate('/dashboard');
          return;
        }
      }
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Company Information</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Tell us about your company</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Company Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Your Company Sdn Bhd"
                  {...companyForm.register('name', { required: true })}
                />
              </div>

              <div>
                <label className="label">Registration No.</label>
                <input
                  type="text"
                  className="input"
                  placeholder="1234567-A"
                  {...companyForm.register('registrationNo')}
                />
              </div>

              <div>
                <label className="label">Country</label>
                <input
                  type="text"
                  className="input"
                  {...companyForm.register('country')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Address Line 1</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Street address"
                  {...companyForm.register('address1')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Address Line 2</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Suite, unit, building (optional)"
                  {...companyForm.register('address2')}
                />
              </div>

              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Kuala Lumpur"
                  {...companyForm.register('city')}
                />
              </div>

              <div>
                <label className="label">State</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Selangor"
                  {...companyForm.register('state')}
                />
              </div>

              <div>
                <label className="label">Postcode</label>
                <input
                  type="text"
                  className="input"
                  placeholder="50000"
                  {...companyForm.register('postcode')}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fiscal Year</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Set your accounting period</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              <div>
                <label className="label">Fiscal Year Start Date *</label>
                <input
                  type="date"
                  className="input"
                  {...fiscalYearForm.register('startDate', { required: true })}
                />
                <p className="text-sm text-gray-500 mt-1">Usually the first day of a month (e.g., Jan 1 or Apr 1)</p>
              </div>

              <div>
                <label className="label">Fiscal Year End Date *</label>
                <input
                  type="date"
                  className="input"
                  {...fiscalYearForm.register('endDate', { required: true })}
                />
                <p className="text-sm text-gray-500 mt-1">Usually 12 months from start date</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> Most companies use calendar year (Jan 1 - Dec 31) or 
                  Malaysia's tax year (Apr 1 - Mar 31). You can change this later.
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Base Currency</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Select your primary currency</p>
            </div>

            <div className="max-w-lg mx-auto">
              <div className="grid grid-cols-2 gap-3">
                {CURRENCIES.map(currency => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => setSelectedCurrency(currency.code)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedCurrency === currency.code
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {currency.symbol}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {currency.code}
                        </div>
                        <div className="text-sm text-gray-500">
                          {currency.name}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Note:</strong> This will be your base currency for all transactions. 
                  You can still use other currencies and they will be converted to your base currency.
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Set up your accounting structure</p>
            </div>

            <div className="max-w-lg mx-auto space-y-4">
              <button
                type="button"
                onClick={() => setCoaTemplate('standard')}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  coaTemplate === 'standard'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <DocumentTextIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Standard Template (Recommended)
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Pre-configured chart of accounts with common categories:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                      <li>• Assets (Cash, Bank, AR, Inventory, Fixed Assets)</li>
                      <li>• Liabilities (AP, Loans, Tax Payable)</li>
                      <li>• Equity (Capital, Retained Earnings)</li>
                      <li>• Revenue & Expenses</li>
                    </ul>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCoaTemplate('custom')}
                className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                  coaTemplate === 'custom'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Start Fresh (Custom)
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Begin with an empty chart of accounts. You'll create all accounts manually.
                      Best for advanced users with specific requirements.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircleIcon className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              You're All Set! 🎉
            </h2>
            
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
              Your company is now configured and ready to use. 
              Click the button below to go to your dashboard.
            </p>

            <div className="space-y-4 max-w-sm mx-auto text-left">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                <span>Company information saved</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                <span>Fiscal year configured</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                <span>Base currency set to {selectedCurrency}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                <span>Chart of accounts initialized</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 dark:text-white">KIRA Setup</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.company}</p>
              </div>
            </div>
            
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Skip for now
            </button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentStep > step.id
                      ? 'bg-emerald-500 text-white'
                      : currentStep === step.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-xs mt-2 ${
                  currentStep >= step.id 
                    ? 'text-gray-900 dark:text-white font-medium' 
                    : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
              
              {index < STEPS.length - 1 && (
                <div className={`h-0.5 w-12 sm:w-20 mx-2 ${
                  currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/20 dark:border-slate-700/50">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg transition-all"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : currentStep === 5 ? (
                'Go to Dashboard'
              ) : (
                <>
                  Next
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {isDemoMode && (
          <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-center">
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-medium">
              DEMO MODE
            </span>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Changes are simulated and won't be saved permanently
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
