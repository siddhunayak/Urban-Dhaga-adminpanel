# Urban Dhaga — Admin Panel Context & Domain Guide

## Domain Vocabulary

- **Urban Dhaga**: A custom corporate merchandising, apparel, and gifting company specializing in custom-branded t-shirts, hoodies, drinkware, welcome kits, and corporate swag.
- **Lead / Inquiry**: Inbound corporate lead specifying estimated quantity, budget, target delivery date, and product category.
- **Client / Customer**: B2B client entity holding GSTIN, company address, SPOC (Single Point of Contact) details, and purchase history.
- **Catalog Item / Product**: Stock or custom item (Apparel, Corporate Gifts, Welcome Packs) with variant matrix (Color x Size x GSM).
- **Slab / Tiered Pricing**: Quantity-based volume discounts (e.g., 50-100 pcs: ₹450, 101-500: ₹380, 501+: ₹320).
- **Customization Specification**: Printing & branding methods (DTF, Screen Print, Embroidery, Sublimation, Laser Engraving, UV) with print location (Chest, Back, Sleeve, etc.).
- **Quotation (Estimate)**: Itemized commercial quote including base product price, customization charges, GST (HSN-tagged: 5% for apparel <= ₹1000, 12% > ₹1000, 18% for corporate accessories/services), terms, and validity.
- **Mockup / Proof**: Digital design rendering of the branded merchandise requiring client sign-off before manufacturing.
- **Job Sheet (Production Order)**: Workshop production ticket specifying SKU quantities, sizing breakdown, Pantone/color references, artwork files, and timeline.
- **5-Point Quality Check (QC)**:
  1. Fabric & Material Quality (GSM, defects, shrinkage test)
  2. Print / Embroidery Fidelity (alignment, bleeding, sharpness)
  3. Color Accuracy (Pantone match)
  4. Stitching & Hemming finish
  5. Packaging & Tagging compliance
- **Vendor / Job Worker**: External third-party unit handling outsourced processes (e.g. specialized embroidery or screen printing unit).
- **Dispatch & Courier**: Shipping allocation (courier partner, AWB / tracking number, box count, weight).
- **Payment Structure**: Typical B2B advance milestone model (50% Advance on approval, 50% Before Dispatch / On Delivery).

## Access Roles
1. **Admin / Owner**: Full control over pricing, financial reports, margins, team members, and settings.
2. **Sales / Account Manager**: Manages leads, customers, quotation creation, and client follow-ups.
3. **Production / Ops Head**: Manages job sheets, stock allocation, QC checklists, vendor assignments, and dispatch.
4. **Accounts / Billing**: Invoices, GST reports, payment reconciliations.
