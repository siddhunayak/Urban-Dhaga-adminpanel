import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: "Mockup title is required" }, { status: 400 });
    }

    const existingMockups = await prisma.orderMockup.findMany({
      where: { orderId: id },
      select: { version: true },
    });
    const nextVersion = existingMockups.reduce((max, m) => Math.max(max, m.version), 0) + 1;

    const mockup = await prisma.orderMockup.create({
      data: {
        orderId: id,
        title: body.title.trim(),
        fileUrl:
          body.fileUrl?.trim() ||
          "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
        version: nextVersion,
        approvalStatus: body.approvalStatus || "PENDING_REVIEW",
        clientFeedback: body.clientFeedback || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "ORDER",
        entityId: id,
        action: "MOCKUP_UPLOADED",
        description: `Mockup "${mockup.title}" (v${mockup.version}) added for client review`,
        performedBy: "Design",
      },
    });

    return NextResponse.json(mockup, { status: 201 });
  } catch (error) {
    console.error("Mockups POST error:", error);
    return NextResponse.json({ error: "Failed to add mockup" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.mockupId || !body.approvalStatus) {
      return NextResponse.json(
        { error: "mockupId and approvalStatus are required" },
        { status: 400 }
      );
    }

    const updated = await prisma.orderMockup.update({
      where: { id: body.mockupId },
      data: {
        approvalStatus: body.approvalStatus,
        clientFeedback: body.clientFeedback !== undefined ? body.clientFeedback : undefined,
      },
    });

    if (body.approvalStatus === "APPROVED" && body.autoAdvanceStage) {
      const order = await prisma.order.findUnique({ where: { id } });
      if (order && (order.stage === "ORDER_CONFIRMED" || order.stage === "ARTWORK_SUBMITTED")) {
        await prisma.order.update({
          where: { id },
          data: { stage: "SAMPLE_APPROVED" },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        entityType: "ORDER",
        entityId: id,
        action: "MOCKUP_UPDATED",
        description: `Mockup "${updated.title}" (v${updated.version}) marked ${updated.approvalStatus}`,
        performedBy: "Design",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Mockups PATCH error:", error);
    return NextResponse.json({ error: "Failed to update mockup" }, { status: 500 });
  }
}
