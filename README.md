# Urban Dhaga — Admin & Operations Command Center

The enterprise B2B Admin & Operations Panel for **Urban Dhaga**, designed specifically for custom corporate merchandising, volume apparel manufacturing, welcome kits, and client CRM.

Built with Next.js 15 (App Router), Prisma, SQLite (zero-config local run with seamless migration to Supabase/PostgreSQL), Tailwind CSS, and client-side PDF Generation.

---

## Architecture & Technology Stack

- **Framework**: Next.js 15 (React 19, TypeScript, App Router)
- **Design System**: Linear/Stripe Craft B2B aesthetic with warm slate & terracotta accents, high information density, and custom typography.
- **ORM & Database**: Prisma ORM with SQLite for zero-config local development (`dev.db`), architected with standard relational models ready to switch to Supabase/PostgreSQL via `DATABASE_URL`.
- **PDF Generation**: `jspdf` + `jspdf-autotable` for generating branded Commercial Estimates and Industrial Workshop Job Sheets.
- **Analytics & Telemetry**: Recharts for monthly revenue trajectories and product line splits.
- **Global Command Menu**: `Cmd+K` / `Ctrl+K` interactive quick navigation.

---

## Core Operational Modules

### 1. Operations & Revenue Command (`/dashboard`)
- **Gross Pipeline Telemetry**: Total revenue booked, advance payments collected, and balance due.
- **Production Stage Funnel**: Live allocation across 8 manufacturing gates (Confirmed → Mockup → Production → QC → Dispatch).
- **Revenue Inflow Trajectory**: Monthly gross order values and category contribution charts.
- **Critical Stock Alerts**: Immediate warning table for SKU variants below minimum threshold with 1-click Inward tool.

### 2. Interactive Quotations & Estimates (`/quotes`, `/quotes/new`)
- **Dynamic Tiered Pricing**: Quantity-based pricing slabs (50+, 100+, 300+, 500+ pcs) automatically applied as order quantity changes.
- **Custom Branding Calculator**: Ton-sur-ton embroidery, multi-color screen printing, high-density DTF, laser engraving, and custom neck labels.
- **Size Breakdown Allocation**: S, M, L, XL, 2XL matrix.
- **Indian GST Engine**: HSN-tagged tax slabs (5% standard apparel, 12% fleece hoodies, 18% corporate kits/drinkware), intra-state (CGST+SGST) and inter-state (IGST).
- **1-Click Branded PDF Export**: Download official estimates with terms and authorized signature blocks.
- **1-Click Convert to Order**: Instantly generates an active production order, job sheet ticket, and QC gate checklist.

### 3. Production & Order Execution Floor (`/production`)
- **Dual View**: 8-stage interactive Kanban board + high-density tabular view with stage and priority filters.
- **Mandatory 5-Point Quality Check Gate**:
  1. Fabric & Material Inspection (GSM & defect audit)
  2. Print & Embroidery Fidelity (registration & wash test)
  3. Color Accuracy (Pantone delta <= 5% match)
  4. Stitching & Hemming Integrity (seam tension & labels)
  5. Packaging & Barcode Compliance (polybag & cartons)
- **Dispatch & Logistics Tracking**: Courier allocation (Shiprocket, Delhivery, Blue Dart), AWB tracking number, box count, and consignment weight.
- **Industrial Job Sheet PDF**: Download printable workshop ticket for screen printers and master cutters.

### 4. Product Catalog & Slabs (`/products`)
- Catalog gallery by category (Apparel, Drinkware, Welcome Kits, Bags).
- Volume pricing matrix display and technical fabric specifications.
- "Add Catalog Item" modal with pricing tiers and variant generation.

### 5. Variant-Level Stock Matrix (`/inventory`)
- Variant inventory breakdown by SKU, colorway swatch, and size.
- Health badges (Normal vs Critical Low Stock).
- 1-click Inward/Adjustment modal with quick increments (+25, +50, +100, +250) and activity logging.

### 6. Corporate Inquiries & Leads Pipeline (`/leads`)
- B2B lead pipeline across 7 stages (New → Contacted → Scoped → Quote Sent → Negotiation → Won/Lost).
- 1-click "Quote" shortcut to build custom commercial estimate.

### 7. Corporate Clients & Vendor Directories (`/customers`, `/vendors`)
- B2B Accounts directory with GSTIN, delivery addresses, and cumulative lifetime GMV.
- Manufacturing workshops & job workers (screen printers, embroidery studio, packaging partners) with ratings and active job assignments.

### 8. Tax Invoices & Receivables Ledger (`/invoices`)
- GST-compliant B2B Tax Invoice PDF generator (CGST/SGST & IGST, advance deducted, balance payable, bank NEFT details).
- Payment collection tracking (`PENDING`, `PARTIAL_PAID`, `FULLY_PAID`) and accountant CSV export.

### 9. Staff Auth, RBAC & Audit Log (`/login`, `/team`)
- Signed HTTP-only session cookies (`HMAC-SHA256`) protecting all pages and API endpoints via Next.js Middleware.
- Owner-only staff provisioning (`OWNER`, `SALES`, `PRODUCTION`, `ACCOUNTS`, `STAFF`) and immutable activity audit log.

---

## Quickstart & Local Setup

### 1. Environment & Dependencies
```bash
cp .env.example .env
npm install
```

### 2. Initialize Database & Seed Domain Data
```bash
npx prisma db push
node prisma/seed.js
```
Default seeded login: `arjun@urbandhaga.com` / `urbandhaga2026` (change password in production via `/team`).

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Admin Panel.

### 4. Production Deployment (PostgreSQL / Supabase / Railway)
1. Set `DATABASE_URL` (for PostgreSQL/Supabase, update `provider = "postgresql"` in `prisma/schema.prisma`) and a strong random 32+ char `AUTH_SECRET`.
2. Run `npx prisma db push && node prisma/seed.js` (first deploy only).
3. Build & start:
```bash
npm run build
npm start
```
4. Health check endpoint: `GET /api/health`
