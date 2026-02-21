// Mock data for demo mode when backend is not available

export const mockUsers = {
  ADMIN: {
    id: 1,
    code: 'ADMIN',
    name: 'Administrator',
    email: 'admin@kira.io',
    isAdmin: true,
    group: 'Administrator',
  },
};

export const mockCustomers = [
  { id: 1, code: 'C001', name: 'ABC Trading Sdn Bhd', contactPerson: 'John Tan', phone: '03-55551234', email: 'john@abc.com', creditLimit: 50000, creditTermDays: 30, currencyCode: 'MYR', isActive: true },
  { id: 2, code: 'C002', name: 'XYZ Enterprise', contactPerson: 'Mary Lee', phone: '03-22221234', email: 'mary@xyz.com', creditLimit: 100000, creditTermDays: 45, currencyCode: 'MYR', isActive: true },
  { id: 3, code: 'C003', name: 'Global Tech Solutions', contactPerson: 'Ahmad Hassan', phone: '03-33335678', email: 'ahmad@globaltech.com', creditLimit: 75000, creditTermDays: 30, currencyCode: 'MYR', isActive: true },
  { id: 4, code: 'C004', name: 'Premier Industries', contactPerson: 'Linda Wong', phone: '03-44449999', email: 'linda@premier.com', creditLimit: 150000, creditTermDays: 60, currencyCode: 'MYR', isActive: true },
  { id: 5, code: 'C005', name: 'Star Manufacturing', contactPerson: 'David Lim', phone: '03-77778888', email: 'david@star.com', creditLimit: 80000, creditTermDays: 30, currencyCode: 'MYR', isActive: false },
];

export const mockVendors = [
  { id: 1, code: 'V001', name: 'Premier Supplies Sdn Bhd', contactPerson: 'Ali Rahman', phone: '03-55559999', email: 'ali@premier.com', creditTermDays: 30, currencyCode: 'MYR', isActive: true },
  { id: 2, code: 'V002', name: 'Quality Materials Co', contactPerson: 'Siti Noor', phone: '03-66667777', email: 'siti@quality.com', creditTermDays: 45, currencyCode: 'MYR', isActive: true },
  { id: 3, code: 'V003', name: 'Tech Components Ltd', contactPerson: 'James Ong', phone: '03-88881234', email: 'james@techcomp.com', creditTermDays: 30, currencyCode: 'USD', isActive: true },
  { id: 4, code: 'V004', name: 'Eastern Trading', contactPerson: 'Mei Ling', phone: '03-99994567', email: 'meiling@eastern.com', creditTermDays: 60, currencyCode: 'MYR', isActive: true },
];

export const mockProducts = [
  { id: 1, code: 'FG-001', description: 'Widget A - Standard', group: { name: 'Finished Goods' }, baseUOM: { code: 'PCS' }, sellingPrice1: 25, sellingPrice2: 23, sellingPrice3: 22, standardCost: 12, isActive: true, isSellable: true, isPurchasable: true },
  { id: 2, code: 'FG-002', description: 'Widget B - Premium', group: { name: 'Finished Goods' }, baseUOM: { code: 'PCS' }, sellingPrice1: 35, sellingPrice2: 33, standardCost: 18, isActive: true, isSellable: true, isPurchasable: true },
  { id: 3, code: 'FG-003', description: 'Gadget Pro X', group: { name: 'Finished Goods' }, baseUOM: { code: 'UNIT' }, sellingPrice1: 150, sellingPrice2: 140, sellingPrice3: 135, standardCost: 85, isActive: true, isSellable: true, isPurchasable: true },
  { id: 4, code: 'RM-001', description: 'Raw Material A', group: { name: 'Raw Materials' }, baseUOM: { code: 'KG' }, sellingPrice1: 8, standardCost: 5, isActive: true, isSellable: false, isPurchasable: true },
  { id: 5, code: 'RM-002', description: 'Raw Material B', group: { name: 'Raw Materials' }, baseUOM: { code: 'KG' }, sellingPrice1: 12, standardCost: 7, isActive: true, isSellable: false, isPurchasable: true },
  { id: 6, code: 'SVC-001', description: 'Installation Service', group: { name: 'Services' }, baseUOM: { code: 'UNIT' }, sellingPrice1: 200, standardCost: 0, isActive: true, isSellable: true, isPurchasable: false },
];

