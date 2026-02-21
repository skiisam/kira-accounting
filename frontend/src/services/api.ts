import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import * as mockData from './mockData';

// Check if we're in demo mode (no backend available)
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || 
  (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app'));

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
