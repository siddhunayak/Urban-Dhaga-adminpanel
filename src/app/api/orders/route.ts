import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { generateNextOrderNumbers, runTxWithRetry } from "@/lib/sequence";
import {
  computePaymentStatus,
  isOneOf,
  ORDER_PRIORITIES,
  ORDER_STAGES,
  parseFiniteNumber,
  parseJsonBody,
  parseValidDate,
  PAYMENT_METHODS,
  TAX_TYPES,
} from "@/lib/validators";

export async function GET(request: Request) {
  const auth = await authorize("orders:read");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (stage && stage !== "ALL") {
      where.stage = stage;
    }
    if (priority && priority !== "ALL") {
      where.priority = priority;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
        { jobSheetNumber: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        payments: { orderBy: { paidAt: "desc" } },
        qualityCheck: true,
        mockups: true,
        shipment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize("orders:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
    const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
    if (!companyName || !contactPerson) {
      return NextResponse.json(
        { error: "Company name and contact person are required" },
        { status: 400 }
      );
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems.filter(
      (it): it is Record<string, unknown> =>
        Boolean(it && typeof it === "object" && typeof (it as { productName?: unknown }).productName === "string" && (it as { productName: string }).productName.trim())
    );
    if (items.length === 0) {
      return NextResponse.json({ error: "Add at least one line item" }, { status: 400 });
    }

    let calculatedTotal = 0;
    const formattedItems: {
      productName: string;
      sku: string;
      sizeBreakdown: string | null;
      quantity: number;
      unitPrice: number;
      customizationDetails: string | null;
      lineTotal: number;
    }[] = [];

    for (const it of items) {
      const qty = parseFiniteNumber(it.quantity);
      const unitPrice = parseFiniteNumber(it.unitPrice);
      if (qty === null || qty <= 0 || !Number.isInteger(qty)) {
        return NextResponse.json({ error: "Each line item quantity must be a positive integer" }, { status: 400 });
      }
      if (unitPrice === null || unitPrice < 0) {
        return NextResponse.json({ error: "Each line item unit price must be zero or greater" }, { status: 400 });
      }
      const lineTotal = Math.round(qty * unitPrice * 100) / 100;
      calculatedTotal += lineTotal;
      formattedItems.push({
        productName: String(it.productName).trim(),
        sku: typeof it.sku === "string" && it.sku.trim() ? it.sku.trim() : "UD-PROD",
        sizeBreakdown:
          typeof it.sizeBreakdown === "object" && it.sizeBreakdown !== null
            ? JSON.stringify(it.sizeBreakdown)
            : typeof it.sizeBreakdown === "string" && it.sizeBreakdown.trim()
            ? it.sizeBreakdown.trim()
            : null,
        quantity: qty,
        unitPrice,
        customizationDetails:
          typeof it.customizationDetails === "string" && it.customizationDetails.trim()
            ? it.customizationDetails.trim()
            : null,
        lineTotal,
      });
    }

    const totalAmount =
      body.totalAmount !== undefined && body.totalAmount !== null
        ? parseFiniteNumber(body.totalAmount)
        : calculatedTotal;
    if (totalAmount === null || totalAmount <= 0) {
      return NextResponse.json({ error: "Order total must be greater than zero" }, { status: 400 });
    }

    const advancePaid =
      body.advancePaid !== undefined && body.advancePaid !== null && body.advancePaid !== ""
        ? parseFiniteNumber(body.advancePaid)
        : 0;
    if (advancePaid === null || advancePaid < 0) {
      return NextResponse.json({ error: "Advance paid must be zero or greater" }, { status: 400 });
    }
    if (advancePaid > totalAmount) {
      return NextResponse.json({ error: "Advance paid cannot exceed order total" }, { status: 400 });
    }

    const stage = body.stage ? String(body.stage) : "ORDER_CONFIRMED";
    if (!isOneOf(stage, ORDER_STAGES)) {
      return NextResponse.json({ error: "Invalid order stage" }, { status: 400 });
    }
    const priority = body.priority ? String(body.priority) : "NORMAL";
    if (!isOneOf(priority, ORDER_PRIORITIES)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    const taxType = body.taxType ? String(body.taxType) : "CGST_SGST";
    if (!isOneOf(taxType, TAX_TYPES)) {
      return NextResponse.json({ error: "Invalid taxType (CGST_SGST or IGST)" }, { status: 400 });
    }
    const gstRate =
      body.gstRate !== undefined && body.gstRate !== null && body.gstRate !== ""
        ? parseFiniteNumber(body.gstRate)
        : 5.0;
    if (gstRate === null || gstRate < 0 || gstRate > 28) {
      return NextResponse.json({ error: "GST rate must be between 0 and 28" }, { status: 400 });
    }

    const targetDeliveryDate = body.targetDeliveryDate
      ? parseValidDate(body.targetDeliveryDate)
      : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    if (!targetDeliveryDate) {
      return NextResponse.json({ error: "Invalid target delivery date" }, { status: 400 });
    }

    const paymentMethod = body.paymentMethod ? String(body.paymentMethod).toUpperCase() : "NEFT";
    if (advancePaid > 0 && !isOneOf(paymentMethod, PAYMENT_METHODS)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const customerIdInput = typeof body.customerId === "string" && body.customerId.trim() ? body.customerId.trim() : null;
    const balanceDue = Math.max(0, Math.round((totalAmount - advancePaid) * 100) / 100);
    const paymentStatus = computePaymentStatus(advancePaid, totalAmount);

    const order = await runTxWithRetry(async (tx) => {
      let customerId: string | null = null;
      if (customerIdInput) {
        const customer = await tx.customer.findUnique({ where: { id: customerIdInput } });
        if (!customer) {
          throw new Error("CUSTOMER_NOT_FOUND");
        }
        customerId = customer.id;
      }

      const { orderNumber, jobSheetNumber, invoiceNumber } = await generateNextOrderNumbers(tx);

      const created = await tx.order.create({
        data: {
          orderNumber,
          invoiceNumber,
          customerId,
          companyName,
          contactPerson,
          contactEmail:
            typeof body.contactEmail === "string" && body.contactEmail.trim()
              ? body.contactEmail.trim()
              : "orders@urbandhaga.com",
          contactPhone:
            typeof body.contactPhone === "string" && body.contactPhone.trim()
              ? body.contactPhone.trim()
              : "—",
          shippingAddress:
            typeof body.shippingAddress === "string" && body.shippingAddress.trim()
              ? body.shippingAddress.trim()
              : "Bangalore, India",
          stage,
          priority,
          targetDeliveryDate,
          gstRate,
          taxType,
          totalAmount,
          advancePaid,
          balanceDue,
          paymentStatus,
          jobSheetNumber,
          notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
          items: { create: formattedItems },
          qualityCheck: {
            create: {
              fabricQualityChecked: false,
              printFidelityChecked: false,
              colorAccuracyChecked: false,
              stitchingFinishChecked: false,
              packagingChecked: false,
              passed: false,
            },
          },
          ...(advancePaid > 0
            ? {
                payments: {
                  create: {
                    amount: advancePaid,
                    method: paymentMethod,
                    reference:
                      typeof body.paymentReference === "string" && body.paymentReference.trim()
                        ? body.paymentReference.trim()
                        : null,
                    notes: "Initial advance recorded on order creation",
                    recordedBy: auth.user.name,
                  },
                },
              }
            : {}),
        },
        include: {
          items: true,
          payments: { orderBy: { paidAt: "desc" } },
          qualityCheck: true,
          shipment: true,
          mockups: true,
        },
      });

      if (customerId && stage !== "CANCELLED") {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpend: { increment: totalAmount },
          },
        });
      }

      await tx.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: created.id,
          action: "CREATED",
          description: `Order ${orderNumber} created for ${created.companyName}`,
          performedBy: auth.user.name,
        },
      });

      return created;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return NextResponse.json({ error: "Selected customer no longer exists" }, { status: 400 });
    }
    console.error("Order POST error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