// Sales documents - matching SalesListPage expected fields
export const mockQuotations = [
  { id: 1, documentNo: 'QUO-000001', documentDate: '2026-02-01', customerCode: 'C001', customerName: 'ABC Trading Sdn Bhd', netTotal: 5000, status: 'OPEN', currencyCode: 'MYR' },
  { id: 2, documentNo: 'QUO-000002', documentDate: '2026-02-02', customerCode: 'C002', customerName: 'XYZ Enterprise', netTotal: 15000, status: 'POSTED', currencyCode: 'MYR' },
  { id: 3, documentNo: 'QUO-000003', documentDate: '2026-02-05', customerCode: 'C003', customerName: 'Global Tech Solutions', netTotal: 8500, status: 'OPEN', currencyCode: 'MYR' },
  { id: 4, documentNo: 'QUO-000004', documentDate: '2026-02-08', customerCode: 'C004', customerName: 'Premier Industries', netTotal: 22000, status: 'TRANSFERRED', currencyCode: 'MYR' },
];

export const mockSalesOrders = [
  { id: 1, documentNo: 'SO-000001', documentDate: '2026-02-03', customerCode: 'C001', customerName: 'ABC Trading Sdn Bhd', netTotal: 7500, status: 'OPEN', currencyCode: 'MYR' },
  { id: 2, documentNo: 'SO-000002', documentDate: '2026-02-04', customerCode: 'C002', customerName: 'XYZ Enterprise', netTotal: 12000, status: 'PARTIAL', currencyCode: 'MYR' },
  { id: 3, documentNo: 'SO-000003', documentDate: '2026-02-06', customerCode: 'C003', customerName: 'Global Tech Solutions', netTotal: 9500, status: 'POSTED', currencyCode: 'MYR' },
];

export const mockDeliveryOrders = [
  { id: 1, documentNo: 'DO-000001', documentDate: '2026-02-05', customerCode: 'C001', customerName: 'ABC Trading Sdn Bhd', netTotal: 5000, status: 'POSTED', currencyCode: 'MYR' },
  { id: 2, documentNo: 'DO-000002', documentDate: '2026-02-06', customerCode: 'C002', customerName: 'XYZ Enterprise', netTotal: 8000, status: 'POSTED', currencyCode: 'MYR' },
  { id: 3, documentNo: 'DO-000003', documentDate: '2026-02-08', customerCode: 'C003', customerName: 'Global Tech Solutions', netTotal: 6500, status: 'OPEN', currencyCode: 'MYR' },
];

export const mockSalesInvoices = [
  { id: 1, documentNo: 'INV-000001', documentDate: '2026-02-01', customerCode: 'C001', customerName: 'ABC Trading Sdn Bhd', netTotal: 2500, status: 'POSTED', currencyCode: 'MYR' },
  { id: 2, documentNo: 'INV-000002', documentDate: '2026-02-03', customerCode: 'C002', customerName: 'XYZ Enterprise', netTotal: 5250, status: 'POSTED', currencyCode: 'MYR' },
  { id: 3, documentNo: 'INV-000003', documentDate: '2026-02-05', customerCode: 'C003', customerName: 'Global Tech Solutions', netTotal: 12000, status: 'OPEN', currencyCode: 'MYR' },
  { id: 4, documentNo: 'INV-000004', documentDate: '2026-02-08', customerCode: 'C001', customerName: 'ABC Trading Sdn Bhd', netTotal: 3750, status: 'POSTED', currencyCode: 'MYR' },
  { id: 5, documentNo: 'INV-000005', documentDate: '2026-02-10', customerCode: 'C004', customerName: 'Premier Industries', netTotal: 8900, status: 'PARTIAL', currencyCode: 'MYR' },
];

export const mockCashSales = [
  { id: 1, documentNo: 'CS-000001', documentDate: '2026-02-02', customerCode: 'CASH', customerName: 'Cash Customer', netTotal: 350, status: 'POSTED', currencyCode: 'MYR' },
  { id: 2, documentNo: 'CS-000002', documentDate: '2026-02-04', customerCode: 'CASH', customerName: 'Walk-in Customer', netTotal: 520, status: 'POSTED', currencyCode: 'MYR' },
  { id: 3, documentNo: 'CS-000003', documentDate: '2026-02-07', customerCode: 'CASH', customerName: 'Cash Customer', netTotal: 180, status: 'POSTED', currencyCode: 'MYR' },
];

