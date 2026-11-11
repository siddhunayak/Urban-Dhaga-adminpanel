import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface QuotationPDFData {
  quoteNumber: string;
  customerName: string;
  companyName: string;
  clientEmail: string;
  clientPhone: string;
  clientGstin?: string | null;
  shippingAddress?: string | null;
  validUntil: string | Date;
  items: Array<{
    productTitle: string;
    description?: string | null;
    sizeBreakdown?: string | null;
    quantity: number;
    unitPrice: number;
    customizationDetails?: string | null;
    lineTotal: number;
  }>;
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  taxType?: string;
  gstRate: number;
  taxAmount: number;
  grandTotal: number;
  paymentTerms?: string;
  estimatedDays?: number;
  notes?: string | null;
}

export interface JobSheetPDFData {
  jobSheetNumber: string;
  orderNumber: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  targetDeliveryDate: string | Date;
  priority: string;
  items: Array<{
    productName: string;
    sku?: string | null;
    sizeBreakdown?: string | null;
    quantity: number;
    customizationDetails?: string | null;
  }>;
  qualityCheck?: {
    fabricQualityChecked: boolean;
    printFidelityChecked: boolean;
    colorAccuracyChecked: boolean;
    stitchingFinishChecked: boolean;
    packagingChecked: boolean;
    remarks?: string | null;
    inspectedBy?: string | null;
  } | null;
  notes?: string | null;
}

/**
 * Generates an aesthetic, high-craft branded PDF Quotation for Urban Dhaga
 */
