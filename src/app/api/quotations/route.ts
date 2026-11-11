import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNextQuoteNumber } from "@/lib/sequence";

export async function GET(request: Request) {
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
  try {
    const body = await request.json();
    if (!body.companyName || !body.customerName || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Company name, contact person, and at least one line item are required" },
        { status: 400 }
      );
    }

    const quoteNumber = await generateNextQuoteNumber();
    const items = body.items;
    let subtotal = 0;

    const formattedItems = items.map((it: {
      productId?: string;
      productTitle: string;
      description?: string;
      sizeBreakdown?: Record<string, number> | string;
      quantity: number;
      baseUnitPrice: number;
      customizationDetails?: string;
      customizationCost?: number;
      unitPrice?: number;
      lineTotal?: number;
    }) => {
      const qty = Number(it.quantity) || 1;
      const basePrice = Number(it.baseUnitPrice) || 0;
      const custCost = Number(it.customizationCost) || 0;
      const unitPrice = basePrice + custCost;
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;

      return {
        productId: it.productId || null,
        productTitle: it.productTitle,
        description: it.description || null,
        sizeBreakdown: typeof it.sizeBreakdown === "object" ? JSON.stringify(it.sizeBreakdown) : it.sizeBreakdown || null,
        quantity: qty,
        baseUnitPrice: basePrice,
        customizationDetails: it.customizationDetails || null,
        customizationCost: custCost,
        unitPrice,
        lineTotal,
      };
    });

    const discountPercent = Number(body.discountPercent) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const taxableAmount = subtotal - discountAmount;
    const gstRate = body.gstRate !== undefined && body.gstRate !== null ? Number(body.gstRate) : 5.0;
    const taxAmount = (taxableAmount * gstRate) / 100;
    const grandTotal = Math.round(taxableAmount + taxAmount);

    const validUntil = body.validUntil
      ? new Date(body.validUntil)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const quotation = await prisma.quotation.create({
      data: {
        quoteNumber,
        customerId: body.customerId || null,
        customerName: body.customerName.trim(),
        companyName: body.companyName.trim(),
        clientEmail: body.clientEmail?.trim() || "orders@urbandhaga.com",
        clientPhone: body.clientPhone?.trim() || "—",
        clientGstin: body.clientGstin ? body.clientGstin.trim().toUpperCase() : null,
        shippingAddress: body.shippingAddress || null,
        status: body.status || "DRAFT",
        validUntil,
        subtotal,
        discountPercent,
        discountAmount,
        taxType: body.taxType || "CGST_SGST",
        gstRate,
        taxAmount,
        grandTotal,
        advanceRequiredPercent:
          body.advanceRequiredPercent !== undefined && body.advanceRequiredPercent !== null
            ? Number(body.advanceRequiredPercent)
            : 50.0,
        paymentTerms: body.paymentTerms || "50% advance on approval, 50% prior to dispatch",
        estimatedDays: Number(body.estimatedDays) || 10,
        notes: body.notes || null,
        items: {
          create: formattedItems,
        },
      },
      include: {
        items: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "QUOTE",
        entityId: quotation.id,
        action: "CREATED",
        description: `Estimate ${quoteNumber} created for ${quotation.companyName} (Grand Total: ₹${grandTotal.toLocaleString("en-IN")})`,
        performedBy: "Admin",
      },
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error) {
    console.error("Quotation POST error:", error);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}