// Purchase documents
export const mockPurchaseOrders = [
  { id: 1, documentNo: 'PO-000001', documentDate: '2026-02-01', vendorCode: 'V001', vendorName: 'Premier Supplies Sdn Bhd', netTotal: 15000, status: 'POSTED', currencyCode: 'MYR' },
  { id: 2, documentNo: 'PO-000002', documentDate: '2026-02-04', vendorCode: 'V002', vendorName: 'Quality Materials Co', netTotal: 8500, status: 'OPEN', currencyCode: 'MYR' },
  { id: 3, documentNo: 'PO-000003', documentDate: '2026-02-07', vendorCode: 'V003', vendorName: 'Tech Components Ltd', netTotal: 22000, status: 'PARTIAL', currencyCode: 'USD' },
  { id: 4, documentNo: 'PO-000004', documentDate: '2026-02-09', vendorCode: 'V001', vendorName: 'Premier Supplies Sdn Bhd', netTotal: 5500, status: 'OPEN', currencyCode: 'MYR' },
];

export const mockGRNs = [
  { id: 1, documentNo: 'GRN-000001', documentDate: '2026-02-03', vendorCode: 'V001', vendorName: 'Premier Supplies Sdn Bhd', netTotal: 15000, status: 'POSTED', currencyCode: 'MYR' },
  { id: 2, documentNo: 'GRN-000002', documentDate: '2026-02-06', vendorCode: 'V002', vendorName: 'Quality Materials Co', netTotal: 5000, status: 'POSTED', currencyCode: 'MYR' },
  { id: 3, documentNo: 'GRN-000003', documentDate: '2026-02-09', vendorCode: 'V003', vendorName: 'Tech Components Ltd', netTotal: 12000, status: 'POSTED', currencyCode: 'USD' },
];

export const mockPurchaseInvoices = [
  { id: 1, documentNo: 'PI-000001', documentDate: '2026-02-04', vendorCode: 'V001', vendorName: 'Premier Supplies Sdn Bhd', netTotal: 15000, status: 'POSTED', currencyCode: 'MYR' },
  { id: 2, documentNo: 'PI-000002', documentDate: '2026-02-07', vendorCode: 'V002', vendorName: 'Quality Materials Co', netTotal: 5000, status: 'POSTED', currencyCode: 'MYR' },
  { id: 3, documentNo: 'PI-000003', documentDate: '2026-02-10', vendorCode: 'V003', vendorName: 'Tech Components Ltd', netTotal: 12000, status: 'OPEN', currencyCode: 'USD' },
];

// AR/AP documents
export const mockARInvoices = [
  { id: 1, invoiceNo: 'AR-000001', invoiceDate: '2026-02-01', customerCode: 'C001', customerName: 'ABC Trading Sdn Bhd', netTotal: 2500, outstandingAmount: 2500, dueDate: '2026-03-03', status: 'OPEN', currencyCode: 'MYR' },
  { id: 2, invoiceNo: 'AR-000002', invoiceDate: '2026-02-03', customerCode: 'C002', customerName: 'XYZ Enterprise', netTotal: 5250, outstandingAmount: 3250, dueDate: '2026-03-18', status: 'PARTIAL', currencyCode: 'MYR' },
  { id: 3, invoiceNo: 'AR-000003', invoiceDate: '2026-02-05', customerCode: 'C003', customerName: 'Global Tech Solutions', netTotal: 12000, outstandingAmount: 12000, dueDate: '2026-03-07', status: 'OPEN', currencyCode: 'MYR' },
  { id: 4, invoiceNo: 'AR-000004', invoiceDate: '2026-02-08', customerCode: 'C001', customerName: 'ABC Trading Sdn Bhd', netTotal: 3750, outstandingAmount: 0, dueDate: '2026-03-10', status: 'PAID', currencyCode: 'MYR' },
  { id: 5, invoiceNo: 'AR-000005', invoiceDate: '2026-01-15', customerCode: 'C004', customerName: 'Premier Industries', netTotal: 8900, outstandingAmount: 8900, dueDate: '2026-02-14', status: 'OVERDUE', currencyCode: 'MYR' },
];

