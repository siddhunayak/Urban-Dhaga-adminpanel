import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const shipment = await prisma.shipmentDetails.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        courierPartner: body.courierPartner || "Shiprocket / Delhivery",
        trackingNumber: body.trackingNumber,
        dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : new Date(),
        estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : null,
        packageCount: Number(body.packageCount) || 1,
        totalWeightKg: body.totalWeightKg ? Number(body.totalWeightKg) : null,
        status: body.status || "MANIFESTED",
        trackingUrl: body.trackingUrl || `https://shiprocket.co/tracking/${body.trackingNumber}`,
      },
      update: {
        courierPartner: body.courierPartner || undefined,
        trackingNumber: body.trackingNumber || undefined,
        dispatchDate: body.dispatchDate ? new Date(body.dispatchDate) : undefined,
        estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : undefined,
        packageCount: body.packageCount ? Number(body.packageCount) : undefined,
        totalWeightKg: body.totalWeightKg ? Number(body.totalWeightKg) : undefined,
        status: body.status || undefined,
        trackingUrl: body.trackingUrl || undefined,
      },
    });

    // Advance order stage to DISPATCHED if manifested/dispatched
    if (body.advanceStage) {
      await prisma.order.update({
        where: { id },
        data: { stage: "DISPATCHED" },
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: "ORDER",
        entityId: id,
        action: "DISPATCHED",
        description: `Shipment booked with ${shipment.courierPartner} (AWB: ${shipment.trackingNumber})`,
        performedBy: "Operations",
      },
    });

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("Shipment POST error:", error);
    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 });
  }
}
