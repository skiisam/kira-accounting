import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { post } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CubeIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';

// Country options
const COUNTRIES = [
  { code: 'MY', name: 'Malaysia', currency: 'MYR', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', flag: '🇸🇬' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand', currency: 'THB', flag: '🇹🇭' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', flag: '🇻🇳' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK', flag: '🇲🇲' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR', flag: '🇰🇭' },
  { code: 'BN', name: 'Brunei', currency: 'BND', flag: '🇧🇳' },
  { code: 'US', name: 'United States', currency: 'USD', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', currency: 'AUD', flag: '🇦🇺' },
  { code: 'IN', name: 'India', currency: 'INR', flag: '🇮🇳' },
  { code: 'CN', name: 'China', currency: 'CNY', flag: '🇨🇳' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', flag: '🇹🇼' },
];

// GL Code format characters
const GL_FORMAT_CHARS = [
  { char: '0', meaning: 'Numeric only (0-9)', example: '1, 2, 3...' },
  { char: 'A', meaning: 'Alphanumeric (A-Z, 0-9)', example: 'A, B, 1, 2...' },
  { char: 'L', meaning: 'Uppercase letter only (A-Z)', example: 'A, B, C...' },
  { char: '-/.(){}', meaning: 'Literal separator characters', example: '-, /, .' },
];

// Pre-defined GL Code formats
const GL_FORMATS = [
  { value: '0000', label: '4 Numeric', example: '1000, 2100, 4000' },
  { value: '00000', label: '5 Numeric', example: '10000, 21000, 40000' },
  { value: '00-0000', label: '2-4 Numeric', example: '10-1000, 20-2100' },
  { value: '000-000', label: '3-3 Numeric', example: '100-100, 200-210' },
  { value: 'AAA-0000', label: 'Alpha-Numeric', example: 'AST-1000, REV-4000' },
  { value: 'L-0000', label: 'Letter-Numeric', example: 'A-1000, L-2100' },
  { value: '', label: 'Free Format', example: 'Any format allowed' },
];

// Chart of Accounts templates
const COA_TEMPLATES = [
  { id: 'trading', name: 'Trading / General Business', icon: '🏪', desc: 'Buy and sell goods, general commerce' },
  { id: 'manufacturing', name: 'Manufacturing', icon: '🏭', desc: 'Production, raw materials, WIP inventory' },
  { id: 'services', name: 'Professional Services', icon: '💼', desc: 'Consulting, legal, general services' },
  { id: 'it-services', name: 'IT Services & Software', icon: '💻', desc: 'Software development, IT consulting, SaaS' },
  { id: 'recruitment', name: 'Recruitment Agency', icon: '👥', desc: 'Staffing, HR services, placement fees' },
  { id: 'accounting', name: 'Accounting Firm', icon: '📊', desc: 'Audit, tax, bookkeeping services' },
  { id: 'insurance', name: 'Insurance Agency', icon: '🛡️', desc: 'Insurance sales, commissions, claims' },
  { id: 'travel', name: 'Travel Agency', icon: '✈️', desc: 'Tour packages, bookings, commissions' },
  { id: 'retail', name: 'Retail / Chain Store', icon: '🛒', desc: 'Multi-location retail, POS integration' },
  { id: 'fnb', name: 'Food & Beverage', icon: '🍽️', desc: 'Restaurant, cafe, catering' },
  { id: 'car-workshop', name: 'Car Workshop / Automotive', icon: '🔧', desc: 'Vehicle repairs, parts, services' },
  { id: 'construction', name: 'Construction / Contractor', icon: '🏗️', desc: 'Project-based, progress billing' },
  { id: 'property', name: 'Property / Real Estate', icon: '🏠', desc: 'Property sales, rental income' },
  { id: 'healthcare', name: 'Healthcare / Clinic', icon: '🏥', desc: 'Medical services, patient billing' },
  { id: 'education', name: 'Education / Training', icon: '📚', desc: 'Tuition, courses, training fees' },
  { id: 'logistics', name: 'Logistics / Freight', icon: '🚚', desc: 'Shipping, warehousing, delivery' },
  { id: 'banking', name: 'Banking / Finance', icon: '🏦', desc: 'Financial services, interest income' },
  { id: 'agriculture', name: 'Agriculture / Farming', icon: '🌾', desc: 'Crops, livestock, farm operations' },
];

// Inventory system types
const INVENTORY_TYPES = [
  { 
    id: 'perpetual', 
    name: 'Perpetual Inventory', 
    desc: 'Real-time tracking. Stock updates automatically with each transaction. Recommended for most businesses.',
    icon: '🔄',
  },
  { 
    id: 'periodic', 
    name: 'Periodic Inventory', 
    desc: 'Stock counted periodically (monthly/yearly). COGS calculated at period end. Simpler but less accurate.',
    icon: '📅',
  },
  { 
    id: 'none', 
    name: 'Non-Inventory (Services Only)', 
    desc: 'No stock tracking. Suitable for pure service businesses with no physical products.',
    icon: '📋',
  },
];

interface WizardData {
  // Step 1: Country & Currency
  country: string;
  currency: string;
  
  // Step 2: Accounting Period
  fiscalYearStart: string;
  commencementDate: string;
  
  // Step 3: Company Info
  companyName: string;
  registrationNo: string;
  address1: string;
  city: string;
  state: string;
  postcode: string;
  
  // Step 4: Tax Settings
  enableGST: boolean;
  enableSST: boolean;
  enableEInvoice: boolean;
  enableWithholdingTax: boolean;
  gstNo: string;
  sstNo: string;
  
  // Step 5: GL & COA
  glFormat: string;
  glFormatCustom: string;
  coaMode: 'blank' | 'sample' | 'copy';
  coaTemplate: string;
  
  // Step 6: Inventory
  inventoryType: string;
}

const STEPS = [
  { id: 1, name: 'Country', icon: GlobeAltIcon },
  { id: 2, name: 'Period', icon: CalendarIcon },
  { id: 3, name: 'Company', icon: BuildingOfficeIcon },
  { id: 4, name: 'Tax', icon: CalculatorIcon },
  { id: 5, name: 'Accounts', icon: DocumentTextIcon },
  { id: 6, name: 'Inventory', icon: CubeIcon },
  { id: 7, name: 'Finish', icon: CheckCircleIcon },
];

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>({
    country: 'MY',
    currency: 'MYR',
    fiscalYearStart: new Date().getFullYear() + '-01-01',
    commencementDate: new Date().toISOString().split('T')[0],
    companyName: '',
    registrationNo: '',
    address1: '',
    city: '',
    state: '',
    postcode: '',
    enableGST: false,
    enableSST: true,
    enableEInvoice: true,
    enableWithholdingTax: false,
    gstNo: '',
    sstNo: '',
    glFormat: '0000',
    glFormatCustom: '',
    coaMode: 'sample',
    coaTemplate: 'trading',
    inventoryType: 'perpetual',
  });

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const mutation = useMutation({
    mutationFn: (wizardData: WizardData) => post('/settings/setup-wizard', wizardData),
    onSuccess: () => {
      toast.success('Setup completed! Welcome to KIRA Accounting.');
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Setup failed');
    },
  });

  const handleNext = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    mutation.mutate(data);
  };

  const selectedCountry = COUNTRIES.find((c) => c.code === data.country);
  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg">
              <CurrencyDollarIcon className="w-10 h-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white">KIRA</h1>
              <p className="text-white/60 text-sm">Accounting System</p>
            </div>
          </div>
          <h2 className="text-xl text-white/80">Setup Wizard</h2>
          <p className="text-white/60 mt-2">Let's configure your accounting system</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep >= step.id
                        ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg'
                        : 'bg-white/10 text-white/40'
                    }`}
                  >
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-1 ${currentStep >= step.id ? 'text-white' : 'text-white/40'}`}>
                    {step.name}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${currentStep > step.id ? 'bg-cyan-400' : 'bg-white/20'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* Step 1: Country & Currency */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Select Your Country
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    This determines your default currency and tax settings
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => updateData({ country: country.code, currency: country.currency })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        data.country === country.code
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-2xl">{country.flag}</span>
                      <p className="font-medium text-gray-900 dark:text-white mt-1">{country.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{country.currency}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Accounting Period */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Accounting Period
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Set your fiscal year start date and business commencement date
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Fiscal Year Start Date *</label>
                    <input
                      type="date"
                      value={data.fiscalYearStart}
                      onChange={(e) => updateData({ fiscalYearStart: e.target.value })}
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Usually Jan 1 or your company's financial year start
                    </p>
                  </div>
                  <div>
                    <label className="label">Business Commencement Date *</label>
                    <input
                      type="date"
                      value={data.commencementDate}
                      onChange={(e) => updateData({ commencementDate: e.target.value })}
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      When your business started operating
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Company Information */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Company Information
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Basic information about your business
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="label">Company Name *</label>
                    <input
                      type="text"
                      value={data.companyName}
                      onChange={(e) => updateData({ companyName: e.target.value })}
                      className="input"
                      placeholder="Your Company Sdn Bhd"
                    />
                  </div>
                  <div>
                    <label className="label">Business Registration No (BRN)</label>
                    <input
                      type="text"
                      value={data.registrationNo}
                      onChange={(e) => updateData({ registrationNo: e.target.value })}
                      className="input"
                      placeholder="202301012345"
                    />
                  </div>
                  <div>
                    <label className="label">Postcode</label>
                    <input
                      type="text"
                      value={data.postcode}
                      onChange={(e) => updateData({ postcode: e.target.value })}
                      className="input"
                      placeholder="50450"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Address</label>
                    <input
                      type="text"
                      value={data.address1}
                      onChange={(e) => updateData({ address1: e.target.value })}
                      className="input"
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input
                      type="text"
                      value={data.city}
                      onChange={(e) => updateData({ city: e.target.value })}
                      className="input"
                      placeholder="Kuala Lumpur"
                    />
                  </div>
                  <div>
                    <label className="label">State</label>
                    <input
                      type="text"
                      value={data.state}
                      onChange={(e) => updateData({ state: e.target.value })}
                      className="input"
                      placeholder="Selangor"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Tax Settings */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Tax Settings
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Enable the tax features your business requires
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    data.enableSST ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={data.enableSST}
                      onChange={(e) => updateData({ enableSST: e.target.checked })}
                      className="mt-1 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">SST (Sales & Service Tax)</p>
                      <p className="text-sm text-gray-500">Malaysia's current tax system</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    data.enableGST ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={data.enableGST}
                      onChange={(e) => updateData({ enableGST: e.target.checked })}
                      className="mt-1 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">GST (Goods & Services Tax)</p>
                      <p className="text-sm text-gray-500">For countries with GST/VAT</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    data.enableEInvoice ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={data.enableEInvoice}
                      onChange={(e) => updateData({ enableEInvoice: e.target.checked })}
                      className="mt-1 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">E-Invoice (LHDN MyInvois)</p>
                      <p className="text-sm text-gray-500">Malaysia mandatory e-invoicing</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    data.enableWithholdingTax ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={data.enableWithholdingTax}
                      onChange={(e) => updateData({ enableWithholdingTax: e.target.checked })}
                      className="mt-1 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Withholding Tax</p>
                      <p className="text-sm text-gray-500">For payments to non-residents</p>
                    </div>
                  </label>
                </div>
                {(data.enableSST || data.enableGST) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                    {data.enableSST && (
                      <div>
                        <label className="label">SST Registration No</label>
                        <input
                          type="text"
                          value={data.sstNo}
                          onChange={(e) => updateData({ sstNo: e.target.value })}
                          className="input"
                          placeholder="W10-1808-32000123"
                        />
                      </div>
                    )}
                    {data.enableGST && (
                      <div>
                        <label className="label">GST Registration No</label>
                        <input
                          type="text"
                          value={data.gstNo}
                          onChange={(e) => updateData({ gstNo: e.target.value })}
                          className="input"
                          placeholder="GST No"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: GL & Chart of Accounts */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Chart of Accounts Setup
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    Configure your account code format and initial chart of accounts
                  </p>
                </div>

                {/* Account Code Format Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Account Code Format</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={data.glFormatCustom || data.glFormat}
                        onChange={(e) => updateData({ glFormatCustom: e.target.value, glFormat: e.target.value })}
                        className="input font-mono text-lg"
                        placeholder="0000"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {GL_FORMATS.map((format) => (
                        <button
                          key={format.value}
                          onClick={() => updateData({ glFormat: format.value, glFormatCustom: format.value })}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                            data.glFormat === format.value
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {format.label || 'Free'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      💡 Leave empty for free format (any code allowed)
                    </p>
                  </div>

                  {/* Format Character Reference */}
                  <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format Characters</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="pb-2 font-medium">Char</th>
                          <th className="pb-2 font-medium">Meaning</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 dark:text-gray-300">
                        {GL_FORMAT_CHARS.map((item) => (
                          <tr key={item.char}>
                            <td className="py-1 font-mono font-bold text-primary-600">{item.char}</td>
                            <td className="py-1">{item.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sample Chart of Accounts Section */}
                <div className="pt-4 border-t">
                  <label className="label mb-3">Sample Chart of Accounts</label>
                  <div className="space-y-3">
                    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      data.coaMode === 'blank' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <input
                        type="radio"
                        name="coaMode"
                        checked={data.coaMode === 'blank'}
                        onChange={() => updateData({ coaMode: 'blank' })}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Blank Account Book</p>
                        <p className="text-sm text-gray-500">Start with no accounts - create your own from scratch</p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      data.coaMode === 'sample' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <input
                        type="radio"
                        name="coaMode"
                        checked={data.coaMode === 'sample'}
                        onChange={() => updateData({ coaMode: 'sample' })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">Create Sample Chart of Accounts</p>
                        <p className="text-sm text-gray-500 mb-3">Pre-configured accounts for your industry</p>
                        {data.coaMode === 'sample' && (
                          <select
                            value={data.coaTemplate}
                            onChange={(e) => updateData({ coaTemplate: e.target.value })}
                            className="input"
                          >
                            {COA_TEMPLATES.map((t) => (
                              <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </label>

                    <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all opacity-50 ${
                      data.coaMode === 'copy' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 dark:border-gray-700'
                    }`}>
                      <input
                        type="radio"
                        name="coaMode"
                        checked={data.coaMode === 'copy'}
                        onChange={() => updateData({ coaMode: 'copy' })}
                        className="mt-1"
                        disabled
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Copy from Other Account Book</p>
                        <p className="text-sm text-gray-500">Import COA from existing company (Coming Soon)</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Industry Quick Select (when sample mode) */}
                {data.coaMode === 'sample' && (
                  <div className="pt-4 border-t">
                    <label className="label mb-3">Industry Templates</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {COA_TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => updateData({ coaTemplate: template.id })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            data.coaTemplate === template.id
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-xl">{template.icon}</span>
                          <p className="font-medium text-xs text-gray-900 dark:text-white mt-1 truncate">{template.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Inventory System */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Inventory System
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                    How do you want to track your inventory?
                  </p>
                </div>
                <div className="space-y-4">
                  {INVENTORY_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => updateData({ inventoryType: type.id })}
                      className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
                        data.inventoryType === type.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{type.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-lg">{type.name}</p>
                          <p className="text-gray-500 dark:text-gray-400 mt-1">{type.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7: Summary & Finish */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircleIcon className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Ready to Go!
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Review your settings and click Finish to complete setup
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Country</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedCountry?.flag} {selectedCountry?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Currency</p>
                      <p className="font-medium text-gray-900 dark:text-white">{data.currency}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Company</p>
                      <p className="font-medium text-gray-900 dark:text-white">{data.companyName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fiscal Year Start</p>
                      <p className="font-medium text-gray-900 dark:text-white">{data.fiscalYearStart}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Chart of Accounts</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {data.coaMode === 'blank' 
                          ? 'Blank (No accounts)' 
                          : data.coaMode === 'sample' 
                            ? COA_TEMPLATES.find((t) => t.id === data.coaTemplate)?.name 
                            : 'Copy from existing'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Inventory System</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {INVENTORY_TYPES.find((t) => t.id === data.inventoryType)?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Tax Features</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {[
                          data.enableSST && 'SST',
                          data.enableGST && 'GST',
                          data.enableEInvoice && 'E-Invoice',
                          data.enableWithholdingTax && 'WHT',
                        ].filter(Boolean).join(', ') || 'None'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">GL Format</p>
                      <p className="font-medium text-gray-900 dark:text-white font-mono">{data.glFormat}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`btn btn-secondary ${currentStep === 1 ? 'invisible' : ''}`}
            >
              Back
            </button>
              <button onClick={handleSkip} className="btn">
                Skip for now
              </button>
            </div>
            {currentStep < 7 ? (
              <button onClick={handleNext} className="btn btn-primary">
                Next
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={mutation.isPending}
                className="btn bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
              >
                {mutation.isPending ? 'Setting up...' : '🚀 Finish Setup'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-white/40 text-sm mt-6">
          You can change these settings later in Settings → Company
        </p>
      </div>
    </div>
  );
}