export const mockARPayments = [
  { id: 1, paymentNo: 'OR-000001', paymentDate: '2026-02-10', customerCode: 'C001', customerName: 'ABC Trading Sdn Bhd', paymentAmount: 3750, paymentMethod: 'Bank Transfer', status: 'POSTED', currencyCode: 'MYR' },
  { id: 2, paymentNo: 'OR-000002', paymentDate: '2026-02-08', customerCode: 'C002', customerName: 'XYZ Enterprise', paymentAmount: 2000, paymentMethod: 'Cheque', status: 'POSTED', currencyCode: 'MYR' },
];

export const mockAPInvoices = [
  { id: 1, invoiceNo: 'AP-000001', invoiceDate: '2026-02-04', vendorCode: 'V001', vendorName: 'Premier Supplies Sdn Bhd', netTotal: 15000, outstandingAmount: 15000, dueDate: '2026-03-06', status: 'OPEN', currencyCode: 'MYR' },
  { id: 2, invoiceNo: 'AP-000002', invoiceDate: '2026-02-07', vendorCode: 'V002', vendorName: 'Quality Materials Co', netTotal: 5000, outstandingAmount: 0, dueDate: '2026-03-24', status: 'PAID', currencyCode: 'MYR' },
  { id: 3, invoiceNo: 'AP-000003', invoiceDate: '2026-02-10', vendorCode: 'V003', vendorName: 'Tech Components Ltd', netTotal: 12000, outstandingAmount: 12000, dueDate: '2026-03-12', status: 'OPEN', currencyCode: 'USD' },
];

export const mockAPPayments = [
  { id: 1, paymentNo: 'PV-000001', paymentDate: '2026-02-09', vendorCode: 'V002', vendorName: 'Quality Materials Co', paymentAmount: 5000, paymentMethod: 'Bank Transfer', status: 'POSTED', currencyCode: 'MYR' },
];

// GL / Accounts
export const mockAccounts = [
  { id: 1, accountNo: '110-0001', name: 'Cash on Hand', type: { code: 'CA', name: 'Current Assets' }, isActive: true },
  { id: 2, accountNo: '110-0002', name: 'Maybank Current Account', type: { code: 'CA', name: 'Current Assets' }, isActive: true },
  { id: 3, accountNo: '120-0001', name: 'Trade Debtors Control', type: { code: 'CA', name: 'Current Assets' }, isActive: true },
  { id: 4, accountNo: '130-0001', name: 'Stock Control', type: { code: 'CA', name: 'Current Assets' }, isActive: true },
  { id: 5, accountNo: '210-0001', name: 'Trade Creditors Control', type: { code: 'CL', name: 'Current Liabilities' }, isActive: true },
  { id: 6, accountNo: '300-0001', name: 'Share Capital', type: { code: 'EQUITY', name: 'Equity' }, isActive: true },
  { id: 7, accountNo: '400-0001', name: 'Sales Revenue', type: { code: 'REVENUE', name: 'Revenue' }, isActive: true },
  { id: 8, accountNo: '500-0001', name: 'Cost of Goods Sold', type: { code: 'EXPENSE', name: 'Expenses' }, isActive: true },
  { id: 9, accountNo: '600-0001', name: 'Salaries & Wages', type: { code: 'EXPENSE', name: 'Expenses' }, isActive: true },
  { id: 10, accountNo: '600-0002', name: 'Utilities', type: { code: 'EXPENSE', name: 'Expenses' }, isActive: true },
];

export const mockJournals = [
  { id: 1, documentNo: 'JV-000001', documentDate: '2026-02-01', description: 'Opening Balance Entry', total: 100000, status: 'POSTED', journalType: 'GJ' },
  { id: 2, documentNo: 'JV-000002', documentDate: '2026-02-05', description: 'Depreciation Entry', total: 2500, status: 'POSTED', journalType: 'GJ' },
  { id: 3, documentNo: 'JV-000003', documentDate: '2026-02-10', description: 'Prepaid Expense Adjustment', total: 1200, status: 'OPEN', journalType: 'GJ' },
];

