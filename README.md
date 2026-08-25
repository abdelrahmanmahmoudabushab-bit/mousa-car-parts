# 🚗 Mousa Car Parts (موسى لقطع السيارات)
### Inventory & Counter POS System for BYD OEM Auto Parts

A high-performance, mobile-responsive **Full-Stack POS & Inventory Management System** built with **React**, **Vite**, **Express**, and **Supabase (PostgreSQL)**.

Designed specifically for BYD OEM auto parts distributors, counter cashiers, warehouse managers, and online retail customers.

---

## 🌟 Key Features

### 🛒 1. Counter POS Checkout Terminal
* **Fast OEM & VIN Search**: Search by OEM part code, VIN chassis number, or Arabic part name (*فحمات، صدام، هوبات*).
* **Mobile-Responsive Cashier Switcher**: Single-thumb view switcher on mobile devices (`🔍 Catalog` vs `🛒 Cart`).
* **Stock Protection**: Prevents adding items beyond available warehouse quantity.
* **Thermal Receipt Printing**: 80mm receipt generation with barcode, store branding, and item breakdown.

### 📦 2. BYD OEM Inventory Directory
* **7,900+ OEM Parts Catalog**: Searchable directory filtered by vehicle model (*Seagull, Dolphin, Atto 3, Tang, Han*), category, and year range.
* **Spreadsheet Grid View**: Real-time margin calculation, cost/retail pricing, and shelf location tracking.
* **Excel Export**: 1-click export of filtered inventory to `.csv`.

### 📥 3. Batch Stock Import & AI Translation
* **PDF & Excel Import**: Parse supplier invoices automatically to extract OEM codes, costs, and quantities.
* **Chinese-to-Arabic Auto Translation**: Converts raw factory specifications into clean Arabic part names.
* **Multi-Currency Conversion**: Convert invoice prices from USD, CNY, or SAR with custom markup percentages.

### 📜 4. Sales Log & Returns
* **Transaction History**: View cash, credit card, and online sales logs.
* **Restocking Returns**: Return items with reason logging and automatic inventory restocking.

### 👥 5. Security & Roles
* **Role Permissions**: Admin, Manager, and Cashier security tiers.
* **HMAC SHA-256 JWT Authentication**: Secure session and route authorization.

---

## 🏛️ System Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │           Frontend (React + Vite)            │
                  ├──────────────────────┬───────────────────────┤
                  │ Main POS App         │ Customer Store App    │
                  │ (index.html)         │ (customer.html)       │
                  └──────────┬───────────┴───────────┬───────────┘
                             │                       │
                             ▼                       ▼
                  ┌──────────────────────────────────────────────┐
                  │       Node.js Express Server (server/)       │
                  ├──────────────────────────────────────────────┤
                  │ JWT Security Auth    │ Translation Engine    │
                  │ REST API Endpoints   │ Static File Server    │
                  └──────────┬───────────────────────┬───────────┘
                             │                       │
                             ▼                       ▼
                  ┌──────────────────────┬───────────────────────┐
                  │ Supabase Cloud DB    │ Local Offline Cache   │
                  │ (PostgreSQL)         │ (pos_database.json)   │
                  └──────────────────────┴───────────────────────┘
```

---

## 📂 Project Structure

```
d:/pos1/
├── index.html                   # Main POS Entry Point
├── customer.html                # Customer Store Entry Point
├── package.json                 # Project dependencies & scripts
├── railway.json                 # Railway Cloud Deployment Config
├── nixpacks.toml                # Build & Environment Manifest
├── vite.config.js               # Main POS Vite Config
├── vite.customer.config.js      # Customer Store Vite Config
├── server/
│   ├── index.js                 # Express API Server & Static Middleware
│   ├── auth.js                  # JWT Token Signing & Auth Middleware
│   ├── db.js                    # Database Operations Layer
│   ├── supabase.js              # Supabase Client & Cloud Query Handlers
│   ├── translator.js            # Chinese-to-Arabic Translation Dictionary
│   └── supabase_schema.sql      # Database SQL Schema Manifest
└── src/
    ├── App.jsx                  # Main POS Application Root
    ├── CustomerApp.jsx          # Customer Storefront Application Root
    ├── index.css                # Global CSS Design Tokens & Mobile Rules
    └── components/              # Modular UI Components
        ├── POSTerminal.jsx      # Cashier Counter POS Component
        ├── LightStockManager.jsx# Stock Directory Manager Component
        ├── StockImportPage.jsx  # PDF/Excel Import Component
        ├── VinLookupBar.jsx     # OEM / VIN Search Bar
        ├── CustomerStore.jsx    # Public Customer Store Component
        ├── OrdersLog.jsx        # Sales History & Returns Component
        ├── PaymentModal.jsx     # Checkout Payment Dialog
        ├── ReceiptModal.jsx     # Printable Thermal Receipt Modal
        └── UserManagementModal.jsx # Admin User Roles Component
```

---

## 🛠️ Environment Variables Setup

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT Auth Secret
JWT_SECRET=your-secure-jwt-secret-key

# Railway Deployment
RAILWAY_PROJECT_ID=fd24d88f-e303-4a35-a2dd-b72638fbb825
PORT=5000
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build Production Bundles
```bash
npm run build
```

---

## ☁️ Deployment (Railway & Cloud Hosts)

The project is pre-configured for **Railway** deployment:

* **Build Command**: `npm run build`
* **Start Command**: `node server/index.js`
* **Multi-Port Resiliency**: Server automatically listens on Railway's `$PORT`, `8080`, `5173`, and `5000`.

---

## 📄 License

Copyright © 2026 **Mousa Car Parts (موسى لقطع السيارات)**. All rights reserved.
