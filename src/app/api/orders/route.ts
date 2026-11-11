import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNextOrderNumbers } from "@/lib/sequence";

export async function GET(request: Request) {
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
  try {
    const body = await request.json();
    if (!body.companyName || !body.contactPerson) {
      return NextResponse.json(
        { error: "Company name and contact person are required" },
        { status: 400 }
      );
    }

    const { orderNumber, jobSheetNumber } = await generateNextOrderNumbers();

    const items = body.items || [];
    let calculatedTotal = 0;

    const formattedItems = items.map((it: {
      productName: string;
      sku?: string;
      sizeBreakdown?: Record<string, number> | string;
      quantity: number;
      unitPrice: number;
      customizationDetails?: string;
    }) => {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      const lineTotal = qty * unitPrice;
      calculatedTotal += lineTotal;

      return {
        productName: it.productName,
        sku: it.sku || "UD-PROD",
        sizeBreakdown: typeof it.sizeBreakdown === "object" ? JSON.stringify(it.sizeBreakdown) : it.sizeBreakdown || null,
        quantity: qty,
        unitPrice,
        customizationDetails: it.customizationDetails || null,
        lineTotal,
      };
    });

    const totalAmount = Number(body.totalAmount) || calculatedTotal;
    const advancePaid = Number(body.advancePaid) || 0;
    const balanceDue = Math.max(0, totalAmount - advancePaid);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        companyName: body.companyName.trim(),
        contactPerson: body.contactPerson.trim(),
        contactEmail: body.contactEmail?.trim() || "orders@urbandhaga.com",
        contactPhone: body.contactPhone?.trim() || "—",
        shippingAddress: body.shippingAddress || "Bangalore, India",
        stage: body.stage || "ORDER_CONFIRMED",
        priority: body.priority || "NORMAL",
        targetDeliveryDate: new Date(body.targetDeliveryDate || Date.now() + 10 * 24 * 60 * 60 * 1000),
        totalAmount,
        advancePaid,
        balanceDue,
        paymentStatus: advancePaid >= totalAmount && totalAmount > 0 ? "FULLY_PAID" : advancePaid > 0 ? "PARTIAL_PAID" : "PENDING",
        jobSheetNumber,
        notes: body.notes || null,
        items: {
          create: formattedItems,
        },
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
      },
      include: {
        items: true,
        qualityCheck: true,
        shipment: true,
        mockups: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "ORDER",
        entityId: order.id,
        action: "CREATED",
        description: `Order ${orderNumber} created for ${order.companyName}`,
        performedBy: "Admin",
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order POST error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

