import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import * as mockData from './mockData';

// Check if we're in demo mode (explicit opt-in only)
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = response.data.data;
          
          useAuthStore.getState().setTokens(accessToken);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Demo mode mock handlers
function getMockResponse(url: string, params?: Record<string, any>): any {
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const search = params?.search?.toLowerCase() || '';

  const paginate = (data: any[]) => {
    let filtered = [...data];
    if (search) {
      filtered = data.filter(item => 
        Object.values(item).some(val => 
          typeof val === 'string' && val.toLowerCase().includes(search)
        )
      );
    }
    if (params?.isActive !== undefined && params.isActive !== null) {
      filtered = filtered.filter(item => item.isActive === params.isActive);
    }
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);
    return {
      success: true,
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
    };
  };

  // Customers
  if (url.startsWith('/customers')) {
    if (url === '/customers') return paginate(mockData.mockCustomers);
    const id = parseInt(url.split('/')[2]);
    return { success: true, data: mockData.mockCustomers.find(c => c.id === id) };
  }

  // Vendors
  if (url.startsWith('/vendors')) {
    if (url === '/vendors') return paginate(mockData.mockVendors);
    const id = parseInt(url.split('/')[2]);
    return { success: true, data: mockData.mockVendors.find(v => v.id === id) };
  }

  // Products
  if (url.startsWith('/products')) {
    if (url === '/products') return paginate(mockData.mockProducts);
    const id = parseInt(url.split('/')[2]);
    return { success: true, data: mockData.mockProducts.find(p => p.id === id) };
  }

  // Sales documents
  if (url === '/sales/quotations') return paginate(mockData.mockQuotations);
  if (url === '/sales/orders') return paginate(mockData.mockSalesOrders);
  if (url === '/sales/delivery-orders') return paginate(mockData.mockDeliveryOrders);
  if (url === '/sales/invoices') return paginate(mockData.mockSalesInvoices);
  if (url === '/sales/cash-sales') return paginate(mockData.mockCashSales);

  // Purchase documents
  if (url === '/purchases/orders') return paginate(mockData.mockPurchaseOrders);
  if (url === '/purchases/grn') return paginate(mockData.mockGRNs);
  if (url === '/purchases/invoices') return paginate(mockData.mockPurchaseInvoices);

  // AR
  if (url === '/ar/invoices') return paginate(mockData.mockARInvoices);
  if (url === '/ar/payments') return paginate(mockData.mockARPayments);

  // Batch Invoices (Messaging)
  if (url === '/messaging/invoices' || url.startsWith('/messaging/invoices?')) {
    // Transform AR invoices to include customer contact info for batch sending
    const invoicesWithContact = mockData.mockARInvoices.map((inv: any) => {
      const customer = mockData.mockCustomers.find((c: any) => c.code === inv.customerCode);
      return {
        ...inv,
        customerId: customer?.id || 1,
        customer: customer ? {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          mobile: customer.phone?.replace('03-', '+601'), // Simulate mobile
        } : null,
      };
    });
    return paginate(invoicesWithContact);
  }

  // AP
  if (url === '/ap/invoices') return paginate(mockData.mockAPInvoices);
  if (url === '/ap/payments') return paginate(mockData.mockAPPayments);

  // GL / Accounts
  if (url.startsWith('/accounts') || url.startsWith('/gl/accounts')) {
    return paginate(mockData.mockAccounts);
  }
  if (url.startsWith('/gl/journals') || url.startsWith('/journals')) {
    return paginate(mockData.mockJournals);
  }

  // Stock
  if (url.startsWith('/stock')) {
    return paginate(mockData.mockStockBalance);
  }

  // Settings / Lookups
  if (url === '/settings/currencies') return { success: true, data: mockData.mockCurrencies };
  if (url === '/settings/tax-codes') return { success: true, data: mockData.mockTaxCodes };
  if (url === '/settings/uoms') return { success: true, data: mockData.mockUOMs };
  if (url === '/settings/product-groups') return { success: true, data: mockData.mockProductGroups };
  if (url === '/settings/product-types') return { success: true, data: mockData.mockProductTypes };
  if (url === '/settings/payment-methods') return { success: true, data: mockData.mockPaymentMethods };
  if (url === '/settings/locations') return { success: true, data: mockData.mockLocations };
  if (url.startsWith('/settings')) return { success: true, data: [] };

  // Dashboard
  if (url === '/dashboard/stats') return { success: true, data: mockData.mockDashboardStats };

  // CRM - TODO: Fix CRM mock data
  // if (url === '/crm/leads') return paginate(mockData.mockLeads || []);
  // if (url === '/crm/leads/stats') return { success: true, data: mockData.mockLeadStats || {} };
  // if (url.match(/^\/crm\/leads\/\d+$/)) {
  //   const id = parseInt(url.split('/')[3]);
  //   return { success: true, data: (mockData.mockLeads || []).find((l: any) => l.id === id) };
  // }
  // if (url === '/crm/deals') return paginate(mockData.mockDeals || []);
  // if (url === '/crm/deals/pipeline') return { success: true, data: mockData.mockDealsPipeline || [] };
  // if (url === '/crm/deals/stats') return { success: true, data: mockData.mockDealStats || {} };
  // if (url.match(/^\/crm\/deals\/\d+$/)) {
  //   const id = parseInt(url.split('/')[3]);
  //   return { success: true, data: (mockData.mockDeals || []).find((d: any) => d.id === id) };
  // }
  // if (url === '/crm/activities') return paginate(mockData.mockActivities || []);
  // if (url.match(/^\/crm\/activities\/\d+$/)) {
  //   const id = parseInt(url.split('/')[3]);
  //   return { success: true, data: (mockData.mockActivities || []).find((a: any) => a.id === id) };
  // }

  // Messaging Integration
  if (url === '/messaging/config') {
    return { success: true, data: mockData.mockMessagingConfigs };
  }
  if (url.match(/^\/messaging\/config\/\w+$/)) {
    const platform = url.split('/')[3]?.toUpperCase();
    return { success: true, data: mockData.mockMessagingConfigs.find((c: any) => c.platform === platform) };
  }
  if (url === '/messaging/templates' || url.startsWith('/messaging/templates?')) {
    const category = params?.category;
    let templates = mockData.mockMessageTemplates;
    if (category) {
      templates = templates.filter((t: any) => t.category === category);
    }
    return { success: true, data: templates };
  }
  if (url.match(/^\/messaging\/templates\/\w+$/)) {
    const code = url.split('/')[3];
    return { success: true, data: mockData.mockMessageTemplates.find((t: any) => t.code === code) };
  }
  if (url === '/messaging/logs' || url.startsWith('/messaging/logs?')) {
    const platform = params?.platform;
    let logs = mockData.mockMessageLogs;
    if (platform) {
      logs = logs.filter((l: any) => l.platform === platform);
    }
    return paginate(logs);
  }
  if (url === '/messaging/inquiries' || url.startsWith('/messaging/inquiries?')) {
    const status = params?.status;
    let inquiries = mockData.mockMessagingInquiries;
    if (status) {
      inquiries = inquiries.filter((i: any) => i.status === status);
    }
    return paginate(inquiries);
  }

  // Batch SOA - Customers with balance
  if (url.startsWith('/messaging/customers-with-balance')) {
    const customersWithBalance = [
      { id: 1, code: 'C001', name: 'ABC Trading Sdn Bhd', email: 'john@abc.com', phone: '03-55551234', mobile: '012-3456789', totalOutstanding: 5250, invoiceCount: 2, aging: { current: 2500, days1to30: 750, days31to60: 1500, days61to90: 500, over90: 0 } },
      { id: 2, code: 'C002', name: 'XYZ Enterprise', email: 'mary@xyz.com', phone: '03-22221234', mobile: '012-9876543', totalOutstanding: 3250, invoiceCount: 1, aging: { current: 3250, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 } },
      { id: 3, code: 'C003', name: 'Global Tech Solutions', email: 'ahmad@globaltech.com', phone: '03-33335678', mobile: null, totalOutstanding: 12000, invoiceCount: 1, aging: { current: 12000, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 } },
      { id: 4, code: 'C004', name: 'Premier Industries', email: null, phone: '03-44449999', mobile: '016-8765432', totalOutstanding: 8900, invoiceCount: 1, aging: { current: 0, days1to30: 0, days31to60: 8900, days61to90: 0, over90: 0 } },
    ];
    return { success: true, data: customersWithBalance };
  }

  // Batch Payment Notification - Vendor payments
  if (url.startsWith('/messaging/vendor-payments')) {
    const vendorPayments = [
      { id: 1, paymentNo: 'PV-000001', paymentDate: '2026-02-20', paymentAmount: 15000, chequeNo: 'CHQ-001', reference: 'Feb Payment', vendor: { id: 1, code: 'V001', name: 'Premier Supplies Sdn Bhd', email: 'ali@premier.com', phone: '03-55559999', mobile: '019-1234567' }, knockoffs: [{ invoiceNo: 'PI-000001', amount: 15000 }] },
      { id: 2, paymentNo: 'PV-000002', paymentDate: '2026-02-21', paymentAmount: 5000, chequeNo: null, reference: 'TT Payment', vendor: { id: 2, code: 'V002', name: 'Quality Materials Co', email: 'siti@quality.com', phone: '03-66667777', mobile: '012-7654321' }, knockoffs: [{ invoiceNo: 'PI-000002', amount: 5000 }] },
      { id: 3, paymentNo: 'PV-000003', paymentDate: '2026-02-22', paymentAmount: 12000, chequeNo: 'CHQ-002', reference: null, vendor: { id: 3, code: 'V003', name: 'Tech Components Ltd', email: 'james@techcomp.com', phone: '03-88881234', mobile: null }, knockoffs: [{ invoiceNo: 'PI-000003', amount: 10000 }, { invoiceNo: 'PI-000004', amount: 2000 }] },
      { id: 4, paymentNo: 'PV-000004', paymentDate: '2026-02-23', paymentAmount: 8500, chequeNo: null, reference: 'Urgent', vendor: { id: 4, code: 'V004', name: 'Eastern Trading', email: null, phone: '03-99994567', mobile: '013-9876543' }, knockoffs: [{ invoiceNo: 'PI-000005', amount: 8500 }] },
    ];
    return { success: true, data: vendorPayments };
  }

  // Default
  return paginate([]);
}