// Stock
export const mockStockBalance = [
  { id: 1, productCode: 'FG-001', productName: 'Widget A - Standard', locationCode: 'HQ', locationName: 'Main Warehouse', quantity: 500, uom: 'PCS', averageCost: 12, totalValue: 6000 },
  { id: 2, productCode: 'FG-002', productName: 'Widget B - Premium', locationCode: 'HQ', locationName: 'Main Warehouse', quantity: 250, uom: 'PCS', averageCost: 18, totalValue: 4500 },
  { id: 3, productCode: 'FG-003', productName: 'Gadget Pro X', locationCode: 'HQ', locationName: 'Main Warehouse', quantity: 75, uom: 'UNIT', averageCost: 85, totalValue: 6375 },
  { id: 4, productCode: 'RM-001', productName: 'Raw Material A', locationCode: 'HQ', locationName: 'Main Warehouse', quantity: 1000, uom: 'KG', averageCost: 5, totalValue: 5000 },
  { id: 5, productCode: 'RM-002', productName: 'Raw Material B', locationCode: 'HQ', locationName: 'Main Warehouse', quantity: 800, uom: 'KG', averageCost: 7, totalValue: 5600 },
];

// Settings / Lookups
export const mockCurrencies = [
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', exchangeRate: 1, isBaseCurrency: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 4.47, isBaseCurrency: false },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', exchangeRate: 3.32, isBaseCurrency: false },
];

export const mockTaxCodes = [
  { id: 1, code: 'SR', name: 'Standard Rate (6%)', rate: 6, taxType: 'OUTPUT' },
  { id: 2, code: 'ZR', name: 'Zero Rated', rate: 0, taxType: 'OUTPUT' },
  { id: 3, code: 'ES', name: 'Exempt Supply', rate: 0, taxType: 'EXEMPT' },
  { id: 4, code: 'TX', name: 'Purchase Tax (6%)', rate: 6, taxType: 'INPUT' },
];

export const mockUOMs = [
  { id: 1, code: 'PCS', name: 'Pieces' },
  { id: 2, code: 'UNIT', name: 'Unit' },
  { id: 3, code: 'BOX', name: 'Box' },
  { id: 4, code: 'KG', name: 'Kilogram' },
  { id: 5, code: 'SET', name: 'Set' },
];

export const mockProductGroups = [
  { id: 1, code: 'FG', name: 'Finished Goods' },
  { id: 2, code: 'RM', name: 'Raw Materials' },
  { id: 3, code: 'SVC', name: 'Services' },
];

export const mockProductTypes = [
  { id: 1, code: 'STOCK', name: 'Stocked Item' },
  { id: 2, code: 'NON-STOCK', name: 'Non-Stocked Item' },
  { id: 3, code: 'SERVICE', name: 'Service' },
];

export const mockPaymentMethods = [
  { id: 1, code: 'CASH', name: 'Cash' },
  { id: 2, code: 'BANK', name: 'Bank Transfer' },
  { id: 3, code: 'CHEQUE', name: 'Cheque' },
];

export const mockLocations = [
  { id: 1, code: 'HQ', name: 'Main Warehouse', address: 'No. 123, Jalan Industri', isDefault: true },
  { id: 2, code: 'BRANCH1', name: 'Branch 1 Store', address: 'No. 45, Jalan Perniagaan', isDefault: false },
];

// Dashboard stats
export const mockDashboardStats = {
  arOutstanding: 125000,
  apOutstanding: 85000,
  salesThisMonth: 250000,
  lowStockItems: 12,
  totalLeads: 47,
  dealsValue: 320000,
};

// CRM Mock Data
export const mockLeads = [
  { id: 1, code: 'LEAD-00001', companyName: 'Tech Innovations Sdn Bhd', contactName: 'John Doe', email: 'john@techinno.com', phone: '03-12345678', source: 'WEBSITE', status: 'NEW', rating: 'HOT', estimatedValue: 50000, salesAgent: { name: 'Alice Wong' }, isActive: true },
  { id: 2, code: 'LEAD-00002', companyName: 'Global Trading Co', contactName: 'Sarah Lee', email: 'sarah@globaltrading.com', phone: '03-87654321', source: 'REFERRAL', status: 'CONTACTED', rating: 'WARM', estimatedValue: 25000, salesAgent: { name: 'Bob Tan' }, isActive: true },
  { id: 3, code: 'LEAD-00003', companyName: 'Future Systems', contactName: 'Mike Chen', email: 'mike@futuresys.com', phone: '03-55551234', source: 'TRADE_SHOW', status: 'QUALIFIED', rating: 'HOT', estimatedValue: 100000, salesAgent: { name: 'Alice Wong' }, isActive: true },
  { id: 4, code: 'LEAD-00004', companyName: 'Smart Solutions', contactName: 'Lisa Tan', email: 'lisa@smartsol.com', phone: '03-99998888', source: 'COLD_CALL', status: 'NEW', rating: 'COLD', estimatedValue: 15000, salesAgent: null, isActive: true },
  { id: 5, code: 'LEAD-00005', companyName: 'Dynamic Corp', contactName: 'David Lim', email: 'david@dynamic.com', phone: '03-22223333', source: 'SOCIAL_MEDIA', status: 'CONVERTED', rating: 'HOT', estimatedValue: 75000, salesAgent: { name: 'Bob Tan' }, customer: { id: 1, code: 'C001', name: 'ABC Trading Sdn Bhd' }, isActive: true },
];

