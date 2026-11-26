import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { PaymentError, recordOrderPayment } from "@/lib/payments";
import { parseJsonBody } from "@/lib/validators";

export async function GET(request: Request) {
  const auth = await authorize("payments:read");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const method = searchParams.get("method");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (orderId) where.orderId = orderId;
    if (method && method !== "ALL") where.method = method;
    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { notes: { contains: search } },
        { order: { orderNumber: { contains: search } } },
        { order: { companyName: { contains: search } } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            invoiceNumber: true,
            companyName: true,
            totalAmount: true,
            advancePaid: true,
            balanceDue: true,
            paymentStatus: true,
          },
        },
      },
      orderBy: { paidAt: "desc" },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Payments GET error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize("payments:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    const result = await recordOrderPayment(orderId, body, auth.user.name);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Payments POST error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
