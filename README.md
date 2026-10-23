# AI-Powered Mobile Accessories Billing & Inventory Management Web Application

A complete, production-ready, mobile-first web application designed specifically for mobile accessories retail shops in India. Optimized for Android phone browsers with installable PWA support, instant WhatsApp invoice sharing, AI natural language billing, and real-time stock ledger deduction.

---

## 🚀 Live Demo & Accounts

The web application is live and running on `http://localhost:3000`.

### Pre-Configured Accounts

| Account | Email | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **Shop Owner / Admin** | `owner@shop.com` | `Owner@123` | **Full Access**: Products, wholesale buy costs, profit valuation, employee tracking, settings, stock adjustments, refunds. |
| **Cashier / Staff** | `cashier@shop.com` | `Cashier@123` | **Restricted Access**: Fast billing, WhatsApp sharing, customer lookup, stock checking, authorized sales history. |

*Note: You can also use the convenient 1-tap "Owner Login" and "Cashier Login" buttons on the sign-in screen.*

---

## 📱 Mobile-First Features

### 1. Fast Mobile POS Billing
- **Customer Autocomplete**: Search existing customers by phone or name, or bill walk-in customers instantly.
- **Instant Product Search**: Filter catalog by category (Tempered Glass, Mobile Covers, Fast Chargers, Type-C Cables, Audio/Earbuds, Mounts) or search by phone model (e.g. *iPhone 15*, *Samsung S24*, *Redmi Note 13*), barcode, or SKU.
- **Stock Counter Badges**: Live indicators (Green = In Stock, Amber = Low Stock, Red = Out of Stock).
- **Cart Sheet**: Quantity steppers (+ / -), editable unit prices, bill-level discounts, GST toggle (retail receipt vs tax invoice).
- **Payment Modes**: Cash, UPI (GPay / PhonePe / Paytm QR), Card, and Store Credit (Khata).
- **Atomic Stock Deduction**: Finalizing an invoice atomically decrements inventory and logs permanent ledger entries.

### 2. AI-Powered Natural Language Billing
- **Speech or Text Input**: Dictate or type natural language prompts such as:
  > *"Create a bill for Rahul 9876543210: two Type-C cables at ₹120 each, one phone cover at ₹250, and one tempered glass at ₹150. Apply a ₹50 discount. Payment by UPI."*
- **Catalog Fuzzy Matching**: Matches spoken accessory names against available catalog products.
- **Price Override & Ambiguity Flagging**: Highlights if multiple compatible screen guards or covers exist.
- **Deterministic Math**: Calculates subtotals, taxes, discounts, and grand totals deterministically in code.
- **1-Tap Checkout**: Inspect and transfer AI-generated bill directly into the cart.

### 3. Professional Invoices & Instant WhatsApp Sharing
- **Indian Retail & Tax Invoices**: Generates formatted receipts with shop logo, address, phone, GSTIN, cashier name, customer details, CGST/SGST breakdown, and UPI ID payment QR code.
- **1-Tap WhatsApp Share**: Automatically generates a formatted WhatsApp receipt and opens `https://wa.me/91XXXXXXXXXX?text=...` directly.
- **Android Web Share API**: Shares the generated PDF file directly into WhatsApp or other Android apps.
- **Thermal & A4 Print**: Supports 58mm/80mm Bluetooth thermal POS receipt printers and standard desktop printers.

### 4. Stock In / Purchase Receiving
- **Supplier Receipts**: Select wholesaler (e.g. *Apex Wholesale Chennai*, *Star Tech Distributors*), enter supplier invoice # and date.
- **Multi-Item Entry**: Receive multiple products in a single invoice, update latest purchase costs, and automatically restock quantities.

### 5. Daily Stock Movement Ledger
- **Permanent Ledger Equation**:
  $$\text{Closing Stock} = \text{Opening Stock} + \text{Received} + \text{Returns} - \text{Sold} - \text{Damaged} \pm \text{Adjustments}$$
- **Comprehensive Daily Report**: Displays Opening, Received, Sold, Returns, Loss, Adjustments, Closing Stock, and Cost Valuation.
- **Executive WhatsApp Summary**: 1-tap button sends the daily stock & sales summary to the owner's WhatsApp.
- **CSV / Excel Export**: Download complete reports for accounting and tax filing.

### 6. Inventory Control, Auditing & Customer Returns
- **Physical Count Audit**: Enter shelf counts, calculate discrepancies, record reasons, and authorize adjustments.
- **Customer Returns**: Inspect item condition before restocking (Sellable = restocked, Damaged = scrapped).
- **Controlled Cancellation**: Owner or authorized staff can cancel bills with an audit reason, atomically restocking items.

### 7. Progressive Web App (PWA)
- Installable on Android smartphones via Google Chrome ("Add to Home screen").
- Fullscreen app experience with app icon, theme color (`#10b981`), and offline static asset caching via Service Worker.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Invoice Engine**: jsPDF, Canvas rendering, Web Share API.
- **Centralized Database**:
  - Cloud PostgreSQL via Supabase (see `supabase_schema.sql` for full DDL, RLS, and indexes).
  - Built-in persistent store with atomic file transactions for instant offline/local execution.
- **AI Engine**: Google Gemini API (`GEMINI_API_KEY`) with intelligent fallback rule-based mobile accessory parser.

---

## 📦 Getting Started

### Local Development
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start the web server
npm start
```
The application will be running at `http://localhost:3000`.

---

## 📱 Android Phone Deployment Guide (10 Minutes)

A shop owner can deploy and manage this entire application using only their Android phone:

1. **Supabase Database Setup**:
   - Open `supabase.com` on phone browser and create a free project.
   - Go to **SQL Editor**, paste the contents of `supabase_schema.sql`, and tap **Run**.
   - Copy `Project URL` and `anon key` from **Project Settings > API**.

2. **One-Click Deploy on Vercel**:
   - Push or import this repository to GitHub.
   - Open `vercel.com` on phone browser, select the repository, and add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `GEMINI_API_KEY` (optional)
   - Tap **Deploy**. You will receive an HTTPS production URL (e.g. `https://mobile-shop.vercel.app`).

3. **Install on Phone**:
   - Open the live URL in Chrome on Android.
   - Tap **"Install App"** banner or Chrome menu (3 dots) > **"Add to Home screen"**.
   - Launch the app from the Android Home Screen like a native app!