export const mockLeadStats = {
  totalLeads: 47,
  newLeads: 15,
  qualifiedLeads: 12,
  convertedLeads: 8,
  bySource: [
    { source: 'WEBSITE', _count: { id: 15 } },
    { source: 'REFERRAL', _count: { id: 12 } },
    { source: 'TRADE_SHOW', _count: { id: 10 } },
    { source: 'COLD_CALL', _count: { id: 7 } },
    { source: 'SOCIAL_MEDIA', _count: { id: 3 } },
  ],
  byRating: [
    { rating: 'HOT', _count: { id: 18 } },
    { rating: 'WARM', _count: { id: 20 } },
    { rating: 'COLD', _count: { id: 9 } },
  ],
};

export const mockDeals = [
  { id: 1, code: 'DEAL-00001', name: 'Enterprise Software License', stage: 'PROSPECTING', value: 50000, probability: 10, expectedCloseDate: '2026-03-15', lead: { id: 1, code: 'LEAD-00001', companyName: 'Tech Innovations Sdn Bhd' }, salesAgent: { id: 1, name: 'Alice Wong' }, isActive: true },
  { id: 2, code: 'DEAL-00002', name: 'Annual Support Contract', stage: 'QUALIFICATION', value: 25000, probability: 25, expectedCloseDate: '2026-03-20', lead: { id: 2, code: 'LEAD-00002', companyName: 'Global Trading Co' }, salesAgent: { id: 2, name: 'Bob Tan' }, isActive: true },
  { id: 3, code: 'DEAL-00003', name: 'System Implementation', stage: 'PROPOSAL', value: 150000, probability: 50, expectedCloseDate: '2026-04-01', lead: { id: 3, code: 'LEAD-00003', companyName: 'Future Systems' }, salesAgent: { id: 1, name: 'Alice Wong' }, isActive: true },
  { id: 4, code: 'DEAL-00004', name: 'Hardware Upgrade', stage: 'NEGOTIATION', value: 35000, probability: 75, expectedCloseDate: '2026-02-28', lead: { id: 4, code: 'LEAD-00004', companyName: 'Smart Solutions' }, salesAgent: { id: 2, name: 'Bob Tan' }, isActive: true },
  { id: 5, code: 'DEAL-00005', name: 'Cloud Migration', stage: 'CLOSED_WON', value: 80000, probability: 100, expectedCloseDate: '2026-02-15', actualCloseDate: '2026-02-14', lead: { id: 5, code: 'LEAD-00005', companyName: 'Dynamic Corp' }, salesAgent: { id: 1, name: 'Alice Wong' }, isActive: true },
];

export const mockDealsPipeline = [
  { stage: 'PROSPECTING', deals: mockDeals.filter(d => d.stage === 'PROSPECTING'), totalValue: 50000, count: 1 },
  { stage: 'QUALIFICATION', deals: mockDeals.filter(d => d.stage === 'QUALIFICATION'), totalValue: 25000, count: 1 },
  { stage: 'PROPOSAL', deals: mockDeals.filter(d => d.stage === 'PROPOSAL'), totalValue: 150000, count: 1 },
  { stage: 'NEGOTIATION', deals: mockDeals.filter(d => d.stage === 'NEGOTIATION'), totalValue: 35000, count: 1 },
  { stage: 'CLOSED_WON', deals: mockDeals.filter(d => d.stage === 'CLOSED_WON'), totalValue: 80000, count: 1 },
  { stage: 'CLOSED_LOST', deals: [], totalValue: 0, count: 0 },
];

