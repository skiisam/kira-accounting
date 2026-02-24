import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Account Types
  const accountTypes = await Promise.all([
    prisma.accountType.upsert({ where: { code: 'ASSET' }, update: {}, create: { code: 'ASSET', name: 'Assets', category: 'ASSET', normalBalance: 'D', displayOrder: 1 } }),
    prisma.accountType.upsert({ where: { code: 'CA' }, update: {}, create: { code: 'CA', name: 'Current Assets', category: 'ASSET', normalBalance: 'D', displayOrder: 2 } }),
    prisma.accountType.upsert({ where: { code: 'FA' }, update: {}, create: { code: 'FA', name: 'Fixed Assets', category: 'ASSET', normalBalance: 'D', displayOrder: 3 } }),
    prisma.accountType.upsert({ where: { code: 'LIABILITY' }, update: {}, create: { code: 'LIABILITY', name: 'Liabilities', category: 'LIABILITY', normalBalance: 'C', displayOrder: 4 } }),
    prisma.accountType.upsert({ where: { code: 'CL' }, update: {}, create: { code: 'CL', name: 'Current Liabilities', category: 'LIABILITY', normalBalance: 'C', displayOrder: 5 } }),
    prisma.accountType.upsert({ where: { code: 'EQUITY' }, update: {}, create: { code: 'EQUITY', name: 'Equity', category: 'EQUITY', normalBalance: 'C', displayOrder: 6 } }),
    prisma.accountType.upsert({ where: { code: 'REVENUE' }, update: {}, create: { code: 'REVENUE', name: 'Revenue', category: 'REVENUE', normalBalance: 'C', displayOrder: 7 } }),
    prisma.accountType.upsert({ where: { code: 'EXPENSE' }, update: {}, create: { code: 'EXPENSE', name: 'Expenses', category: 'EXPENSE', normalBalance: 'D', displayOrder: 8 } }),
    prisma.accountType.upsert({ where: { code: 'COGS' }, update: {}, create: { code: 'COGS', name: 'Cost of Goods Sold', category: 'EXPENSE', normalBalance: 'D', displayOrder: 9 } }),
  ]);
  console.log('✅ Account types created');

  // Currencies
  await prisma.currency.upsert({ where: { code: 'MYR' }, update: {}, create: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimalPlaces: 2, exchangeRate: 1, isBaseCurrency: true } });
  await prisma.currency.upsert({ where: { code: 'USD' }, update: {}, create: { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, exchangeRate: 4.47 } });
  await prisma.currency.upsert({ where: { code: 'SGD' }, update: {}, create: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2, exchangeRate: 3.32 } });
  console.log('✅ Currencies created');

  // Tax Codes
  await prisma.taxCode.upsert({ where: { code: 'SR' }, update: {}, create: { code: 'SR', name: 'Standard Rate (6%)', rate: 6, taxType: 'OUTPUT', isDefault: true } });
  await prisma.taxCode.upsert({ where: { code: 'ZR' }, update: {}, create: { code: 'ZR', name: 'Zero Rated', rate: 0, taxType: 'OUTPUT' } });
  await prisma.taxCode.upsert({ where: { code: 'ES' }, update: {}, create: { code: 'ES', name: 'Exempt Supply', rate: 0, taxType: 'EXEMPT' } });
  await prisma.taxCode.upsert({ where: { code: 'TX' }, update: {}, create: { code: 'TX', name: 'Purchase Tax (6%)', rate: 6, taxType: 'INPUT' } });
  console.log('✅ Tax codes created');

  // Note: UOM, Product Group, Type, Category, Brand, Color are all user-customizable
  // Users create these in Settings before creating products

  // Locations
  const location = await prisma.location.upsert({
    where: { code: 'HQ' },
    update: {},
    create: { code: 'HQ', name: 'Main Warehouse', address: 'No. 123, Jalan Industri, Shah Alam', isDefault: true },
  });
  console.log('✅ Locations created');

  // User Groups with Access Rights
  const adminGroup = await prisma.userGroup.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: { code: 'ADMIN', name: 'Administrator', description: 'Full system access' },
  });
  
  const staffGroup = await prisma.userGroup.upsert({
    where: { code: 'STAFF' },
    update: {},
    create: { code: 'STAFF', name: 'Staff', description: 'Limited access for general staff' },
  });
  
  await prisma.userGroup.upsert({ where: { code: 'ACCOUNTANT' }, update: {}, create: { code: 'ACCOUNTANT', name: 'Accountant', description: 'Accounting functions' } });
  await prisma.userGroup.upsert({ where: { code: 'SALES' }, update: {}, create: { code: 'SALES', name: 'Sales Staff', description: 'Sales transactions only' } });
  console.log('✅ User groups created');

  // Access Rights for Admin (full access)
  const MODULES = ['SALES', 'PURCHASE', 'AR', 'AP', 'STOCK', 'REPORTS', 'SETTINGS', 'USERS'];
  const ADMIN_PERMISSIONS: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; custom: Record<string, boolean> }> = {
    SALES: { view: true, create: true, edit: true, delete: true, custom: { post: true, void: true } },
    PURCHASE: { view: true, create: true, edit: true, delete: true, custom: { post: true, void: true } },
    AR: { view: true, create: true, edit: true, delete: true, custom: {} },
    AP: { view: true, create: true, edit: true, delete: true, custom: {} },
    STOCK: { view: true, create: false, edit: false, delete: false, custom: { adjust: true, transfer: true } },
    REPORTS: { view: true, create: false, edit: false, delete: false, custom: {} },
    SETTINGS: { view: true, create: false, edit: true, delete: false, custom: {} },
    USERS: { view: true, create: false, edit: false, delete: false, custom: { manage: true } },
  };

  for (const moduleCode of MODULES) {
    const perms = ADMIN_PERMISSIONS[moduleCode];
    await prisma.accessRight.upsert({
      where: { id: -1 }, // Force create
      update: {},
      create: {
        groupId: adminGroup.id,
        moduleCode,
        functionCode: 'ALL',
        canView: perms.view,
        canAdd: perms.create,
        canEdit: perms.edit,
        canDelete: perms.delete,
        canPrint: perms.view,
        canExport: perms.view,
        customPermissions: perms.custom,
      },
    }).catch(() => {
      // Ignore duplicate errors, create if not exists
      return prisma.accessRight.create({
        data: {
          groupId: adminGroup.id,
          moduleCode,
          functionCode: 'ALL',
          canView: perms.view,
          canAdd: perms.create,
          canEdit: perms.edit,
          canDelete: perms.delete,
          canPrint: perms.view,
          canExport: perms.view,
          customPermissions: perms.custom,
        },
      }).catch(() => null);
    });
  }

  // Access Rights for Staff (limited access)
  const STAFF_PERMISSIONS: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean; custom: Record<string, boolean> }> = {
    SALES: { view: true, create: true, edit: true, delete: false, custom: { post: false, void: false } },
    PURCHASE: { view: true, create: true, edit: true, delete: false, custom: { post: false, void: false } },
    AR: { view: true, create: false, edit: false, delete: false, custom: {} },
    AP: { view: true, create: false, edit: false, delete: false, custom: {} },
    STOCK: { view: true, create: false, edit: false, delete: false, custom: { adjust: false, transfer: false } },
    REPORTS: { view: true, create: false, edit: false, delete: false, custom: {} },
    SETTINGS: { view: true, create: false, edit: false, delete: false, custom: {} },
    USERS: { view: false, create: false, edit: false, delete: false, custom: { manage: false } },
  };

  for (const moduleCode of MODULES) {
    const perms = STAFF_PERMISSIONS[moduleCode];
    await prisma.accessRight.create({
      data: {
        groupId: staffGroup.id,
        moduleCode,
        functionCode: 'ALL',
        canView: perms.view,
        canAdd: perms.create,
        canEdit: perms.edit,
        canDelete: perms.delete,
        canPrint: perms.view,
        canExport: perms.view,
        customPermissions: perms.custom,
      },
    }).catch(() => null);
  }
  console.log('✅ Access rights created');

  // Admin User
  const hashedPassword = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'Administrator',
      email: 'admin@traeaccounting.com',
      passwordHash: hashedPassword,
      groupId: adminGroup.id,
      isAdmin: true,
    },
  });
  console.log('✅ Admin user created');

  // Chart of Accounts
  const caType = accountTypes.find(t => t.code === 'CA')!;
  const clType = accountTypes.find(t => t.code === 'CL')!;
  const revenueType = accountTypes.find(t => t.code === 'REVENUE')!;
  const expenseType = accountTypes.find(t => t.code === 'EXPENSE')!;

  const cashAccount = await prisma.account.upsert({
    where: { accountNo: '110-0001' },
    update: {},
    create: { accountNo: '110-0001', name: 'Cash on Hand', typeId: caType.id, specialType: 'CASH' },
  });
  const bankAccount = await prisma.account.upsert({
    where: { accountNo: '110-0002' },
    update: {},
    create: { accountNo: '110-0002', name: 'Maybank Current Account', typeId: caType.id, specialType: 'BANK' },
  });
  const arControl = await prisma.account.upsert({
    where: { accountNo: '120-0001' },
    update: {},
    create: { accountNo: '120-0001', name: 'Trade Debtors Control', typeId: caType.id, specialType: 'AR_CONTROL' },
  });
  const stockControl = await prisma.account.upsert({
    where: { accountNo: '130-0001' },
    update: {},
    create: { accountNo: '130-0001', name: 'Stock Control', typeId: caType.id, specialType: 'STOCK' },
  });
  const apControl = await prisma.account.upsert({
    where: { accountNo: '210-0001' },
    update: {},
    create: { accountNo: '210-0001', name: 'Trade Creditors Control', typeId: clType.id, specialType: 'AP_CONTROL' },
  });
  await prisma.account.upsert({
    where: { accountNo: '400-0001' },
    update: {},
    create: { accountNo: '400-0001', name: 'Sales Revenue', typeId: revenueType.id },
  });
  await prisma.account.upsert({
    where: { accountNo: '500-0001' },
    update: {},
    create: { accountNo: '500-0001', name: 'Cost of Goods Sold', typeId: expenseType.id },
  });
  console.log('✅ Chart of accounts created');

  // Payment Methods
  await prisma.paymentMethod.upsert({
    where: { code: 'CASH' },
    update: {},
    create: { code: 'CASH', name: 'Cash', accountId: cashAccount.id, paymentType: 'CASH' },
  });
  await prisma.paymentMethod.upsert({
    where: { code: 'BANK' },
    update: {},
    create: { code: 'BANK', name: 'Bank Transfer', accountId: bankAccount.id, paymentType: 'BANK_TRANSFER' },
  });
  console.log('✅ Payment methods created');

  // Note: Product Groups, Product Types are user-customizable - no seed data

  // Sample Customers
  await prisma.customer.upsert({
    where: { code: 'C001' },
    update: {},
    create: {
      code: 'C001',
      name: 'ABC Trading Sdn Bhd',
      controlAccountId: arControl.id,
      address1: 'No. 123, Jalan ABC',
      city: 'Shah Alam',
      state: 'Selangor',
      country: 'Malaysia',
      phone: '03-55551234',
      creditTermDays: 30,
      creditLimit: 50000,
    },
  });
  await prisma.customer.upsert({
    where: { code: 'C002' },
    update: {},
    create: {
      code: 'C002',
      name: 'XYZ Enterprise',
      controlAccountId: arControl.id,
      address1: 'No. 456, Jalan XYZ',
      city: 'Kuala Lumpur',
      country: 'Malaysia',
      phone: '03-22221234',
      creditTermDays: 45,
      creditLimit: 100000,
    },
  });
  console.log('✅ Sample customers created');

  // Sample Vendors
  await prisma.vendor.upsert({
    where: { code: 'V001' },
    update: {},
    create: {
      code: 'V001',
      name: 'Premier Supplies Sdn Bhd',
      controlAccountId: apControl.id,
      address1: 'No. 1, Jalan Supplier',
      city: 'Shah Alam',
      country: 'Malaysia',
      phone: '03-55559999',
      creditTermDays: 30,
    },
  });
  console.log('✅ Sample vendors created');

  // Note: Products require UOM which is user-defined - no sample products seeded

  // Document Series
  const docTypes = ['QUOTATION', 'SALES_ORDER', 'DELIVERY_ORDER', 'INVOICE', 'CASH_SALE', 'CREDIT_NOTE', 'PURCHASE_ORDER', 'GRN', 'PURCHASE_INVOICE', 'AR_INVOICE', 'AR_PAYMENT', 'AP_INVOICE', 'AP_PAYMENT', 'JOURNAL'];
  for (const docType of docTypes) {
    const prefix = docType.substring(0, 3).toUpperCase() + '-';
    await prisma.documentSeries.upsert({
      where: { documentType_seriesCode: { documentType: docType, seriesCode: 'DEFAULT' } },
      update: {},
      create: { documentType: docType, seriesCode: 'DEFAULT', prefix, nextNumber: 1, numberLength: 6, isDefault: true },
    });
  }
  console.log('✅ Document series created');

  // Journal Types
  await prisma.journalType.upsert({ where: { code: 'GJ' }, update: {}, create: { code: 'GJ', name: 'General Journal' } });
  await prisma.journalType.upsert({ where: { code: 'SJ' }, update: {}, create: { code: 'SJ', name: 'Sales Journal', isSystem: true } });
  await prisma.journalType.upsert({ where: { code: 'PJ' }, update: {}, create: { code: 'PJ', name: 'Purchase Journal', isSystem: true } });
  await prisma.journalType.upsert({ where: { code: 'CR' }, update: {}, create: { code: 'CR', name: 'Cash Receipt', isSystem: true } });
  await prisma.journalType.upsert({ where: { code: 'CP' }, update: {}, create: { code: 'CP', name: 'Cash Payment', isSystem: true } });
  console.log('✅ Journal types created');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