export function generateQuotationPDF(data: QuotationPDFData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Primary Terracotta & Slate Palette
  const brandDark = [24, 24, 27]; // #18181b
  const brandAccent = [194, 65, 12]; // #c2410c (Terracotta)
  const textMuted = [113, 113, 122]; // #71717a
  const borderLight = [228, 228, 231];

  // 1. Header with Brand Identity
  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(0, 0, 210, 18, "F");

  // Accent line
  doc.setFillColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.rect(0, 18, 210, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("URBAN DHAGA  |  CORPORATE MERCHANDISE & APPAREL", 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("www.urbandhaga.com  •  orders@urbandhaga.com", 196, 12, { align: "right" });

  // 2. Title & Metadata
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("COMMERCIAL ESTIMATE", 14, 32);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.text(`REF: ${data.quoteNumber}`, 14, 38);

  // Date block on right
  const quoteDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const validDate = new Date(data.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(9);
  doc.text("Issue Date:", 145, 32);
  doc.text("Valid Until:", 145, 38);
  doc.text("Turnaround:", 145, 44);

  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.setFont("helvetica", "bold");
  doc.text(quoteDate, 196, 32, { align: "right" });
  doc.text(validDate, 196, 38, { align: "right" });
  doc.text(`${data.estimatedDays || 10} Working Days`, 196, 44, { align: "right" });

  // 3. Client & Provider Info Boxes
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(14, 49, 196, 49);

  // Client Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.text("PREPARED FOR", 14, 56);

  doc.setFontSize(11);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text(data.companyName, 14, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Attn: ${data.customerName}`, 14, 67);
  doc.text(`Email: ${data.clientEmail}  |  Phone: ${data.clientPhone}`, 14, 72);
  if (data.clientGstin) {
    doc.text(`GSTIN: ${data.clientGstin}`, 14, 77);
  }

  // Provider Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.text("ISSUED BY", 125, 56);

  doc.setFontSize(10);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text("Urban Dhaga Merchandising LLP", 125, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Indiranagar, Bangalore, KA - 560038", 125, 67);
  doc.text("GSTIN: 29AAHCU8891P1ZV", 125, 72);
  doc.text("PAN: AAHCU8891P", 125, 77);

  // 4. Line Items Table
  const tableRows = data.items.map((item, idx) => {
    let sizeDesc = "";
    if (item.sizeBreakdown) {
      try {
        const parsed = JSON.parse(item.sizeBreakdown);
        sizeDesc = Object.entries(parsed)
          .map(([k, v]) => `${k}:${v}`)
          .join(" | ");
      } catch {
        sizeDesc = item.sizeBreakdown;
      }
    }

    const description = [
      item.productTitle,
      item.customizationDetails ? `[Customization: ${item.customizationDetails}]` : "",
      sizeDesc ? `Sizes: ${sizeDesc}` : "",
      item.description || "",
    ]
      .filter(Boolean)
      .join("\n");

    return [
      (idx + 1).toString(),
      description,
      item.quantity.toLocaleString("en-IN"),
      `Rs. ${item.unitPrice.toLocaleString("en-IN")}`,
      `Rs. ${item.lineTotal.toLocaleString("en-IN")}`,
    ];
  });

  autoTable(doc, {
    startY: 84,
    head: [["#", "Item & Customization Details", "Qty", "Unit Price", "Total (INR)"]],
    body: tableRows,
    theme: "plain",
    headStyles: {
      fillColor: [244, 244, 245],
      textColor: [24, 24, 27],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 3.5,
    },
    bodyStyles: {
      textColor: [39, 39, 42],
      fontSize: 8.5,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 100 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 27, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  });

  // 5. Totals & Tax Calculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || 140;

  let currentY = finalY + 6;

  // Commercial Terms on left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text("COMMERCIAL TERMS & SPECIFICATIONS", 14, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const termsText = [
    `• Payment Terms: ${data.paymentTerms || "50% advance on approval, 50% prior to dispatch"}`,
    `• Quality Check: Every batch is inspected against Urban Dhaga 5-Point Quality Standard.`,
    `• Tolerances: Industry standard +/- 5% in GSM and count. Exact Pantone match within +/- 5% delta.`,
    `• Delivery: Ex-warehouse Bangalore. Transit insurance by carrier.`,
  ];
  doc.text(termsText, 14, currentY + 5);

  // Totals Breakdown on right
  const summaryX = 135;
  const valueX = 196;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

  doc.text("Subtotal:", summaryX, currentY);
  doc.text(`Rs. ${data.subtotal.toLocaleString("en-IN")}`, valueX, currentY, { align: "right" });

  if (data.discountAmount && data.discountAmount > 0) {
    currentY += 5;
    doc.text(`Discount (${data.discountPercent || 0}%):`, summaryX, currentY);
    doc.text(`- Rs. ${data.discountAmount.toLocaleString("en-IN")}`, valueX, currentY, { align: "right" });
  }

  currentY += 5;
  const taxLabel = data.taxType === "IGST" ? `IGST (${data.gstRate}%)` : `GST (${data.gstRate}%)`;
  doc.text(taxLabel, summaryX, currentY);
  doc.text(`Rs. ${data.taxAmount.toLocaleString("en-IN")}`, valueX, currentY, { align: "right" });

  currentY += 3;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(summaryX, currentY, valueX, currentY);

  currentY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.text("Total Payable:", summaryX, currentY);
  doc.text(`Rs. ${data.grandTotal.toLocaleString("en-IN")}`, valueX, currentY, { align: "right" });

  // 6. Signature Block
  const sigY = currentY + 22;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(14, sigY, 70, sigY);
  doc.line(140, sigY, 196, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Client Authorized Signatory & Seal", 14, sigY + 5);
  doc.text("For Urban Dhaga Merchandising", 140, sigY + 5);

  return doc;
}

/**
 * Generates an Industrial Job Sheet PDF for the production floor & print shop
 */
export function generateJobSheetPDF(data: JobSheetPDFData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const brandDark = [24, 24, 27];
  const brandAmber = [217, 119, 6]; // #d97706
  const textMuted = [113, 113, 122];

  // Header Bar
  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(0, 0, 210, 16, "F");

  doc.setFillColor(brandAmber[0], brandAmber[1], brandAmber[2]);
  doc.rect(0, 16, 210, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("URBAN DHAGA  |  PRODUCTION JOB SHEET", 14, 11);
  doc.text(`PRIORITY: ${data.priority.toUpperCase()}`, 196, 11, { align: "right" });

  // Job Sheet Meta
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.setFontSize(18);
  doc.text(`JOB TICKET: ${data.jobSheetNumber}`, 14, 28);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Order Ref: ${data.orderNumber}`, 14, 34);
  doc.text(`Client: ${data.companyName} (${data.contactPerson} - ${data.contactPhone})`, 14, 39);

  const targetDate = new Date(data.targetDeliveryDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.text(`Target Dispatch: ${targetDate}`, 196, 34, { align: "right" });

  // Items breakdown
  const rows = data.items.map((it, idx) => {
    let sizeDesc = "";
    if (it.sizeBreakdown) {
      try {
        const parsed = JSON.parse(it.sizeBreakdown);
        sizeDesc = Object.entries(parsed)
          .map(([s, q]) => `[Size ${s}: ${q} pcs]`)
          .join("  ");
      } catch {
        sizeDesc = it.sizeBreakdown;
      }
    }

    return [
      (idx + 1).toString(),
      `${it.productName}\n${sizeDesc}\nPrint/Embroidery Specs: ${it.customizationDetails || "Plain stock"}`,
      it.quantity.toString(),
    ];
  });

  autoTable(doc, {
    startY: 45,
    head: [["#", "Product & Size Matrix Specification", "Total Units"]],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 150 },
      2: { cellWidth: 22, halign: "center", fontStyle: "bold" },
    },
  });

  // 5-Point Quality Control Gate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableFinalY = (doc as any).lastAutoTable?.finalY || 120;
  let qcY = tableFinalY + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text("MANDATORY 5-POINT QUALITY INSPECTION GATE", 14, qcY);

  const qc = data.qualityCheck;
  const qcChecklist = [
    { name: "1. Fabric & Material Inspection (GSM & defect audit)", passed: qc?.fabricQualityChecked },
    { name: "2. Print & Embroidery Fidelity (registration & adhesion)", passed: qc?.printFidelityChecked },
    { name: "3. Color Accuracy (Pantone delta <= 5%)", passed: qc?.colorAccuracyChecked },
    { name: "4. Stitching & Hemming Integrity (seam tension & labels)", passed: qc?.stitchingFinishChecked },
    { name: "5. Packaging & Barcode Compliance (individual poly & master carton)", passed: qc?.packagingChecked },
  ];

  qcY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  qcChecklist.forEach((item) => {
    const box = item.passed ? "[X]" : "[ ]";
    doc.setTextColor(item.passed ? 22 : 113, item.passed ? 101 : 113, item.passed ? 52 : 122);
    doc.text(`${box}  ${item.name}`, 14, qcY);
    qcY += 5.5;
  });

  if (qc?.remarks) {
    qcY += 2;
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Inspector Notes: ${qc.remarks}`, 14, qcY);
    qcY += 5;
  }

  // Workshop Sign-off
  qcY += 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, qcY, 65, qcY);
  doc.line(80, qcY, 130, qcY);
  doc.line(145, qcY, 196, qcY);

  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Floor Supervisor Sign", 14, qcY + 5);
  doc.text("QC Master Sign", 80, qcY + 5);
  doc.text("Dispatch Handler Sign", 145, qcY + 5);

  return doc;
}

export interface TaxInvoicePDFData {
  invoiceNumber: string;
  orderNumber: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  clientGstin?: string | null;
  shippingAddress: string;
  issueDate: string | Date;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    customizationDetails?: string | null;
  }>;
  gstRate: number;
  taxType: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: string;
}

/**
 * Generates an official B2B GST Tax Invoice PDF for Urban Dhaga
 */
export function generateTaxInvoicePDF(data: TaxInvoicePDFData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const brandDark = [24, 24, 27];
  const brandAccent = [194, 65, 12];
  const textMuted = [113, 113, 122];
  const borderLight = [228, 228, 231];

  doc.setFillColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.rect(0, 0, 210, 18, "F");
  doc.setFillColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.rect(0, 18, 210, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("URBAN DHAGA MERCHANDISING LLP", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("GSTIN: 29AAHCU8891P1ZV  |  accounts@urbandhaga.com", 196, 12, { align: "right" });

  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("TAX INVOICE", 14, 32);

  doc.setFontSize(10);
  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.text(`INV NO: ${data.invoiceNumber}`, 14, 38);

  const issued = new Date(data.issueDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice Date:", 145, 32);
  doc.text("Order Ref:", 145, 38);
  doc.text("Payment Status:", 145, 44);

  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.setFont("helvetica", "bold");
  doc.text(issued, 196, 32, { align: "right" });
  doc.text(data.orderNumber, 196, 38, { align: "right" });
  doc.text(data.paymentStatus.replace("_", " "), 196, 44, { align: "right" });

  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(14, 49, 196, 49);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.text("BILLED TO", 14, 56);

  doc.setFontSize(11);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text(data.companyName, 14, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Attn: ${data.contactPerson}  |  Phone: ${data.contactPhone}`, 14, 67);
  doc.text(`Address: ${data.shippingAddress}`, 14, 72);
  if (data.clientGstin) {
    doc.text(`Client GSTIN: ${data.clientGstin}`, 14, 77);
  }

  const rows = data.items.map((it, idx) => [
    (idx + 1).toString(),
    `${it.productName}${it.customizationDetails ? `\n(${it.customizationDetails})` : ""}`,
    it.quantity.toLocaleString("en-IN"),
    `Rs. ${it.unitPrice.toLocaleString("en-IN")}`,
    `Rs. ${it.lineTotal.toLocaleString("en-IN")}`,
  ]);

  autoTable(doc, {
    startY: 84,
    head: [["#", "Description of Goods / Services", "Qty", "Rate", "Amount (INR)"]],
    body: rows,
    theme: "plain",
    headStyles: {
      fillColor: [244, 244, 245],
      textColor: [24, 24, 27],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 3.5,
    },
    bodyStyles: {
      textColor: [39, 39, 42],
      fontSize: 8.5,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 100 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 27, halign: "right", fontStyle: "bold" },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = ((doc as any).lastAutoTable?.finalY || 140) + 8;

  const taxableBase = Math.round(data.totalAmount / (1 + data.gstRate / 100));
  const taxAmt = data.totalAmount - taxableBase;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text("BANK DETAILS FOR NEFT / RTGS / IMPS", 14, finalY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    [
      "Account Name: Urban Dhaga Merchandising LLP",
      "Bank: HDFC Bank, Indiranagar Branch, Bangalore",
      "A/C No: 50200084910221  |  IFSC: HDFC0000184",
    ],
    14,
    finalY + 5
  );

  const sx = 135;
  const vx = 196;
  let cy = finalY;

  doc.setFontSize(9);
  doc.text("Taxable Value:", sx, cy);
  doc.text(`Rs. ${taxableBase.toLocaleString("en-IN")}`, vx, cy, { align: "right" });

  cy += 5;
  if (data.taxType === "IGST") {
    doc.text(`IGST (${data.gstRate}%):`, sx, cy);
    doc.text(`Rs. ${taxAmt.toLocaleString("en-IN")}`, vx, cy, { align: "right" });
  } else {
    const half = (data.gstRate / 2).toFixed(1);
    const halfAmt = Math.round(taxAmt / 2);
    doc.text(`CGST (${half}%) + SGST (${half}%):`, sx, cy);
    doc.text(`Rs. ${(halfAmt * 2).toLocaleString("en-IN")}`, vx, cy, { align: "right" });
  }

  cy += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandDark[0], brandDark[1], brandDark[2]);
  doc.text("Invoice Total:", sx, cy);
  doc.text(`Rs. ${data.totalAmount.toLocaleString("en-IN")}`, vx, cy, { align: "right" });

  cy += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(22, 101, 52);
  doc.text("Less: Advance / Paid:", sx, cy);
  doc.text(`- Rs. ${data.advancePaid.toLocaleString("en-IN")}`, vx, cy, { align: "right" });

  cy += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.text("Balance Payable:", sx, cy);
  doc.text(`Rs. ${data.balanceDue.toLocaleString("en-IN")}`, vx, cy, { align: "right" });

  const sigY = cy + 20;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(140, sigY, 196, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("For Urban Dhaga Merchandising LLP", 140, sigY + 5);

  return doc;
}