export const mockDealStats = {
  totalDeals: 15,
  openDeals: 10,
  wonDeals: 5,
  totalValue: 340000,
  wonValue: 180000,
  byStage: [
    { stage: 'PROSPECTING', _count: { id: 3 }, _sum: { value: 75000 } },
    { stage: 'QUALIFICATION', _count: { id: 2 }, _sum: { value: 45000 } },
    { stage: 'PROPOSAL', _count: { id: 3 }, _sum: { value: 220000 } },
    { stage: 'NEGOTIATION', _count: { id: 2 }, _sum: { value: 55000 } },
    { stage: 'CLOSED_WON', _count: { id: 5 }, _sum: { value: 180000 } },
  ],
};

export const mockActivities = [
  { id: 1, leadId: 1, type: 'CALL', subject: 'Initial discovery call', description: 'Discussed requirements and timeline', activityDate: '2026-02-20T10:00:00', status: 'COMPLETED', priority: 'NORMAL', lead: { id: 1, code: 'LEAD-00001', companyName: 'Tech Innovations Sdn Bhd' } },
  { id: 2, leadId: 2, type: 'EMAIL', subject: 'Follow-up on proposal', description: 'Sent detailed pricing', activityDate: '2026-02-19T14:30:00', status: 'COMPLETED', priority: 'HIGH', lead: { id: 2, code: 'LEAD-00002', companyName: 'Global Trading Co' } },
  { id: 3, dealId: 3, type: 'MEETING', subject: 'Demo presentation', description: 'Product demonstration for key stakeholders', activityDate: '2026-02-22T09:00:00', dueDate: '2026-02-22T10:30:00', duration: 90, status: 'PLANNED', priority: 'URGENT', deal: { id: 3, code: 'DEAL-00003', name: 'System Implementation' } },
  { id: 4, leadId: 3, type: 'TASK', subject: 'Prepare quotation', description: 'Draft formal quotation for review', activityDate: '2026-02-21T08:00:00', dueDate: '2026-02-23T17:00:00', status: 'IN_PROGRESS', priority: 'HIGH', lead: { id: 3, code: 'LEAD-00003', companyName: 'Future Systems' } },
  { id: 5, leadId: 1, type: 'NOTE', subject: 'Customer feedback', description: 'Customer expressed interest in premium package', activityDate: '2026-02-18T16:00:00', status: 'COMPLETED', priority: 'NORMAL', lead: { id: 1, code: 'LEAD-00001', companyName: 'Tech Innovations Sdn Bhd' } },
];

// =====================================================
// MESSAGING INTEGRATION
// =====================================================

export const mockMessagingConfigs = [
  { id: 1, platform: 'WHATSAPP', whatsappPhoneNumber: '+60123456789', whatsappBusinessId: 'demo_business_id', isEnabled: true, isVerified: true },
  { id: 2, platform: 'TELEGRAM', telegramBotUsername: '@KiraAccountingBot', isEnabled: true, isVerified: false },
  { id: 3, platform: 'WECHAT', isEnabled: false, isVerified: false },
];

export const mockMessageTemplates = [
  { id: 1, code: 'INVOICE_NOTIFICATION', name: 'Invoice Notification', category: 'INVOICE', body: 'Dear {{customerName}},\n\nYour invoice {{documentNo}} for {{amount}} is ready.\nDue Date: {{dueDate}}\n\nThank you for your business!\n\n- {{companyName}}', isDefault: true, isActive: true },
  { id: 2, code: 'PAYMENT_REMINDER', name: 'Payment Reminder', category: 'PAYMENT_REMINDER', body: 'Dear {{customerName}},\n\nThis is a friendly reminder that invoice {{documentNo}} for {{amount}} is {{daysOverdue}} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you!\n- {{companyName}}', isDefault: true, isActive: true },
  { id: 3, code: 'RECEIPT_NOTIFICATION', name: 'Payment Receipt', category: 'RECEIPT', body: 'Dear {{customerName}},\n\nThank you for your payment of {{amount}}.\nReceipt No: {{documentNo}}\nDate: {{paymentDate}}\n\nWe appreciate your prompt payment!\n\n- {{companyName}}', isDefault: true, isActive: true },
  { id: 4, code: 'STATEMENT_NOTIFICATION', name: 'Customer Statement', category: 'STATEMENT', body: 'Dear {{customerName}},\n\nPlease find attached your account statement.\n\nOutstanding Balance: {{outstandingAmount}}\nStatement Date: {{statementDate}}\n\nIf you have any questions, please contact us.\n\n- {{companyName}}', isDefault: true, isActive: true },
  { id: 5, code: 'WELCOME_MESSAGE', name: 'Welcome Message', category: 'WELCOME', body: 'Welcome to {{companyName}}! We are delighted to have you as our customer.\n\nIf you have any questions, feel free to reach out to us anytime.', isDefault: true, isActive: true },
];

