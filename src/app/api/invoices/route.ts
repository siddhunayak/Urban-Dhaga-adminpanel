import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get("paymentStatus");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      stage: { not: "CANCELLED" },
    };

    if (paymentStatus && paymentStatus !== "ALL") {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        customer: {
          select: { gstin: true, customerCode: true },
        },
        quotation: {
          select: { gstRate: true, taxType: true, quoteNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const invoices = orders.map((o) => ({
      id: o.id,
      invoiceNumber: o.orderNumber.replace("UD-ORD-", "UD-INV-"),
      orderNumber: o.orderNumber,
      companyName: o.companyName,
      contactPerson: o.contactPerson,
      contactPhone: o.contactPhone,
      shippingAddress: o.shippingAddress,
      clientGstin: o.customer?.gstin || null,
      gstRate: o.quotation?.gstRate || 5.0,
      taxType: o.quotation?.taxType || "CGST_SGST",
      stage: o.stage,
      totalAmount: o.totalAmount,
      advancePaid: o.advancePaid,
      balanceDue: o.balanceDue,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      items: o.items,
    }));

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Invoices GET error:", error);
    return NextResponse.json({ error: "Failed to fetch invoices ledger" }, { status: 500 });
  }
}
