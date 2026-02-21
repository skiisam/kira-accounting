# TRAE Accounting

A full-featured business accounting software with 99% feature parity to AutoCount Accounting 2.2.

## Features

### Core Modules
- **General Ledger (G/L)** - Chart of Accounts, Journal Entries, Trial Balance, P&L, Balance Sheet
- **Accounts Receivable (A/R)** - Customer management, AR Invoices, Payments, Aging, Statements
- **Accounts Payable (A/P)** - Vendor management, AP Invoices, Payments, Aging, Statements
- **Sales** - Quotations → Sales Orders → Delivery Orders → Invoices → Cash Sales → Credit Notes
- **Purchase** - Purchase Orders → Goods Received Notes → Purchase Invoices
- **Stock/Inventory** - Multi-location, Stock Receive/Issue/Transfer/Adjustment, BOM, Stock Take
- **Reports** - 40+ built-in reports with export capability

### Key Capabilities
- Multi-currency support with exchange rate management
- Tax management (SST/GST ready)
- Multi-location inventory
- Batch and serial number tracking
- Document transfer workflow (QT → SO → DO → INV)
- User access control with permission groups
- Audit trail
- Fiscal year management

## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js + TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL (or SQL Server)
- **Auth:** JWT

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **State:** Zustand + React Query
- **Forms:** React Hook Form
- **UI:** Headless UI + Heroicons

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or SQL Server 2016+)
- pnpm/npm/yarn

### Installation

1. **Clone and install:**
```bash
cd ~/Projects/trae-accounting

# Backend
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run db:generate
npm run db:push
npm run db:seed  # Optional: seed sample data

# Frontend
cd ../frontend
npm install
```

2. **Configure database:**
Edit `backend/.env`:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/trae_accounting"
```

3. **Run development servers:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

4. **Access the app:**
- Frontend: http://localhost:3000
- API: http://localhost:3001/api/v1
- Default login: `ADMIN` / `changeme`

## Project Structure

```
trae-accounting/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── config/            # Configuration
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, error handling
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utilities
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API client
│   │   ├── store/             # State management
│   │   └── types/             # TypeScript types
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Current user

### Masters
- `/api/v1/customers` - Customer CRUD
- `/api/v1/vendors` - Vendor CRUD
- `/api/v1/products` - Product CRUD
- `/api/v1/accounts` - Chart of Accounts

### Transactions
- `/api/v1/sales/*` - Sales documents
- `/api/v1/purchases/*` - Purchase documents
- `/api/v1/ar/*` - AR transactions
- `/api/v1/ap/*` - AP transactions
- `/api/v1/stock/*` - Stock transactions
- `/api/v1/journals` - Journal entries

### Reports
- `/api/v1/reports/gl/*` - GL reports
- `/api/v1/reports/ar/*` - AR reports
- `/api/v1/reports/ap/*` - AP reports
- `/api/v1/reports/sales/*` - Sales reports
- `/api/v1/reports/stock/*` - Stock reports

### Settings
- `/api/v1/settings/*` - System configuration

## Document Flow

```
SALES:
Quotation → Sales Order → Delivery Order → Invoice
                                        ↘ Credit Note

PURCHASE:
Purchase Order → Goods Received Note → Purchase Invoice

AR:
Sales Invoice → AR Invoice → Customer Payment (Official Receipt)

AP:
Purchase Invoice → AP Invoice → Vendor Payment (Payment Voucher)
```

## Development

### Adding a new module

1. Create Prisma model in `schema.prisma`
2. Run `npm run db:generate` and `npm run db:push`
3. Create controller in `src/controllers/`
4. Create routes in `src/routes/`
5. Add to main router in `src/routes/index.ts`
6. Create frontend pages in `frontend/src/pages/`
7. Add routes in `frontend/src/App.tsx`

### Database migrations

```bash
# Generate migration
npm run db:migrate -- --name <migration_name>

# Apply migrations
npm run db:push
```

## License

Proprietary - TRAE Accounting

## Related Documentation

See `~/.openclaw/workspace/accounting-app/` for detailed specifications:
- `01-database-schema.md` - Full database design
- `02-business-rules.md` - Business logic rules
- `03-ui-specifications.md` - UI/UX specs
- `04-api-specifications.md` - API documentation
- `05-reports-specification.md` - Report specifications