export const mockMessageLogs = [
  { id: 1, platform: 'WHATSAPP', direction: 'OUTBOUND', recipientPhone: '+60123456789', recipientName: 'ABC Trading', customerId: 1, documentType: 'INVOICE', documentId: 1, documentNo: 'INV-000001', body: 'Dear ABC Trading, Your invoice INV-000001 for RM 2,500.00 is ready.', status: 'DELIVERED', createdAt: '2026-02-21T10:30:00', sentAt: '2026-02-21T10:30:05', deliveredAt: '2026-02-21T10:30:08' },
  { id: 2, platform: 'TELEGRAM', direction: 'OUTBOUND', recipientPhone: '987654321', recipientName: 'XYZ Enterprise', customerId: 2, documentType: 'PAYMENT_REMINDER', documentId: 2, documentNo: 'INV-000002', body: 'Dear XYZ Enterprise, This is a reminder for invoice INV-000002.', status: 'SENT', createdAt: '2026-02-21T09:15:00', sentAt: '2026-02-21T09:15:02' },
  { id: 3, platform: 'WHATSAPP', direction: 'INBOUND', recipientPhone: '+60198765432', recipientName: 'New Customer', body: 'Hi, I am interested in your products. Can you share your catalog?', status: 'DELIVERED', createdAt: '2026-02-20T14:20:00' },
  { id: 4, platform: 'WHATSAPP', direction: 'OUTBOUND', recipientPhone: '+60123456789', recipientName: 'ABC Trading', customerId: 1, documentType: 'RECEIPT', documentId: 1, documentNo: 'REC-000001', body: 'Thank you for your payment of RM 2,500.00. Receipt No: REC-000001', status: 'READ', createdAt: '2026-02-19T16:45:00', sentAt: '2026-02-19T16:45:03', deliveredAt: '2026-02-19T16:45:05', readAt: '2026-02-19T16:50:00' },
  { id: 5, platform: 'TELEGRAM', direction: 'INBOUND', recipientPhone: '123456789', senderUsername: 'john_doe', recipientName: 'John Doe', body: 'Hi, can I get a quote for bulk order?', status: 'DELIVERED', createdAt: '2026-02-18T11:00:00' },
];

export const mockMessagingInquiries = [
  { id: 1, platform: 'WHATSAPP', senderPhone: '+60198765432', senderName: 'New Lead', message: 'Hi, I am interested in your products. Can you share your catalog?', status: 'NEW', createdAt: '2026-02-21T14:20:00' },
  { id: 2, platform: 'TELEGRAM', senderPhone: '123456789', senderUsername: 'john_doe', senderName: 'John Doe', message: 'Hi, can I get a quote for bulk order?', status: 'NEW', createdAt: '2026-02-21T11:00:00' },
  { id: 3, platform: 'WHATSAPP', senderPhone: '+60177889900', senderName: 'Ahmad', message: 'Do you have any promotions this month?', status: 'IN_PROGRESS', createdAt: '2026-02-20T09:30:00' },
  { id: 4, platform: 'TELEGRAM', senderPhone: '555666777', senderUsername: 'techbiz', senderName: 'Tech Business', message: 'Interested in partnership opportunities', status: 'CONVERTED', crmLeadId: 5, createdAt: '2026-02-19T15:45:00', processedAt: '2026-02-19T16:00:00' },
  { id: 5, platform: 'WHATSAPP', senderPhone: '+60123456789', senderName: 'ABC Trading', customerId: 1, message: 'When will my order be delivered?', status: 'CLOSED', createdAt: '2026-02-18T10:00:00', processedAt: '2026-02-18T10:15:00' },
];
