import { prisma } from "@/lib/prisma";
import { computePaymentStatus, isOneOf, parseFiniteNumber, parseValidDate, PAYMENT_METHODS } from "@/lib/validators";

export class PaymentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface RecordPaymentInput {
  amount?: unknown;
  method?: unknown;
  reference?: unknown;
  notes?: unknown;
  paidAt?: unknown;
}

export async function recordOrderPayment(
  orderId: string,
  input: RecordPaymentInput,
  recordedBy: string
) {
  const amount = parseFiniteNumber(input.amount);
  if (amount === null || amount <= 0) {
    throw new PaymentError("Payment amount must be greater than zero", 400);
  }

  const method = input.method !== undefined && input.method !== null && input.method !== ""
    ? String(input.method).toUpperCase()
    : "NEFT";
  if (!isOneOf(method, PAYMENT_METHODS)) {
    throw new PaymentError(`Invalid payment method. Allowed: ${PAYMENT_METHODS.join(", ")}`, 400);
  }

  const paidAt = input.paidAt ? parseValidDate(input.paidAt) : new Date();
  if (!paidAt) {
    throw new PaymentError("Invalid payment date", 400);
  }

  const reference = typeof input.reference === "string" && input.reference.trim() ? input.reference.trim() : null;
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new PaymentError("Order not found", 404);
    }
    if (order.stage === "CANCELLED") {
      throw new PaymentError("Cannot record payment against a cancelled order", 400);
    }
    if (order.balanceDue <= 0) {
      throw new PaymentError("Order is already fully paid", 400);
    }
    if (amount > order.balanceDue + 0.01) {
      throw new PaymentError(
        `Payment amount (₹${amount}) exceeds remaining balance (₹${order.balanceDue})`,
        400
      );
    }

    const appliedAmount = Math.min(amount, order.balanceDue);
    const newAdvancePaid = Math.round((order.advancePaid + appliedAmount) * 100) / 100;
    const newBalanceDue = Math.max(0, Math.round((order.totalAmount - newAdvancePaid) * 100) / 100);
    const paymentStatus = computePaymentStatus(newAdvancePaid, order.totalAmount);

    const payment = await tx.payment.create({
      data: {
        orderId,
        amount: appliedAmount,
        method,
        reference,
        notes,
        recordedBy,
        paidAt,
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        advancePaid: newAdvancePaid,
        balanceDue: newBalanceDue,
        paymentStatus,
      },
      include: {
        items: true,
        payments: { orderBy: { paidAt: "desc" } },
        qualityCheck: true,
        mockups: true,
        shipment: true,
      },
    });

    await tx.activityLog.create({
      data: {
        entityType: "ORDER",
        entityId: orderId,
        action: "PAYMENT_RECORDED",
        description: `Recorded ₹${appliedAmount.toLocaleString("en-IN")} (${method}${reference ? ` · ${reference}` : ""}) for ${order.orderNumber} — ${paymentStatus}`,
        performedBy: recordedBy,
      },
    });

    return { payment, order: updatedOrder };
  });
}
