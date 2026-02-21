# TRAE Accounting - Architecture Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React Frontend (SPA)                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │  Pages   │ │Components│ │  Store   │ │ API Service  │   │   │
│  │  │ (Views)  │ │(Reusable)│ │(Zustand) │ │(Axios+Query) │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Express.js + TypeScript                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │  Routes  │ │Controllers│ │Services  │ │ Middleware   │   │   │
│  │  │(Endpoints)│ │(Handlers)│ │(Business)│ │(Auth/Error)  │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Prisma ORM
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                PostgreSQL / SQL Server                       │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  Masters: Company, Users, Customers, Vendors, Products │   │   │
│  │  │  GL: Accounts, Journals, Account Types                  │   │   │
│  │  │  AR: Invoices, Payments, Knockoffs                      │   │   │
│  │  │  AP: Invoices, Payments, Knockoffs                      │   │   │
│  │  │  Sales: Headers, Details (QT/SO/DO/INV/CN)              │   │   │
│  │  │  Purchase: Headers, Details (PO/GRN/PI)                 │   │   │
│  │  │  Stock: Transactions, Product Locations                 │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Structure

```
┌────────────────────────────────────────────────────────────────────┐
│                         TRAE ACCOUNTING                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │   SALES     │  │  PURCHASE   │  │   STOCK     │                │
│  │             │  │             │  │             │                │
│  │ • Quotation │  │ • PO        │  │ • Receive   │                │
│  │ • Sales Ord │  │ • GRN       │  │ • Issue     │                │
│  │ • Deliv Ord │  │ • PI        │  │ • Transfer  │                │
│  │ • Invoice   │  │ • Cash Pur  │  │ • Adjust    │                │
│  │ • Cash Sale │  │             │  │ • Stock Take│                │
│  │ • Credit Nt │  │             │  │ • Assembly  │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                │
│         │                │                │                        │
│         ▼                ▼                ▼                        │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │                  GENERAL LEDGER                          │      │
│  │                                                          │      │
│  │   Chart of Accounts ──► Journal Entries ──► Reports      │      │
│  │         ▲                     ▲                          │      │
│  └─────────┼─────────────────────┼──────────────────────────┘      │
│            │                     │                                  │
│  ┌─────────┴──────┐  ┌───────────┴───────┐                        │
│  │      A/R       │  │       A/P         │                        │
│  │                │  │                   │                        │
│  │ • AR Invoice   │  │ • AP Invoice      │                        │
│  │ • Receipt      │  │ • Payment Voucher │                        │
│  │ • Credit Note  │  │ • Debit Note      │                        │
│  │ • Debit Note   │  │ • Credit Note     │                        │
│  │ • Contra       │  │ • Contra          │                        │
│  └────────────────┘  └───────────────────┘                        │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Document Flow

```
SALES FLOW:
═══════════════════════════════════════════════════════════════════

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │Quotation │────►│  Sales   │────►│ Delivery │────►│ Invoice  │
  │   (QT)   │     │  Order   │     │  Order   │     │  (INV)   │
  │          │     │  (SO)    │     │  (DO)    │     │          │
  └──────────┘     └──────────┘     └────┬─────┘     └────┬─────┘
                                         │                │
                                   Stock Out         AR Invoice
                                         │                │
                                         ▼                ▼
                                   ┌──────────┐     ┌──────────┐
                                   │  Stock   │     │  Receipt │
                                   │ Updated  │     │   (OR)   │
                                   └──────────┘     └──────────┘


PURCHASE FLOW:
═══════════════════════════════════════════════════════════════════

  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Purchase │────►│   GRN    │────►│ Purchase │
  │  Order   │     │          │     │ Invoice  │
  │  (PO)    │     │          │     │  (PI)    │
  └──────────┘     └────┬─────┘     └────┬─────┘
                        │                │
                   Stock In         AP Invoice
                        │                │
                        ▼                ▼
                   ┌──────────┐     ┌──────────┐
                   │  Stock   │     │ Payment  │
                   │ Updated  │     │  (PV)    │
                   └──────────┘     └──────────┘
```

## Database ERD (Simplified)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Customer  │       │    Vendor   │       │   Product   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ code        │       │ code        │       │ code        │
│ name        │       │ name        │       │ description │
│ address     │       │ address     │       │ groupId     │
│ creditLimit │       │ creditTerm  │       │ baseUOMId   │
│ currencyCode│       │ currencyCode│       │ costingMethod│
└──────┬──────┘       └──────┬──────┘       │ sellingPrice│
       │                     │              └──────┬──────┘
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ SalesHeader │       │PurchaseHeader│      │ProductLocation│
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ productId   │
│ documentType│       │ documentType│       │ locationId  │
│ documentNo  │       │ documentNo  │       │ balanceQty  │
│ customerId  │       │ vendorId    │       │ reservedQty │
│ netTotal    │       │ netTotal    │       └─────────────┘
│ status      │       │ status      │
└──────┬──────┘       └──────┬──────┘
       │                     │
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│ SalesDetail │       │PurchaseDetail│
├─────────────┤       ├─────────────┤
│ salesId     │       │ purchaseId  │
│ productId   │       │ productId   │
│ quantity    │       │ quantity    │
│ unitPrice   │       │ unitPrice   │
│ taxAmount   │       │ taxAmount   │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│   Account   │◄──────│JournalEntry │
├─────────────┤       ├─────────────┤
│ id          │       │ id          │
│ accountNo   │       │ journalNo   │
│ name        │       │ journalDate │
│ typeId      │       │ totalDebit  │
│ parentId    │       │ totalCredit │
│ specialType │       │ isPosted    │
└─────────────┘       └──────┬──────┘
                             │
                             ▼
                      ┌─────────────┐
                      │JournalDetail│
                      ├─────────────┤
                      │ journalId   │
                      │ accountId   │
                      │ debitAmount │
                      │ creditAmount│
                      └─────────────┘
```

## Technology Stack

```
┌────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                    │
├────────────────────────────────────────────────────────────────────┤
│  React 18        │ Component-based UI framework                    │
│  TypeScript      │ Type safety                                     │
│  Vite            │ Fast build tool                                 │
│  Tailwind CSS    │ Utility-first styling                          │
│  React Query     │ Server state management                         │
│  Zustand         │ Client state management                         │
│  React Hook Form │ Form handling                                   │
│  React Router    │ Client-side routing                             │
│  Heroicons       │ Icon library                                    │
│  Recharts        │ Charts and graphs                               │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         BACKEND                                     │
├────────────────────────────────────────────────────────────────────┤
│  Node.js 18+     │ JavaScript runtime                              │
│  Express.js      │ Web framework                                   │
│  TypeScript      │ Type safety                                     │
│  Prisma          │ ORM / Database toolkit                          │
│  JWT             │ Authentication                                  │
│  bcrypt          │ Password hashing                                │
│  Zod             │ Runtime validation                              │
│  Winston         │ Logging                                         │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         DATABASE                                    │
├────────────────────────────────────────────────────────────────────┤
│  PostgreSQL 14+  │ Primary database (recommended)                  │
│  SQL Server 2016+│ Alternative database option                     │
└────────────────────────────────────────────────────────────────────┘
```
