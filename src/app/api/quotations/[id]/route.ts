import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        order: true,
        customer: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Quotation GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Check if converting to Order
    if (body.action === "CONVERT_TO_ORDER") {
      const orderCount = await prisma.order.count();
      const orderNumber = `UD-ORD-2026-${String(19 + orderCount).padStart(4, "0")}`;
      const jobSheetNumber = `JS-2026-${String(90 + orderCount).padStart(4, "0")}`;

      const advancePaid = (existing.grandTotal * existing.advanceRequiredPercent) / 100;
      const balanceDue = existing.grandTotal - advancePaid;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          quotationId: existing.id,
          customerId: existing.customerId,
          companyName: existing.companyName,
          contactPerson: existing.customerName,
          contactEmail: existing.clientEmail,
          contactPhone: existing.clientPhone,
          shippingAddress: existing.shippingAddress || "Bangalore, Karnataka",
          stage: "ORDER_CONFIRMED",
          priority: "NORMAL",
          targetDeliveryDate: new Date(Date.now() + (existing.estimatedDays || 10) * 24 * 60 * 60 * 1000),
          totalAmount: existing.grandTotal,
          advancePaid,
          balanceDue,
          paymentStatus: "PARTIAL_PAID",
          jobSheetNumber,
          notes: `Converted from quotation ${existing.quoteNumber}. ${existing.notes || ""}`,
          items: {
            create: existing.items.map((it) => ({
              productName: it.productTitle,
              sku: "UD-PROD",
              sizeBreakdown: it.sizeBreakdown,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              customizationDetails: it.customizationDetails,
              lineTotal: it.lineTotal,
            })),
          },
          qualityCheck: {
            create: {
              fabricQualityChecked: false,
              printFidelityChecked: false,
              colorAccuracyChecked: false,
              stitchingFinishChecked: false,
              packagingChecked: false,
              passed: false,
              remarks: "Initial QC ticket generated with order.",
            },
          },
        },
        include: {
          items: true,
          qualityCheck: true,
        },
      });

      // Update quote status to ACCEPTED
      await prisma.quotation.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });

      await prisma.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: order.id,
          action: "CREATED",
          description: `Order ${orderNumber} created from quotation ${existing.quoteNumber}`,
          performedBy: "Admin",
        },
      });

      return NextResponse.json({ success: true, order });
    }

    // General update
    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: body.status || existing.status,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    });

    if (body.status && body.status !== existing.status) {
      await prisma.activityLog.create({
        data: {
          entityType: "QUOTE",
          entityId: id,
          action: "UPDATED",
          description: `Quote ${existing.quoteNumber} status marked as ${body.status}`,
          performedBy: "Admin",
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Quotation PATCH error:", error);
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Quotation DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}
