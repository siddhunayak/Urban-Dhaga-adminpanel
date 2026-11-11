import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        qualityCheck: true,
        mockups: true,
        shipment: true,
        customer: true,
        quotation: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.order.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const advancePaid = body.advancePaid !== undefined ? Number(body.advancePaid) : existing.advancePaid;
    const totalAmount = body.totalAmount !== undefined ? Number(body.totalAmount) : existing.totalAmount;
    const balanceDue = totalAmount - advancePaid;

    let paymentStatus = existing.paymentStatus;
    if (advancePaid >= totalAmount) {
      paymentStatus = "FULLY_PAID";
    } else if (advancePaid > 0) {
      paymentStatus = "PARTIAL_PAID";
    } else {
      paymentStatus = "PENDING";
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        stage: body.stage || existing.stage,
        priority: body.priority || existing.priority,
        targetDeliveryDate: body.targetDeliveryDate ? new Date(body.targetDeliveryDate) : existing.targetDeliveryDate,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        advancePaid,
        balanceDue,
        paymentStatus,
        shippingAddress: body.shippingAddress || existing.shippingAddress,
      },
      include: {
        items: true,
        qualityCheck: true,
        mockups: true,
        shipment: true,
      },
    });

    if (body.stage && body.stage !== existing.stage) {
      await prisma.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: id,
          action: "STAGE_CHANGED",
          description: `Order ${existing.orderNumber} moved from ${existing.stage} to ${body.stage}`,
          performedBy: "Admin",
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Order PATCH error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
