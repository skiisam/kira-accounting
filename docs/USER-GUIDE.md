# 📖 KIRA Accounting - User Guide / Panduan Pengguna

> **Version / Versi:** 1.0  
> **Last Updated / Kemaskini:** February 2026

---

## 📋 Table of Contents / Kandungan

1. [Getting Started / Bermula](#1-getting-started--bermula)
2. [Master Data / Data Induk](#2-master-data--data-induk)
3. [Sales Workflow / Aliran Kerja Jualan](#3-sales-workflow--aliran-kerja-jualan)
4. [Purchase Workflow / Aliran Kerja Pembelian](#4-purchase-workflow--aliran-kerja-pembelian)
5. [Reports / Laporan](#5-reports--laporan)
6. [Settings / Tetapan](#6-settings--tetapan)

---

# 1. Getting Started / Bermula

## 1.1 Register Account / Daftar Akaun

### English
To start using KIRA Accounting, you need to create a new account:

1. Open the KIRA application in your browser
2. Click **"Register"** on the login page
3. Fill in the registration form:
   - **Full Name** - Your complete name
   - **Email** - Valid email address (used for login)
   - **Password** - Minimum 8 characters
   - **Confirm Password** - Re-enter your password
   - **Company Name** - Your business name
4. Click **"Register"** button
5. You will be redirected to the Setup Wizard

![Register Page](./screenshots/auth/register-page.png)

### Bahasa Malaysia
Untuk mula menggunakan KIRA Accounting, anda perlu mendaftar akaun baru:

1. Buka aplikasi KIRA di pelayar web anda
2. Klik **"Daftar"** di halaman log masuk
3. Isi borang pendaftaran:
   - **Nama Penuh** - Nama penuh anda
   - **Emel** - Alamat emel yang sah (untuk log masuk)
   - **Kata Laluan** - Minimum 8 aksara
   - **Sahkan Kata Laluan** - Masukkan semula kata laluan
   - **Nama Syarikat** - Nama perniagaan anda
4. Klik butang **"Daftar"**
5. Anda akan dibawa ke Wizard Persediaan

---

## 1.2 Setup Wizard Walkthrough / Panduan Wizard Persediaan

### English
After registration, the Setup Wizard helps you configure your company:

**Step 1: Company Information**
- Enter company registration number
- Business address
- Contact phone number
- Tax registration number (SST/GST if applicable)

**Step 2: Financial Settings**
- Select your fiscal year start month
- Choose base currency (default: MYR)
- Set decimal places for amounts

**Step 3: Chart of Accounts**
- Choose a preset template:
  - **Basic** - For small businesses
  - **Standard** - For SMEs
  - **Custom** - Create your own structure

**Step 4: Initial Data (Optional)**
- Import existing customers
- Import existing vendors
- Import products/inventory

![Setup Wizard](./screenshots/setup/setup-wizard.png)

### Bahasa Malaysia
Selepas pendaftaran, Wizard Persediaan membantu anda mengkonfigurasi syarikat:

**Langkah 1: Maklumat Syarikat**
- Masukkan nombor pendaftaran syarikat (SSM)
- Alamat perniagaan
- Nombor telefon
- Nombor pendaftaran cukai (SST/GST jika berkenaan)

**Langkah 2: Tetapan Kewangan**
- Pilih bulan permulaan tahun kewangan
- Pilih mata wang asas (lalai: MYR)
- Tetapkan tempat perpuluhan untuk jumlah

**Langkah 3: Carta Akaun**
- Pilih templat sedia ada:
  - **Asas** - Untuk perniagaan kecil
  - **Standard** - Untuk PKS
  - **Custom** - Cipta struktur sendiri

**Langkah 4: Data Awal (Pilihan)**
- Import pelanggan sedia ada
- Import pembekal sedia ada
- Import produk/inventori

---

## 1.3 Dashboard Overview / Gambaran Keseluruhan Dashboard

### English
The Dashboard is your home screen showing key business metrics:

**Key Sections:**

1. **Summary Cards** (Top row)
   - 📊 Total Revenue - Current month sales
   - 💰 Accounts Receivable - Outstanding customer payments
   - 📉 Total Expenses - Current month expenses
   - 💳 Accounts Payable - Outstanding supplier payments

2. **Sales Chart**
   - Visual graph of monthly sales trends
   - Compare current vs previous period

3. **Quick Actions**
   - Create new quotation
   - Create new invoice
   - Record payment

4. **Recent Transactions**
   - Latest invoices issued
   - Recent payments received
   - Pending approvals

![Dashboard](./screenshots/dashboard/dashboard-main.png)

### Bahasa Malaysia
Dashboard adalah skrin utama yang menunjukkan metrik penting perniagaan:

**Bahagian Utama:**

1. **Kad Ringkasan** (Baris atas)
   - 📊 Jumlah Hasil - Jualan bulan semasa
   - 💰 Akaun Belum Terima (AR) - Bayaran pelanggan tertunggak
   - 📉 Jumlah Perbelanjaan - Perbelanjaan bulan semasa
   - 💳 Akaun Belum Bayar (AP) - Bayaran kepada pembekal tertunggak

2. **Carta Jualan**
   - Graf visual trend jualan bulanan
   - Bandingkan tempoh semasa vs sebelumnya

3. **Tindakan Pantas**
   - Cipta sebut harga baru
   - Cipta invois baru
   - Rekod pembayaran

4. **Transaksi Terkini**
   - Invois terbaru yang dikeluarkan
   - Pembayaran terbaru yang diterima
   - Kelulusan yang menunggu

---

# 2. Master Data / Data Induk

## 2.1 Create Customers / Cipta Pelanggan

### English

**To add a new customer:**

1. Go to **Customers** menu in the sidebar
2. Click **"+ New Customer"** button
3. Fill in customer details:

**Basic Information Tab:**
| Field | Description |
|-------|-------------|
| Customer Code | Unique identifier (auto-generated or manual) |
| Customer Name | Company or individual name |
| Contact Person | Primary contact name |
| Phone | Contact number |
| Email | Email address |
| Address | Full business address |

**Financial Tab:**
| Field | Description |
|-------|-------------|
| Credit Limit | Maximum credit allowed |
| Credit Term | Payment terms (e.g., 30 days) |
| Currency | Default currency |
| Tax Code | Default tax rate |

4. Click **"Save"** to create the customer

![Customer Form](./screenshots/customers/customer-form.png)

### Bahasa Malaysia

**Untuk menambah pelanggan baru:**

1. Pergi ke menu **Pelanggan** di bar sisi
2. Klik butang **"+ Pelanggan Baru"**
3. Isi maklumat pelanggan:

**Tab Maklumat Asas:**
| Medan | Keterangan |
|-------|------------|
| Kod Pelanggan | Pengenalan unik (auto-jana atau manual) |
| Nama Pelanggan | Nama syarikat atau individu |
| Orang Hubungan | Nama kenalan utama |
| Telefon | Nombor telefon |
| Emel | Alamat emel |
| Alamat | Alamat perniagaan penuh |

**Tab Kewangan:**
| Medan | Keterangan |
|-------|------------|
| Had Kredit | Kredit maksimum dibenarkan |
| Terma Kredit | Terma pembayaran (cth: 30 hari) |
| Mata Wang | Mata wang lalai |
| Kod Cukai | Kadar cukai lalai |

4. Klik **"Simpan"** untuk mencipta pelanggan

---

## 2.2 Create Vendors / Cipta Pembekal

### English

**To add a new vendor/supplier:**

1. Go to **Vendors** menu in the sidebar
2. Click **"+ New Vendor"** button
3. Fill in vendor details:

**Basic Information Tab:**
| Field | Description |
|-------|-------------|
| Vendor Code | Unique identifier |
| Vendor Name | Supplier company name |
| Contact Person | Primary contact |
| Phone | Contact number |
| Email | Email address |
| Address | Business address |

**Financial Tab:**
| Field | Description |
|-------|-------------|
| Credit Term | Payment terms given by vendor |
| Currency | Default transaction currency |
| Bank Account | Vendor's bank details |
| Tax Registration | Vendor's tax number |

4. Click **"Save"** to create the vendor

![Vendor Form](./screenshots/vendors/vendor-form.png)

### Bahasa Malaysia

**Untuk menambah pembekal baru:**

1. Pergi ke menu **Pembekal** di bar sisi
2. Klik butang **"+ Pembekal Baru"**
3. Isi maklumat pembekal:

**Tab Maklumat Asas:**
| Medan | Keterangan |
|-------|------------|
| Kod Pembekal | Pengenalan unik |
| Nama Pembekal | Nama syarikat pembekal |
| Orang Hubungan | Kenalan utama |
| Telefon | Nombor telefon |
| Emel | Alamat emel |
| Alamat | Alamat perniagaan |

**Tab Kewangan:**
| Medan | Keterangan |
|-------|------------|
| Terma Kredit | Terma pembayaran dari pembekal |
| Mata Wang | Mata wang transaksi lalai |
| Akaun Bank | Butiran bank pembekal |
| Pendaftaran Cukai | Nombor cukai pembekal |

4. Klik **"Simpan"** untuk mencipta pembekal

---

## 2.3 Create Products / Cipta Produk

### English

**To add a new product/item:**

1. Go to **Products** menu in the sidebar
2. Click **"+ New Product"** button
3. Fill in product details:

**Basic Information:**
| Field | Description |
|-------|-------------|
| Product Code | Unique SKU/code |
| Product Description | Full product name/description |
| Product Group | Category for grouping |
| Base UOM | Base unit of measure (PCS, KG, etc.) |

**Pricing:**
| Field | Description |
|-------|-------------|
| Selling Price | Default selling price |
| Cost Price | Purchase/cost price |
| Tax Code | Default tax rate |

**Inventory:**
| Field | Description |
|-------|-------------|
| Track Inventory | Enable stock tracking (Yes/No) |
| Costing Method | FIFO / LIFO / Average |
| Reorder Level | Minimum stock alert threshold |
| Location | Default warehouse/location |

4. Click **"Save"** to create the product

![Product Form](./screenshots/products/product-form.png)

### Bahasa Malaysia

**Untuk menambah produk/item baru:**

1. Pergi ke menu **Produk** di bar sisi
2. Klik butang **"+ Produk Baru"**
3. Isi maklumat produk:

**Maklumat Asas:**
| Medan | Keterangan |
|-------|------------|
| Kod Produk | SKU/kod unik |
| Keterangan Produk | Nama/keterangan penuh produk |
| Kumpulan Produk | Kategori untuk pengumpulan |
| UOM Asas | Unit ukuran asas (PCS, KG, dll.) |

**Penentuan Harga:**
| Medan | Keterangan |
|-------|------------|
| Harga Jualan | Harga jualan lalai |
| Harga Kos | Harga pembelian/kos |
| Kod Cukai | Kadar cukai lalai |

**Inventori:**
| Medan | Keterangan |
|-------|------------|
| Jejak Inventori | Aktifkan penjejakan stok (Ya/Tidak) |
| Kaedah Pengekosan | FIFO / LIFO / Purata |
| Tahap Pesanan Semula | Ambang amaran stok minimum |
| Lokasi | Gudang/lokasi lalai |

4. Klik **"Simpan"** untuk mencipta produk

---

# 3. Sales Workflow / Aliran Kerja Jualan

The sales process in KIRA follows this flow / Proses jualan dalam KIRA mengikuti aliran ini:

```
Quotation → Sales Order → Delivery Order → Invoice → Payment
(Sebut Harga) → (Pesanan Jualan) → (Pesanan Penghantaran) → (Invois) → (Bayaran)
```

---

## 3.1 Create Quotation / Cipta Sebut Harga

### English

**A Quotation (QT) is a price offer to a potential customer.**

1. Go to **Sales** → **Quotations**
2. Click **"+ New Quotation"**
3. Fill in header information:
   - **Customer** - Select from dropdown
   - **Quotation Date** - Date of quotation
   - **Valid Until** - Expiry date of quote
   - **Reference** - Your reference number (optional)

4. Add line items:
   - Click **"Add Item"**
   - Select **Product** from dropdown
   - Enter **Quantity**
   - **Unit Price** auto-fills (can be modified)
   - **Discount** - Optional discount %
   - **Tax** - Auto-applies based on product

5. Review totals:
   - Subtotal
   - Tax Amount
   - Grand Total

6. Click **"Save"** (Draft) or **"Save & Print"**

![Quotation Form](./screenshots/sales/quotation-form.png)

### Bahasa Malaysia

**Sebut Harga (QT) adalah tawaran harga kepada bakal pelanggan.**

1. Pergi ke **Jualan** → **Sebut Harga**
2. Klik **"+ Sebut Harga Baru"**
3. Isi maklumat pengepala:
   - **Pelanggan** - Pilih dari senarai
   - **Tarikh Sebut Harga** - Tarikh sebut harga
   - **Sah Sehingga** - Tarikh tamat tempoh
   - **Rujukan** - Nombor rujukan anda (pilihan)

4. Tambah item barisan:
   - Klik **"Tambah Item"**
   - Pilih **Produk** dari senarai
   - Masukkan **Kuantiti**
   - **Harga Seunit** auto-isi (boleh diubah)
   - **Diskaun** - Diskaun % pilihan
   - **Cukai** - Auto-guna berdasarkan produk

5. Semak jumlah:
   - Jumlah Kecil
   - Amaun Cukai
   - Jumlah Besar

6. Klik **"Simpan"** (Draf) atau **"Simpan & Cetak"**

---

## 3.2 Transfer to Sales Order / Tukar ke Pesanan Jualan

### English

**A Sales Order (SO) is a confirmed order from the customer.**

1. Open an existing **Quotation** (status: Confirmed)
2. Click **"Transfer to Sales Order"** button at the top
3. The system creates a new Sales Order with:
   - All items copied from quotation
   - Customer details copied
   - Link to original quotation maintained

4. Review and modify if needed:
   - Adjust quantities
   - Change delivery date
   - Add special instructions

5. Click **"Confirm"** to activate the Sales Order

![Transfer to SO](./screenshots/sales/transfer-to-so.png)

### Bahasa Malaysia

**Pesanan Jualan (SO) adalah pesanan yang telah disahkan dari pelanggan.**

1. Buka **Sebut Harga** sedia ada (status: Disahkan)
2. Klik butang **"Tukar ke Pesanan Jualan"** di bahagian atas
3. Sistem akan mencipta Pesanan Jualan baru dengan:
   - Semua item disalin dari sebut harga
   - Maklumat pelanggan disalin
   - Pautan ke sebut harga asal dikekalkan

4. Semak dan ubah suai jika perlu:
   - Laras kuantiti
   - Tukar tarikh penghantaran
   - Tambah arahan khas

5. Klik **"Sahkan"** untuk mengaktifkan Pesanan Jualan

---

## 3.3 Transfer to Delivery Order / Tukar ke Pesanan Penghantaran

### English

**A Delivery Order (DO) records the physical shipment of goods.**

1. Open an existing **Sales Order** (status: Confirmed)
2. Click **"Transfer to Delivery Order"** button
3. The system creates a Delivery Order:
   - Select items to deliver (partial delivery allowed)
   - Enter actual quantities to ship
   - Add shipping details

4. Fill delivery information:
   - **Delivery Date** - Actual ship date
   - **Shipping Address** - Confirm or modify
   - **Tracking Number** - Optional

5. Click **"Confirm"** to process
   - ⚠️ This will **deduct stock** from inventory

![Transfer to DO](./screenshots/sales/transfer-to-do.png)

**💡 Tip:** You can create multiple DOs from one SO for partial deliveries.

### Bahasa Malaysia

**Pesanan Penghantaran (DO) merekod penghantaran fizikal barang.**

1. Buka **Pesanan Jualan** sedia ada (status: Disahkan)
2. Klik butang **"Tukar ke Pesanan Penghantaran"**
3. Sistem akan mencipta Pesanan Penghantaran:
   - Pilih item untuk dihantar (penghantaran separa dibenarkan)
   - Masukkan kuantiti sebenar untuk dihantar
   - Tambah butiran penghantaran

4. Isi maklumat penghantaran:
   - **Tarikh Penghantaran** - Tarikh hantar sebenar
   - **Alamat Penghantaran** - Sahkan atau ubah
   - **Nombor Penjejakan** - Pilihan

5. Klik **"Sahkan"** untuk memproses
   - ⚠️ Ini akan **menolak stok** dari inventori

**💡 Tip:** Anda boleh mencipta beberapa DO dari satu SO untuk penghantaran separa.

---

## 3.4 Create Invoice / Cipta Invois

### English

**An Invoice (INV) is the billing document sent to customer.**

**Method 1: From Delivery Order**
1. Open a confirmed **Delivery Order**
2. Click **"Transfer to Invoice"**
3. Review invoice details
4. Click **"Confirm"** to generate invoice

**Method 2: Direct Invoice (for services)**
1. Go to **Sales** → **Invoices**
2. Click **"+ New Invoice"**
3. Fill in details similar to quotation
4. Select invoice type: **Sales Invoice**
5. Confirm and save

**Invoice generates:**
- ✅ AR (Accounts Receivable) entry
- ✅ Revenue journal entry
- ✅ Tax liability (if applicable)

![Invoice Form](./screenshots/sales/invoice-form.png)

### Bahasa Malaysia

**Invois (INV) adalah dokumen pengebilan yang dihantar kepada pelanggan.**

**Kaedah 1: Dari Pesanan Penghantaran**
1. Buka **Pesanan Penghantaran** yang disahkan
2. Klik **"Tukar ke Invois"**
3. Semak butiran invois
4. Klik **"Sahkan"** untuk menjana invois

**Kaedah 2: Invois Langsung (untuk perkhidmatan)**
1. Pergi ke **Jualan** → **Invois**
2. Klik **"+ Invois Baru"**
3. Isi butiran seperti sebut harga
4. Pilih jenis invois: **Invois Jualan**
5. Sahkan dan simpan

**Invois menjana:**
- ✅ Catatan AR (Akaun Belum Terima)
- ✅ Catatan jurnal hasil
- ✅ Liabiliti cukai (jika berkenaan)

---

## 3.5 Receive Payment / Terima Bayaran

### English

**Recording customer payment (Official Receipt):**

1. Go to **AR** → **Receipts** (or click from invoice)
2. Click **"+ New Receipt"**
3. Fill in receipt details:
   - **Customer** - Select customer
   - **Receipt Date** - Payment date
   - **Payment Method** - Cash/Cheque/Bank Transfer/Card
   - **Bank Account** - Your receiving account
   - **Reference** - Cheque number or transfer ref

4. **Knock-off invoices:**
   - Select outstanding invoices to pay
   - Enter amount to apply to each invoice
   - Partial payments are allowed

5. Click **"Confirm"** to record payment

**Payment generates:**
- ✅ Bank/Cash account credited
- ✅ AR balance reduced
- ✅ Invoice status updated

![AR Receipt](./screenshots/ar/ar-receipt-form.png)

### Bahasa Malaysia

**Merekod bayaran pelanggan (Resit Rasmi):**

1. Pergi ke **AR** → **Resit** (atau klik dari invois)
2. Klik **"+ Resit Baru"**
3. Isi butiran resit:
   - **Pelanggan** - Pilih pelanggan
   - **Tarikh Resit** - Tarikh pembayaran
   - **Kaedah Pembayaran** - Tunai/Cek/Pemindahan Bank/Kad
   - **Akaun Bank** - Akaun penerima anda
   - **Rujukan** - Nombor cek atau rujukan pemindahan

4. **Knock-off invois:**
   - Pilih invois tertunggak untuk dibayar
   - Masukkan amaun untuk setiap invois
   - Pembayaran separa dibenarkan

5. Klik **"Sahkan"** untuk merekod pembayaran

**Pembayaran menjana:**
- ✅ Akaun Bank/Tunai dikreditkan
- ✅ Baki AR dikurangkan
- ✅ Status invois dikemaskini

---

# 4. Purchase Workflow / Aliran Kerja Pembelian

The purchase process in KIRA follows this flow / Proses pembelian dalam KIRA mengikut aliran ini:

```
Purchase Order → Goods Received Note → Purchase Invoice → Payment
(Pesanan Belian) → (Nota Terima Barang) → (Invois Belian) → (Bayaran)
```

---

## 4.1 Create Purchase Order / Cipta Pesanan Belian

### English

**A Purchase Order (PO) is an order placed to a vendor.**

1. Go to **Purchases** → **Purchase Orders**
2. Click **"+ New PO"**
3. Fill in header information:
   - **Vendor** - Select supplier
   - **PO Date** - Date of order
   - **Expected Delivery** - Estimated arrival date
   - **Reference** - Optional reference

4. Add line items:
   - Click **"Add Item"**
   - Select **Product** from dropdown
   - Enter **Quantity**
   - **Unit Cost** auto-fills from product master
   - **Tax** - Auto-applies

5. Review totals and click **"Save"** or **"Confirm"**

![PO Form](./screenshots/purchases/po-form.png)

### Bahasa Malaysia

**Pesanan Belian (PO) adalah pesanan yang dibuat kepada pembekal.**

1. Pergi ke **Pembelian** → **Pesanan Belian**
2. Klik **"+ PO Baru"**
3. Isi maklumat pengepala:
   - **Pembekal** - Pilih pembekal
   - **Tarikh PO** - Tarikh pesanan
   - **Jangkaan Penghantaran** - Anggaran tarikh tiba
   - **Rujukan** - Rujukan pilihan

4. Tambah item barisan:
   - Klik **"Tambah Item"**
   - Pilih **Produk** dari senarai
   - Masukkan **Kuantiti**
   - **Kos Seunit** auto-isi dari data induk produk
   - **Cukai** - Auto-guna

5. Semak jumlah dan klik **"Simpan"** atau **"Sahkan"**

---

## 4.2 Receive Goods (GRN) / Terima Barang (GRN)

### English

**A Goods Received Note (GRN) records physical receipt of items.**

1. Open a confirmed **Purchase Order**
2. Click **"Transfer to GRN"** button
3. The system creates a GRN:
   - Select items received (partial receipt allowed)
   - Enter actual quantities received
   - Note any discrepancies

4. Fill receiving information:
   - **GRN Date** - Actual receipt date
   - **DO Number** - Vendor's delivery order reference
   - **Remarks** - Any notes about condition

5. Click **"Confirm"** to process
   - ⚠️ This will **add stock** to inventory

![GRN Form](./screenshots/purchases/grn-form.png)

**💡 Tip:** You can create multiple GRNs from one PO for partial deliveries.

### Bahasa Malaysia

**Nota Terima Barang (GRN) merekod penerimaan fizikal item.**

1. Buka **Pesanan Belian** yang disahkan
2. Klik butang **"Tukar ke GRN"**
3. Sistem akan mencipta GRN:
   - Pilih item yang diterima (penerimaan separa dibenarkan)
   - Masukkan kuantiti sebenar yang diterima
   - Catat sebarang percanggahan

4. Isi maklumat penerimaan:
   - **Tarikh GRN** - Tarikh terima sebenar
   - **Nombor DO** - Rujukan pesanan penghantaran pembekal
   - **Catatan** - Sebarang nota tentang keadaan

5. Klik **"Sahkan"** untuk memproses
   - ⚠️ Ini akan **menambah stok** ke inventori

**💡 Tip:** Anda boleh mencipta beberapa GRN dari satu PO untuk penghantaran separa.

---

## 4.3 Enter Purchase Invoice / Masukkan Invois Belian

### English

**A Purchase Invoice (PI) is the vendor's bill to you.**

**Method 1: From GRN**
1. Open a confirmed **GRN**
2. Click **"Transfer to Purchase Invoice"**
3. Enter vendor's invoice details:
   - **Vendor Invoice No** - As stated on their invoice
   - **Invoice Date** - Date on vendor's invoice
4. Review and confirm

**Method 2: Direct Entry**
1. Go to **Purchases** → **Purchase Invoices**
2. Click **"+ New PI"**
3. Fill in all details manually
4. Confirm and save

**Purchase Invoice generates:**
- ✅ AP (Accounts Payable) entry
- ✅ Expense/Asset journal entry
- ✅ Tax credit (if applicable)

![PI Form](./screenshots/purchases/pi-form.png)

### Bahasa Malaysia

**Invois Belian (PI) adalah bil pembekal kepada anda.**

**Kaedah 1: Dari GRN**
1. Buka **GRN** yang disahkan
2. Klik **"Tukar ke Invois Belian"**
3. Masukkan butiran invois pembekal:
   - **No. Invois Pembekal** - Seperti tercatat pada invois mereka
   - **Tarikh Invois** - Tarikh pada invois pembekal
4. Semak dan sahkan

**Kaedah 2: Kemasukan Langsung**
1. Pergi ke **Pembelian** → **Invois Belian**
2. Klik **"+ PI Baru"**
3. Isi semua butiran secara manual
4. Sahkan dan simpan

**Invois Belian menjana:**
- ✅ Catatan AP (Akaun Belum Bayar)
- ✅ Catatan jurnal perbelanjaan/aset
- ✅ Kredit cukai (jika berkenaan)

---

## 4.4 Make Payment / Buat Pembayaran

### English

**Recording payment to vendor (Payment Voucher):**

1. Go to **AP** → **Payments** (or click from invoice)
2. Click **"+ New Payment"**
3. Fill in payment details:
   - **Vendor** - Select vendor
   - **Payment Date** - Date of payment
   - **Payment Method** - Cheque/Bank Transfer/Cash
   - **Bank Account** - Your paying account
   - **Cheque No** - If paying by cheque

4. **Knock-off invoices:**
   - Select outstanding invoices to pay
   - Enter amount to apply to each invoice
   - Partial payments are allowed

5. Click **"Confirm"** to record payment

**Payment generates:**
- ✅ Bank/Cash account debited
- ✅ AP balance reduced
- ✅ Invoice status updated

![AP Payment](./screenshots/ap/ap-payment-form.png)

### Bahasa Malaysia

**Merekod bayaran kepada pembekal (Baucar Pembayaran):**

1. Pergi ke **AP** → **Pembayaran** (atau klik dari invois)
2. Klik **"+ Pembayaran Baru"**
3. Isi butiran pembayaran:
   - **Pembekal** - Pilih pembekal
   - **Tarikh Pembayaran** - Tarikh pembayaran
   - **Kaedah Pembayaran** - Cek/Pemindahan Bank/Tunai
   - **Akaun Bank** - Akaun pembayaran anda
   - **No. Cek** - Jika membayar dengan cek

4. **Knock-off invois:**
   - Pilih invois tertunggak untuk dibayar
   - Masukkan amaun untuk setiap invois
   - Pembayaran separa dibenarkan

5. Klik **"Sahkan"** untuk merekod pembayaran

**Pembayaran menjana:**
- ✅ Akaun Bank/Tunai didebitkan
- ✅ Baki AP dikurangkan
- ✅ Status invois dikemaskini

---

# 5. Reports / Laporan

## How to Run Reports / Cara Menjalankan Laporan

### English

**Accessing Reports:**

1. Go to **Reports** menu in the sidebar
2. Select report category:
   - 📊 **Financial Reports** - GL related
   - 💰 **Sales Reports** - Customer & sales analysis
   - 📦 **Inventory Reports** - Stock related
   - 🏢 **AR/AP Reports** - Receivables & payables

**Available Reports:**

| Report | Description |
|--------|-------------|
| **Trial Balance** | Lists all accounts with debit/credit balances |
| **Profit & Loss** | Revenue minus expenses = Net profit |
| **Balance Sheet** | Assets = Liabilities + Equity |
| **Stock Balance** | Current inventory quantities and values |
| **Customer Aging** | AR aging by customer (30/60/90 days) |
| **Vendor Aging** | AP aging by vendor |
| **Sales Summary** | Sales by period/customer/product |
| **Purchase Summary** | Purchases by period/vendor/product |

**Running a Report:**

1. Select the report type
2. Set date range (From - To)
3. Apply filters if needed:
   - Customer/Vendor
   - Product group
   - Account range
4. Click **"Generate Report"**
5. View on screen or **"Export"** to PDF/Excel

![Reports Page](./screenshots/reports/reports-main.png)

### Bahasa Malaysia

**Mengakses Laporan:**

1. Pergi ke menu **Laporan** di bar sisi
2. Pilih kategori laporan:
   - 📊 **Laporan Kewangan** - Berkaitan GL
   - 💰 **Laporan Jualan** - Analisis pelanggan & jualan
   - 📦 **Laporan Inventori** - Berkaitan stok
   - 🏢 **Laporan AR/AP** - Penghutang & pemiutang

**Laporan Tersedia:**

| Laporan | Keterangan |
|---------|------------|
| **Imbangan Duga** | Senarai semua akaun dengan baki debit/kredit |
| **Untung & Rugi** | Hasil tolak perbelanjaan = Untung bersih |
| **Kunci Kira-kira** | Aset = Liabiliti + Ekuiti |
| **Baki Stok** | Kuantiti dan nilai inventori semasa |
| **Aging Pelanggan** | Aging AR mengikut pelanggan (30/60/90 hari) |
| **Aging Pembekal** | Aging AP mengikut pembekal |
| **Ringkasan Jualan** | Jualan mengikut tempoh/pelanggan/produk |
| **Ringkasan Belian** | Belian mengikut tempoh/pembekal/produk |

**Menjalankan Laporan:**

1. Pilih jenis laporan
2. Tetapkan julat tarikh (Dari - Hingga)
3. Guna penapis jika perlu:
   - Pelanggan/Pembekal
   - Kumpulan produk
   - Julat akaun
4. Klik **"Jana Laporan"**
5. Lihat di skrin atau **"Eksport"** ke PDF/Excel

---

# 6. Settings / Tetapan

## 6.1 Company Settings / Tetapan Syarikat

### English

**To configure company settings:**

1. Go to **Settings** → **Company**
2. Update company information:
   - **Company Name** - Legal business name
   - **Registration No** - SSM number
   - **Tax ID** - SST/GST number
   - **Address** - Registered address
   - **Phone/Email** - Contact details
   - **Logo** - Upload company logo (appears on documents)

3. **Document Settings:**
   - Invoice prefix (e.g., INV-)
   - Auto-numbering format
   - Default terms and conditions

4. Click **"Save Changes"**

![Company Settings](./screenshots/settings/company-settings.png)

### Bahasa Malaysia

**Untuk mengkonfigurasi tetapan syarikat:**

1. Pergi ke **Tetapan** → **Syarikat**
2. Kemaskini maklumat syarikat:
   - **Nama Syarikat** - Nama perniagaan sah
   - **No. Pendaftaran** - Nombor SSM
   - **ID Cukai** - Nombor SST/GST
   - **Alamat** - Alamat berdaftar
   - **Telefon/Emel** - Butiran kenalan
   - **Logo** - Muat naik logo syarikat (muncul pada dokumen)

3. **Tetapan Dokumen:**
   - Awalan invois (cth: INV-)
   - Format penomboran automatik
   - Terma dan syarat lalai

4. Klik **"Simpan Perubahan"**

---

## 6.2 Users and Permissions / Pengguna dan Kebenaran

### English

**Managing users:**

1. Go to **Settings** → **Users**
2. View list of all users in your company
3. Click **"+ Add User"** to create new user

**User Setup:**
| Field | Description |
|-------|-------------|
| Name | User's full name |
| Email | Login email (must be unique) |
| Role | Admin / Manager / User / View Only |
| Password | Initial password (user can change later) |

**Permission Levels:**
| Role | Permissions |
|------|-------------|
| **Admin** | Full access - all modules and settings |
| **Manager** | Create, edit, approve - no settings access |
| **User** | Create, edit own documents only |
| **View Only** | Read-only access to reports |

**To edit permissions:**
1. Click on a user
2. Go to **Permissions** tab
3. Toggle access for each module
4. Save changes

![User Management](./screenshots/settings/user-management.png)

### Bahasa Malaysia

**Menguruskan pengguna:**

1. Pergi ke **Tetapan** → **Pengguna**
2. Lihat senarai semua pengguna dalam syarikat anda
3. Klik **"+ Tambah Pengguna"** untuk mencipta pengguna baru

**Persediaan Pengguna:**
| Medan | Keterangan |
|-------|------------|
| Nama | Nama penuh pengguna |
| Emel | Emel log masuk (mesti unik) |
| Peranan | Admin / Pengurus / Pengguna / Lihat Sahaja |
| Kata Laluan | Kata laluan awal (pengguna boleh tukar kemudian) |

**Tahap Kebenaran:**
| Peranan | Kebenaran |
|---------|-----------|
| **Admin** | Akses penuh - semua modul dan tetapan |
| **Pengurus** | Cipta, edit, luluskan - tiada akses tetapan |
| **Pengguna** | Cipta, edit dokumen sendiri sahaja |
| **Lihat Sahaja** | Akses baca sahaja untuk laporan |

**Untuk edit kebenaran:**
1. Klik pada pengguna
2. Pergi ke tab **Kebenaran**
3. Togol akses untuk setiap modul
4. Simpan perubahan

---

## 6.3 Chart of Accounts / Carta Akaun

### English

**Managing your Chart of Accounts:**

1. Go to **Settings** → **Chart of Accounts** (or **Accounts** menu)
2. View hierarchical list of all accounts

**Account Structure:**
```
1000-1999: Assets / Aset
2000-2999: Liabilities / Liabiliti  
3000-3999: Equity / Ekuiti
4000-4999: Revenue / Hasil
5000-5999: Cost of Sales / Kos Jualan
6000-6999: Expenses / Perbelanjaan
```

**To add a new account:**
1. Click **"+ New Account"**
2. Fill in details:
   - **Account Number** - Unique code
   - **Account Name** - Descriptive name
   - **Account Type** - Asset/Liability/Equity/Revenue/Expense
   - **Parent Account** - For sub-accounts (optional)
   - **Special Type** - Bank/AR/AP/Tax etc. (if applicable)

3. Click **"Save"**

**Account Types:**
| Type | Normal Balance | Example |
|------|----------------|---------|
| Asset | Debit | Bank, AR, Inventory |
| Liability | Credit | AP, Loans, Tax Payable |
| Equity | Credit | Capital, Retained Earnings |
| Revenue | Credit | Sales, Interest Income |
| Expense | Debit | Rent, Utilities, Salaries |

![Chart of Accounts](./screenshots/settings/chart-of-accounts.png)

### Bahasa Malaysia

**Menguruskan Carta Akaun anda:**

1. Pergi ke **Tetapan** → **Carta Akaun** (atau menu **Akaun**)
2. Lihat senarai hierarki semua akaun

**Struktur Akaun:**
```
1000-1999: Aset
2000-2999: Liabiliti
3000-3999: Ekuiti
4000-4999: Hasil
5000-5999: Kos Jualan
6000-6999: Perbelanjaan
```

**Untuk menambah akaun baru:**
1. Klik **"+ Akaun Baru"**
2. Isi butiran:
   - **Nombor Akaun** - Kod unik
   - **Nama Akaun** - Nama deskriptif
   - **Jenis Akaun** - Aset/Liabiliti/Ekuiti/Hasil/Perbelanjaan
   - **Akaun Induk** - Untuk sub-akaun (pilihan)
   - **Jenis Khas** - Bank/AR/AP/Cukai dll. (jika berkenaan)

3. Klik **"Simpan"**

**Jenis Akaun:**
| Jenis | Baki Normal | Contoh |
|-------|-------------|--------|
| Aset | Debit | Bank, AR, Inventori |
| Liabiliti | Kredit | AP, Pinjaman, Cukai Kena Bayar |
| Ekuiti | Kredit | Modal, Pendapatan Terkumpul |
| Hasil | Kredit | Jualan, Pendapatan Faedah |
| Perbelanjaan | Debit | Sewa, Utiliti, Gaji |

---

# 📞 Need Help? / Perlukan Bantuan?

### English
- **Email Support:** support@kira-accounting.com
- **Documentation:** https://docs.kira-accounting.com
- **Video Tutorials:** https://youtube.com/kira-accounting

### Bahasa Malaysia
- **Sokongan Emel:** support@kira-accounting.com
- **Dokumentasi:** https://docs.kira-accounting.com
- **Tutorial Video:** https://youtube.com/kira-accounting

---

*© 2026 KIRA Accounting. All rights reserved. / Hak cipta terpelihara.*
