import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import {
  computePaymentStatus,
  isOneOf,
  ORDER_PRIORITIES,
  ORDER_STAGES,
  parseFiniteNumber,
  parseJsonBody,
  parseValidDate,
  TAX_TYPES,
} from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("orders:read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payments: { orderBy: { paidAt: "desc" } },
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
  const auth = await authorize("orders:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const { id } = await params;

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { mockups: true, qualityCheck: true, shipment: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const totalAmount =
      body.totalAmount !== undefined
        ? parseFiniteNumber(body.totalAmount)
        : existing.totalAmount;
    if (totalAmount === null || totalAmount <= 0) {
      return NextResponse.json({ error: "Order total must be greater than zero" }, { status: 400 });
    }

    const rawAdvance =
      body.advancePaid !== undefined
        ? parseFiniteNumber(body.advancePaid)
        : existing.advancePaid;
    if (rawAdvance === null || rawAdvance < 0) {
      return NextResponse.json({ error: "Advance paid must be zero or greater" }, { status: 400 });
    }
    if (rawAdvance > totalAmount) {
      return NextResponse.json({ error: "Advance paid cannot exceed order total" }, { status: 400 });
    }

    const advancePaid = Math.round(rawAdvance * 100) / 100;
    const balanceDue = Math.max(0, Math.round((totalAmount - advancePaid) * 100) / 100);
    const paymentStatus = computePaymentStatus(advancePaid, totalAmount);

    const nextStage = body.stage !== undefined ? String(body.stage) : existing.stage;
    if (!isOneOf(nextStage, ORDER_STAGES)) {
      return NextResponse.json({ error: "Invalid order stage" }, { status: 400 });
    }

    if (nextStage !== existing.stage) {
      if (existing.stage === "CANCELLED") {
        return NextResponse.json({ error: "Cannot change stage of a cancelled order" }, { status: 400 });
      }
      if (existing.stage === "DELIVERED" && nextStage === "CANCELLED") {
        return NextResponse.json({ error: "Cannot cancel an already delivered order" }, { status: 400 });
      }
      if (nextStage === "SAMPLE_APPROVED" && !existing.mockups.some((m) => m.approvalStatus === "APPROVED")) {
        return NextResponse.json(
          { error: "Approve an artwork mockup before moving to Sample Approved" },
          { status: 400 }
        );
      }
      if (nextStage === "READY_FOR_DISPATCH" && !existing.qualityCheck?.passed) {
        return NextResponse.json(
          { error: "Complete and pass the 5-Point Quality Check before marking Ready for Dispatch" },
          { status: 400 }
        );
      }
      if ((nextStage === "DISPATCHED" || nextStage === "DELIVERED") && !existing.shipment) {
        return NextResponse.json(
          { error: "Record shipment courier & AWB details before marking Dispatched or Delivered" },
          { status: 400 }
        );
      }
    }

    const nextPriority = body.priority !== undefined ? String(body.priority) : existing.priority;
    if (!isOneOf(nextPriority, ORDER_PRIORITIES)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    const nextTaxType = body.taxType !== undefined ? String(body.taxType) : existing.taxType;
    if (!isOneOf(nextTaxType, TAX_TYPES)) {
      return NextResponse.json({ error: "Invalid taxType" }, { status: 400 });
    }

    const nextGstRate =
      body.gstRate !== undefined ? parseFiniteNumber(body.gstRate) : existing.gstRate;
    if (nextGstRate === null || nextGstRate < 0 || nextGstRate > 28) {
      return NextResponse.json({ error: "GST rate must be between 0 and 28" }, { status: 400 });
    }

    let nextTargetDate = existing.targetDeliveryDate;
    if (body.targetDeliveryDate !== undefined) {
      const parsedDate = parseValidDate(body.targetDeliveryDate);
      if (!parsedDate) {
        return NextResponse.json({ error: "Invalid target delivery date" }, { status: 400 });
      }
      nextTargetDate = parsedDate;
    }

    const isNowDelivered = nextStage === "DELIVERED" && existing.stage !== "DELIVERED";
    const isNowCancelled = nextStage === "CANCELLED" && existing.stage !== "CANCELLED";

    const updated = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          stage: nextStage,
          priority: nextPriority,
          targetDeliveryDate: nextTargetDate,
          actualDeliveryDate: isNowDelivered ? new Date() : existing.actualDeliveryDate,
          notes: body.notes !== undefined ? (body.notes ? String(body.notes) : null) : existing.notes,
          totalAmount,
          gstRate: nextGstRate,
          taxType: nextTaxType,
          advancePaid,
          balanceDue,
          paymentStatus,
          shippingAddress:
            typeof body.shippingAddress === "string" && body.shippingAddress.trim()
              ? body.shippingAddress.trim()
              : existing.shippingAddress,
        },
      });

      if (isNowDelivered && existing.shipment) {
        await tx.shipmentDetails.update({
          where: { orderId: id },
          data: { status: "DELIVERED", deliveredDate: existing.shipment.deliveredDate ?? new Date() },
        });
      }

      if (existing.customerId) {
        if (isNowCancelled) {
          await tx.customer.update({
            where: { id: existing.customerId },
            data: {
              totalOrders: { decrement: 1 },
              totalSpend: { decrement: existing.totalAmount },
            },
          });
        } else if (existing.stage !== "CANCELLED" && totalAmount !== existing.totalAmount) {
          await tx.customer.update({
            where: { id: existing.customerId },
            data: {
              totalSpend: { increment: totalAmount - existing.totalAmount },
            },
          });
        }
      }

      if (body.advancePaid !== undefined && advancePaid > existing.advancePaid) {
        const delta = Math.round((advancePaid - existing.advancePaid) * 100) / 100;
        await tx.payment.create({
          data: {
            orderId: id,
            amount: delta,
            method:
              typeof body.paymentMethod === "string" && body.paymentMethod.trim()
                ? body.paymentMethod.trim().toUpperCase()
                : "NEFT",
            reference:
              typeof body.paymentReference === "string" && body.paymentReference.trim()
                ? body.paymentReference.trim()
                : null,
            notes: "Payment recorded via order ledger update",
            recordedBy: auth.user.name,
          },
        });
      }

      if (nextStage !== existing.stage) {
        await tx.activityLog.create({
          data: {
            entityType: "ORDER",
            entityId: id,
            action: "STAGE_CHANGED",
            description: `Order ${existing.orderNumber} moved from ${existing.stage} to ${nextStage}`,
            performedBy: auth.user.name,
          },
        });
      }

      if (body.advancePaid !== undefined && advancePaid !== existing.advancePaid) {
        await tx.activityLog.create({
          data: {
            entityType: "ORDER",
            entityId: id,
            action: "PAYMENT_RECORDED",
            description: `Payment updated for ${existing.orderNumber}: ₹${advancePaid.toLocaleString("en-IN")} collected (${paymentStatus})`,
            performedBy: auth.user.name,
          },
        });
      }

      return tx.order.findUnique({
        where: { id },
        include: {
          items: true,
          payments: { orderBy: { paidAt: "desc" } },
          qualityCheck: true,
          mockups: true,
          shipment: true,
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Order PATCH error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("orders:delete");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id } });
      if (!existing) return null;

      if (existing.customerId && existing.stage !== "CANCELLED") {
        await tx.customer.update({
          where: { id: existing.customerId },
          data: {
            totalOrders: { decrement: 1 },
            totalSpend: { decrement: existing.totalAmount },
          },
        });
      }

      await tx.order.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: id,
          action: "DELETED",
          description: `Order ${existing.orderNumber} (${existing.companyName}) deleted`,
          performedBy: auth.user.name,
        },
      });

      return existing;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
