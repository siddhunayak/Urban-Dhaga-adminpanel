# Urban Dhaga Admin Panel - Engineering & Operations Handoff

**Repository**: [github.com/siddhunayak/Urban-Dhaga-adminpanel](https://github.com/siddhunayak/Urban-Dhaga-adminpanel)  
**PRD Specification**: [Super CRM / Urban Dhaga Ops PRD](https://docs.google.com/document/d/1PIzOTI1EP9ov5of-mlaND2baQ3VR14fdID70QUbJ8hc/edit?usp=sharing)  
**Latest Production Commit**: [`1f6b4d4`](https://github.com/siddhunayak/Urban-Dhaga-adminpanel/commit/1f6b4d4) (`origin/main`)  
**Server Port**: `http://localhost:3000` (Next.js 15 App Router, Node.js runtime)

---

## 1. System Architecture Overview

| Layer | Technology | Key Files |
| :--- | :--- | :--- |
| **Framework** | Next.js 15.5.29 (App Router, React 19) | [`src/app/layout.tsx`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/layout.tsx), [`src/app/globals.css`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/globals.css) |
| **Styling & Theme** | Tailwind CSS (Corporate Slate `#0f172a` + Executive Blue `#2563eb`) | [`tailwind.config.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/tailwind.config.ts) |
| **Database & ORM** | Prisma ORM with SQLite (`prisma/dev.db`) | [`prisma/schema.prisma`](file:///d:/Urban%20dhaga%20Admin%20panel/prisma/schema.prisma), [`prisma/seed.js`](file:///d:/Urban%20dhaga%20Admin%20panel/prisma/seed.js) |
| **Authentication & RBAC** | Signed `HMAC-SHA256` HTTP-only session cookies + `scrypt` hashing | [`src/lib/session.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/lib/session.ts), [`src/lib/password.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/lib/password.ts), [`src/middleware.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/middleware.ts) |
| **Document Generation** | jsPDF + jsPDF-AutoTable (Estimates, Job Sheets, GST Tax Invoices) | [`src/lib/pdf-generator.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/lib/pdf-generator.ts) |
| **Command & Search** | Global `Cmd+K` / `Ctrl+K` command palette with live query | [`src/components/command-palette.tsx`](file:///d:/Urban%20dhaga%20Admin%20panel/src/components/command-palette.tsx) |

---

## 2. Completed Capabilities & Routes

### A. Operations & Pipeline Lifecycle
1. **Inbound Leads CRM (`/leads`)**: Inbound corporate inquiry capture, 7 Kanban deal stages (`NEW` to `WON`/`LOST`), 1-click quote generation ([`src/app/leads/page.tsx`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/leads/page.tsx)).
2. **Interactive Quotation Builder (`/quotes` & `/quotes/new`)**: Dynamic slab price recalculator, apparel branding add-ons (Embroidery, DTF, Screen Print), 5%/12%/18% Indian GST engine, and client Commercial Estimate PDF export ([`src/app/quotes/new/page.tsx`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/quotes/new/page.tsx)).
3. **Quote-to-Order Conversion**: Collision-free sequential IDs (`ORD-2026-XXXX`, `JS-2026-XXXX`, `INV-2026-XXXX`) via [`src/lib/sequence.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/lib/sequence.ts).
4. **Production Kanban & Table (`/production`)**: 8-stage manufacturing workflow:
   - Order Confirmed ➡️ Artwork/Proofs ➡️ Sample Approved ➡️ In Production ➡️ Quality Check ➡️ Ready for Dispatch ➡️ Dispatched ➡️ Delivered.
   - Proof mockup approval drawer with version tracking ([`src/app/api/orders/[id]/mockups/route.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/api/orders/%5Bid%5D/mockups/route.ts)).
   - Mandatory 5-Point Quality Check Gate with inspector sign-off ([`src/app/api/orders/[id]/qc/route.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/api/orders/%5Bid%5D/qc/route.ts)).
   - Industrial Job Sheet PDF generation for factory floor ([`src/lib/pdf-generator.ts#L295-L450`](file:///d:/Urban%20dhaga%20Admin%20panel/src/lib/pdf-generator.ts#L295-L450)).
   - Logistics courier tracking (DTDC, BlueDart, Delhivery AWB numbers).
5. **Invoices & Financial Ledger (`/invoices`)**: Advance and balance payment reconciliation, legal GST Tax Invoice PDF generation, and CSV export for Chartered Accountants ([`src/app/invoices/page.tsx`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/invoices/page.tsx)).

### B. Catalog, Inventory & Master Directories
6. **Stock & Inventory Matrix (`/inventory`)**: SKU grid broken down by apparel size and color, low-stock threshold triggers, and 1-click stock inward modal ([`src/app/inventory/page.tsx`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/inventory/page.tsx)).
7. **Product Catalog & Price Slabs (`/products`)**: Master garment definitions with 50/100/250/500+ tiered quantity discount slabs ([`src/app/products/page.tsx`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/products/page.tsx)).
8. **Clients & Vendors Directories (`/customers` & `/vendors`)**: Client GSTIN tracking with lifetime GMV, plus manufacturing workshop capacities and ratings.

### C. Security, Staff RBAC & Audit
9. **Authentication (`/login`)**: Role-based access control (`OWNER`, `SALES`, `PRODUCTION`, `ACCOUNTS`, `STAFF`) enforced at Next.js edge middleware level ([`src/middleware.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/middleware.ts)).
10. **Team Management & Audit Log (`/team`)**: Staff member provisioning, role updates, and tamper-resistant system audit trail ([`src/app/api/audit/route.ts`](file:///d:/Urban%20dhaga%20Admin%20panel/src/app/api/audit/route.ts)).

---

## 3. Seeded Accounts & Credentials

| Role | Email | Password | Department |
| :--- | :--- | :--- | :--- |
| **Owner / Full Admin** | `arjun@urbandhaga.com` | `urbandhaga2026` | Leadership |
| **Sales Manager** | `pooja.sales@urbandhaga.com` | `urbandhaga2026` | Commercial & CRM |
| **Production Head** | `vikram.ops@urbandhaga.com` | `urbandhaga2026` | Manufacturing & QC |
| **Accounts Manager** | `meera.accounts@urbandhaga.com` | `urbandhaga2026` | Finance & Tax |

---

## 4. Production Deployment & Data Integration Checklist

When deploying to production for company usage:

1. **Database Migration (PostgreSQL)**:
   - Change `provider = "sqlite"` to `provider = "postgresql"` in [`prisma/schema.prisma`](file:///d:/Urban%20dhaga%20Admin%20panel/prisma/schema.prisma#L6).
   - Set `DATABASE_URL` in production `.env` (Supabase, Neon, or Railway PostgreSQL).
   - Run `npx prisma db push` (or `npx prisma migrate deploy`).
2. **Session Secret**:
   - Set a strong 64-character random string for `SESSION_SECRET` in `.env`.
3. **Company Legal & Bank Details**:
   - Update Urban Dhaga LLP's registered GSTIN, address, bank name, account number, and IFSC in [`src/lib/pdf-generator.ts#L482-L525`](file:///d:/Urban%20dhaga%20Admin%20panel/src/lib/pdf-generator.ts#L482-L525).
4. **Website / WhatsApp Lead Hook**:
   - Target POST endpoint: `https://<admin-domain>/api/leads` with JSON payload `{ companyName, contactPerson, phone, email, requirement, estimatedQty }`.

---

## 5. Verification Commands for Any New Session

```powershell
# 1. Check TypeScript types
npx tsc --noEmit

# 2. Run linting
npm run lint

# 3. Compile production build
npm run build

# 4. Run automated E2E test suite (requires dev server or node scratch runner)
node scratch/e2e-test.mjs

# 5. Start production server
npm start
```