function handleMockPost(url: string, data?: any): any {
  if (url === '/auth/login') {
    const userCode = (data?.userCode || '').trim().toUpperCase();
    const password = (data?.password || '').trim();
    // Demo login: ADMIN/admin or DEMO/demo (username case-insensitive)
    if ((userCode === 'ADMIN' && password === 'admin') || 
        (userCode === 'DEMO' && password === 'demo')) {
      const user = userCode === 'ADMIN' ? mockData.mockUsers.ADMIN : {
        id: 2,
        code: 'DEMO',
        name: 'Demo User',
        email: 'demo@kira.io',
        isAdmin: false,
        group: 'User',
      };
      return {
        success: true,
        data: {
          user,
          accessToken: 'demo_access_token_' + Date.now(),
          refreshToken: 'demo_refresh_token_' + Date.now(),
          expiresIn: '24h',
        },
      };
    }
    const error = new Error('Invalid credentials');
    (error as any).response = { data: { error: { message: 'Invalid credentials. Try ADMIN/admin or DEMO/demo' } } };
    throw error;
  }

  // Registration
  if (url === '/auth/register') {
    const companyName = data?.companyName || 'Demo Company';
    const email = data?.email || 'demo@example.com';
    const userCode = email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    return {
      success: true,
      data: {
        user: {
          id: Date.now(),
          code: userCode,
          name: companyName,
          email: email,
          isAdmin: true,
          group: 'Company Admin',
          company: companyName,
        },
        company: {
          id: Date.now(),
          code: companyName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6),
          name: companyName,
          setupComplete: false,
        },
        accessToken: 'demo_access_token_' + Date.now(),
        refreshToken: 'demo_refresh_token_' + Date.now(),
        expiresIn: '24h',
      },
    };
  }

  // Setup wizard endpoints
  if (url.startsWith('/auth/setup/')) {
    return {
      success: true,
      data: { message: 'Demo mode: Setup step saved' },
    };
  }

  if (url === '/auth/forgot-password') {
    return {
      success: true,
      data: {
        message: 'Demo mode: Password reset token generated',
        userCode: (data?.identifier || '').toUpperCase(),
        resetToken: 'demo_reset_token_' + Date.now(),
        expiresIn: '1 hour',
      },
    };
  }

  if (url === '/auth/reset-password') {
    return { success: true, message: 'Demo mode: Password reset successful' };
  }

  if (url === '/auth/lookup-username') {
    return {
      success: true,
      data: {
        userCode: 'ADMIN',
        userName: 'Administrator',
      },
    };
  }

  // Messaging endpoints
  if (url.startsWith('/messaging/config/')) {
    return { success: true, data: { id: Date.now(), ...data, platform: url.split('/')[3]?.toUpperCase() } };
  }
  if (url === '/messaging/templates') {
    return { success: true, data: { id: Date.now(), ...data } };
  }
  if (url === '/messaging/send' || url.startsWith('/messaging/send-')) {
    return { 
      success: true, 
      data: { 
        success: true, 
        messageId: `msg_${Date.now()}_demo`,
        message: 'Demo mode: Message sent successfully' 
      } 
    };
  }
  if (url.match(/^\/messaging\/inquiries\/\d+\/convert-to-lead$/)) {
    return { 
      success: true, 
      data: { 
        id: Date.now(), 
        code: `LEAD-${String(Date.now()).slice(-5)}`, 
        companyName: 'Converted Lead',
        status: 'NEW'
      } 
    };
  }

  // Batch SOA sending
  if (url === '/messaging/batch-soa') {
    const customerIds = data?.customerIds || [];
    const results = customerIds.map((id: number) => ({
      customerId: id,
      customerCode: `C${String(id).padStart(3, '0')}`,
      success: Math.random() > 0.1, // 90% success rate
      messageId: `msg_${Date.now()}_${id}`,
      error: Math.random() > 0.1 ? undefined : 'Demo: Random failure for testing'
    }));
    const successCount = results.filter((r: any) => r.success).length;
    return { 
      success: true, 
      data: { 
        summary: { total: customerIds.length, sent: successCount, failed: customerIds.length - successCount },
        results 
      } 
    };
  }

  // Batch payment notification
  if (url === '/messaging/batch-payment-notify') {
    const paymentIds = data?.paymentIds || [];
    const results = paymentIds.map((id: number) => ({
      paymentId: id,
      paymentNo: `PV-${String(id).padStart(6, '0')}`,
      vendorCode: `V${String(id).padStart(3, '0')}`,
      success: Math.random() > 0.1,
      messageId: `msg_${Date.now()}_${id}`,
      error: Math.random() > 0.1 ? undefined : 'Demo: Random failure for testing'
    }));
    const successCount = results.filter((r: any) => r.success).length;
    return { 
      success: true, 
      data: { 
        summary: { total: paymentIds.length, sent: successCount, failed: paymentIds.length - successCount },
        results 
      } 
    };
  }

  // Batch Invoice Sending
  if (url === '/messaging/batch-invoices') {
    const { invoiceIds, channel } = data || {};
    const results = (invoiceIds || []).map((id: number, idx: number) => {
      const inv = mockData.mockARInvoices.find((i: any) => i.id === id);
      // Simulate some failures for demo
      const success = idx % 4 !== 2; // Every 3rd fails
      return {
        invoiceId: id,
        invoiceNo: inv?.invoiceNo || `INV-${id}`,
        customerName: inv?.customerName || 'Customer',
        status: success ? 'sent' : 'failed',
        error: success ? undefined : `Customer has no ${channel === 'email' ? 'email address' : 'phone number'}`,
        messageId: success ? `msg_${Date.now()}_${id}` : undefined,
      };
    });
    return {
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          sent: results.filter((r: any) => r.status === 'sent').length,
          failed: results.filter((r: any) => r.status === 'failed').length,
        },
      },
    };
  }

  // Batch Payment Notifications
  if (url === '/messaging/batch-payment-notifications') {
    const { paymentIds } = data || {};
    const results = (paymentIds || []).map((id: number) => ({
      paymentId: id,
      paymentNo: `PAY-${id}`,
      vendorName: 'Vendor',
      status: 'sent' as const,
      messageId: `msg_${Date.now()}_${id}`,
    }));
    return {
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          sent: results.length,
          failed: 0,
        },
      },
    };
  }

  // For other POST requests (create), return success with mock ID
  return { success: true, data: { id: Date.now(), ...data } };
}

// Generic API functions with demo mode support
export async function get<T>(url: string, params?: Record<string, any>): Promise<T> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
    const response = getMockResponse(url, params);
    return response.data;
  }
  const response = await api.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export async function post<T>(url: string, data?: any): Promise<T> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    try {
      const response = handleMockPost(url, data);
      return response.data;
    } catch (err: any) {
      return Promise.reject(err);
    }
  }
  const response = await api.post<ApiResponse<T>>(url, data);
  return response.data.data;
}

export async function put<T>(url: string, data?: any): Promise<T> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { id: parseInt(url.split('/').pop() || '1'), ...data } as T;
  }
  const response = await api.put<ApiResponse<T>>(url, data);
  return response.data.data;
}

export async function del<T>(url: string): Promise<T> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { success: true } as T;
  }
  const response = await api.delete<ApiResponse<T>>(url);
  return response.data.data;
}

export async function getPaginated<T>(url: string, params?: Record<string, any>): Promise<PaginatedResponse<T>> {
  if (DEMO_MODE) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return getMockResponse(url, params);
  }
  const response = await api.get<PaginatedResponse<T>>(url, { params });
  return response.data;
}

// Export demo mode flag for UI indicators
export const isDemoMode = DEMO_MODE;

export default api;
