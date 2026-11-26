import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { generateNextQuoteNumber, runTxWithRetry } from "@/lib/sequence";
import {
  EMAIL_RE,
  GSTIN_RE,
  isOneOf,
  parseFiniteNumber,
  parseJsonBody,
  parseValidDate,
  QUOTATION_STATUSES,
  TAX_TYPES,
} from "@/lib/validators";

export async function GET(request: Request) {
  const auth = await authorize("quotations:read");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { quoteNumber: { contains: search } },
        { companyName: { contains: search } },
        { customerName: { contains: search } },
      ];
    }

    const quotes = await prisma.quotation.findMany({
      where,
      include: {
        items: true,
        order: {
          select: { id: true, orderNumber: true, stage: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Quotations GET error:", error);
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize("quotations:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!companyName || !customerName || rawItems.length === 0) {
    return NextResponse.json(
      { error: "Company name, contact person, and at least one line item are required" },
      { status: 400 }
    );
  }

  let subtotal = 0;
  const formattedItems: {
    productId: string | null;
    productTitle: string;
    description: string | null;
    sizeBreakdown: string | null;
    quantity: number;
    baseUnitPrice: number;
    customizationDetails: string | null;
    customizationCost: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const productTitle = typeof it.productTitle === "string" ? it.productTitle.trim() : "";
    const qty = parseFiniteNumber(it.quantity);
    const basePrice =
      it.baseUnitPrice !== undefined && it.baseUnitPrice !== ""
        ? parseFiniteNumber(it.baseUnitPrice)
        : 0;
    const custCost =
      it.customizationCost !== undefined && it.customizationCost !== ""
        ? parseFiniteNumber(it.customizationCost)
        : 0;

    if (!productTitle) {
      return NextResponse.json({ error: "Each item requires a productTitle" }, { status: 400 });
    }
    if (qty === null || qty <= 0 || !Number.isInteger(qty)) {
      return NextResponse.json(
        { error: "Each item quantity must be a positive integer" },
        { status: 400 }
      );
    }
    if (basePrice === null || basePrice < 0 || custCost === null || custCost < 0) {
      return NextResponse.json(
        { error: "Item prices and customization costs must be zero or greater" },
        { status: 400 }
      );
    }

    const unitPrice = Math.round((basePrice + custCost) * 100) / 100;
    const lineTotal = Math.round(unitPrice * qty * 100) / 100;
    subtotal += lineTotal;

    formattedItems.push({
      productId: typeof it.productId === "string" && it.productId.trim() ? it.productId.trim() : null,
      productTitle,
      description:
        typeof it.description === "string" && it.description.trim() ? it.description.trim() : null,
      sizeBreakdown:
        typeof it.sizeBreakdown === "object" && it.sizeBreakdown !== null
          ? JSON.stringify(it.sizeBreakdown)
          : typeof it.sizeBreakdown === "string" && it.sizeBreakdown.trim()
          ? it.sizeBreakdown.trim()
          : null,
      quantity: qty,
      baseUnitPrice: basePrice,
      customizationDetails:
        typeof it.customizationDetails === "string" && it.customizationDetails.trim()
          ? it.customizationDetails.trim()
          : null,
      customizationCost: custCost,
      unitPrice,
      lineTotal,
    });
  }

  if (formattedItems.length === 0) {
    return NextResponse.json({ error: "Add at least one valid line item" }, { status: 400 });
  }

  const discountPercent =
    body.discountPercent !== undefined && body.discountPercent !== null && body.discountPercent !== ""
      ? parseFiniteNumber(body.discountPercent)
      : 0;
  if (discountPercent === null || discountPercent < 0 || discountPercent > 100) {
    return NextResponse.json(
      { error: "discountPercent must be between 0 and 100" },
      { status: 400 }
    );
  }

  const gstRate =
    body.gstRate !== undefined && body.gstRate !== null && body.gstRate !== ""
      ? parseFiniteNumber(body.gstRate)
      : 5.0;
  if (gstRate === null || gstRate < 0 || gstRate > 28) {
    return NextResponse.json({ error: "gstRate must be between 0 and 28" }, { status: 400 });
  }

  const taxType = body.taxType ? String(body.taxType) : "CGST_SGST";
  if (!isOneOf(taxType, TAX_TYPES)) {
    return NextResponse.json({ error: "Invalid taxType (CGST_SGST or IGST)" }, { status: 400 });
  }

  const status = body.status ? String(body.status) : "DRAFT";
  if (!isOneOf(status, QUOTATION_STATUSES)) {
    return NextResponse.json({ error: "Invalid quotation status" }, { status: 400 });
  }

  const advanceRequiredPercent =
    body.advanceRequiredPercent !== undefined &&
    body.advanceRequiredPercent !== null &&
    body.advanceRequiredPercent !== ""
      ? parseFiniteNumber(body.advanceRequiredPercent)
      : 50.0;
  if (
    advanceRequiredPercent === null ||
    advanceRequiredPercent < 0 ||
    advanceRequiredPercent > 100
  ) {
    return NextResponse.json(
      { error: "advanceRequiredPercent must be between 0 and 100" },
      { status: 400 }
    );
  }

  const estimatedDays =
    body.estimatedDays !== undefined && body.estimatedDays !== null && body.estimatedDays !== ""
      ? parseFiniteNumber(body.estimatedDays)
      : 10;
  if (estimatedDays === null || estimatedDays < 1 || !Number.isInteger(estimatedDays)) {
    return NextResponse.json(
      { error: "estimatedDays must be a positive integer" },
      { status: 400 }
    );
  }

  const validUntil = body.validUntil
    ? parseValidDate(body.validUntil)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  if (!validUntil) {
    return NextResponse.json({ error: "Invalid validUntil date" }, { status: 400 });
  }

  const clientEmail =
    typeof body.clientEmail === "string" && body.clientEmail.trim()
      ? body.clientEmail.trim().toLowerCase()
      : "orders@urbandhaga.com";
  if (typeof body.clientEmail === "string" && body.clientEmail.trim() && !EMAIL_RE.test(clientEmail)) {
    return NextResponse.json({ error: "Invalid clientEmail" }, { status: 400 });
  }

  const clientGstin =
    typeof body.clientGstin === "string" && body.clientGstin.trim()
      ? body.clientGstin.trim().toUpperCase()
      : null;
  if (clientGstin && !GSTIN_RE.test(clientGstin)) {
    return NextResponse.json(
      { error: "GSTIN must be 15 characters (e.g. 29ABCDE1234F1Z5)" },
      { status: 400 }
    );
  }

  const discountAmount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
  const grandTotal = Math.round(taxableAmount + taxAmount);
  const customerIdInput =
    typeof body.customerId === "string" && body.customerId.trim() ? body.customerId.trim() : null;

  try {
    const quotation = await runTxWithRetry(async (tx) => {
      let customerId: string | null = null;
      if (customerIdInput) {
        const cust = await tx.customer.findUnique({ where: { id: customerIdInput } });
        if (!cust) throw new Error("CUSTOMER_NOT_FOUND");
        customerId = cust.id;
      }

      const quoteNumber = await generateNextQuoteNumber(tx);

      const created = await tx.quotation.create({
        data: {
          quoteNumber,
          customerId,
          customerName,
          companyName,
          clientEmail,
          clientPhone:
            typeof body.clientPhone === "string" && body.clientPhone.trim()
              ? body.clientPhone.trim()
              : "—",
          clientGstin,
          shippingAddress:
            typeof body.shippingAddress === "string" && body.shippingAddress.trim()
              ? body.shippingAddress.trim()
              : null,
          status,
          validUntil,
          subtotal,
          discountPercent,
          discountAmount,
          taxType,
          gstRate,
          taxAmount,
          grandTotal,
          advanceRequiredPercent,
          paymentTerms:
            typeof body.paymentTerms === "string" && body.paymentTerms.trim()
              ? body.paymentTerms.trim()
              : "50% advance on approval, 50% prior to dispatch",
          estimatedDays,
          notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
          items: { create: formattedItems },
        },
        include: { items: true },
      });

      await tx.activityLog.create({
        data: {
          entityType: "QUOTE",
          entityId: created.id,
          action: "CREATED",
          description: `Estimate ${quoteNumber} created for ${created.companyName} (Grand Total: ₹${grandTotal.toLocaleString("en-IN")})`,
          performedBy: auth.user.name,
        },
      });

      return created;
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "Selected customer no longer exists" }, { status: 400 });
    }
    console.error("Quotation POST error:", error);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}
