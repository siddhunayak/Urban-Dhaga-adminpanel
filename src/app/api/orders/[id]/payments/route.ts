import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { PaymentError, recordOrderPayment } from "@/lib/payments";
import { parseJsonBody } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("payments:read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, payments: { orderBy: { paidAt: "desc" } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order.payments);
  } catch (error) {
    console.error("Order payments GET error:", error);
    return NextResponse.json({ error: "Failed to fetch order payments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("payments:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;

  try {
    const { id } = await params;
    const result = await recordOrderPayment(id, parsed.data, auth.user.name);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Order payments POST error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
