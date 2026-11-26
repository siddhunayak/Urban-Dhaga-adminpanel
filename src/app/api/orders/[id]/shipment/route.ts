import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import {
  buildTrackingUrl,
  isOneOf,
  parseFiniteNumber,
  parseJsonBody,
  parseValidDate,
  SHIPMENT_STATUSES,
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
      select: { id: true, shipment: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order.shipment);
  } catch (error) {
    console.error("Shipment GET error:", error);
    return NextResponse.json({ error: "Failed to fetch shipment" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("shipment:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";
  if (!trackingNumber) {
    return NextResponse.json({ error: "AWB / trackingNumber is required" }, { status: 400 });
  }

  const courierPartner =
    typeof body.courierPartner === "string" && body.courierPartner.trim()
      ? body.courierPartner.trim()
      : "Shiprocket / Delhivery";

  const status = body.status ? String(body.status) : "MANIFESTED";
  if (!isOneOf(status, SHIPMENT_STATUSES)) {
    return NextResponse.json({ error: "Invalid shipment status" }, { status: 400 });
  }

  const packageCount =
    body.packageCount !== undefined && body.packageCount !== null && body.packageCount !== ""
      ? parseFiniteNumber(body.packageCount)
      : 1;
  if (packageCount === null || packageCount < 1 || !Number.isInteger(packageCount)) {
    return NextResponse.json({ error: "packageCount must be a positive integer" }, { status: 400 });
  }

  const totalWeightKg =
    body.totalWeightKg !== undefined && body.totalWeightKg !== null && body.totalWeightKg !== ""
      ? parseFiniteNumber(body.totalWeightKg)
      : null;
  if (body.totalWeightKg !== undefined && body.totalWeightKg !== null && body.totalWeightKg !== "" && (totalWeightKg === null || totalWeightKg <= 0)) {
    return NextResponse.json({ error: "totalWeightKg must be greater than zero" }, { status: 400 });
  }

  const dispatchDate = body.dispatchDate ? parseValidDate(body.dispatchDate) : new Date();
  if (!dispatchDate) {
    return NextResponse.json({ error: "Invalid dispatchDate" }, { status: 400 });
  }

  let estimatedDelivery: Date | null = null;
  if (body.estimatedDelivery) {
    estimatedDelivery = parseValidDate(body.estimatedDelivery);
    if (!estimatedDelivery) {
      return NextResponse.json({ error: "Invalid estimatedDelivery date" }, { status: 400 });
    }
  }

  const trackingUrl = buildTrackingUrl(
    courierPartner,
    trackingNumber,
    typeof body.trackingUrl === "string" ? body.trackingUrl : null
  );

  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) return { error: "Order not found", status: 404 as const };
      if (order.stage === "CANCELLED") {
        return { error: "Cannot ship a cancelled order", status: 400 as const };
      }

      const deliveredDate = status === "DELIVERED" ? new Date() : undefined;

      const shipment = await tx.shipmentDetails.upsert({
        where: { orderId: id },
        create: {
          orderId: id,
          courierPartner,
          trackingNumber,
          dispatchDate,
          estimatedDelivery,
          deliveredDate: deliveredDate ?? null,
          packageCount,
          totalWeightKg,
          status,
          trackingUrl,
        },
        update: {
          courierPartner,
          trackingNumber,
          dispatchDate: body.dispatchDate ? dispatchDate : undefined,
          estimatedDelivery: body.estimatedDelivery ? estimatedDelivery : undefined,
          deliveredDate,
          packageCount,
          totalWeightKg: totalWeightKg ?? undefined,
          status,
          trackingUrl,
        },
      });

      if (status === "DELIVERED" && order.stage !== "DELIVERED") {
        await tx.order.update({
          where: { id },
          data: { stage: "DELIVERED", actualDeliveryDate: new Date() },
        });
        await tx.activityLog.create({
          data: {
            entityType: "ORDER",
            entityId: id,
            action: "STAGE_CHANGED",
            description: `Order ${order.orderNumber} marked DELIVERED`,
            performedBy: auth.user.name,
          },
        });
      } else if (body.advanceStage && order.stage === "READY_FOR_DISPATCH") {
        await tx.order.update({
          where: { id },
          data: { stage: "DISPATCHED" },
        });
        await tx.activityLog.create({
          data: {
            entityType: "ORDER",
            entityId: id,
            action: "STAGE_CHANGED",
            description: `Order ${order.orderNumber} moved from READY_FOR_DISPATCH to DISPATCHED`,
            performedBy: auth.user.name,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: id,
          action: "DISPATCHED",
          description: `Shipment ${status.toLowerCase()} with ${shipment.courierPartner} (AWB: ${shipment.trackingNumber})`,
          performedBy: auth.user.name,
        },
      });

      return { shipment };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.shipment);
  } catch (error) {
    console.error("Shipment POST error:", error);
    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 });
  }
}
