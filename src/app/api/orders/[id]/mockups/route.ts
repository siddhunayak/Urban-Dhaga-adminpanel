import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { isOneOf, MOCKUP_STATUSES, parseJsonBody } from "@/lib/validators";

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
      select: { id: true, mockups: { orderBy: { version: "desc" } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order.mockups);
  } catch (error) {
    console.error("Mockups GET error:", error);
    return NextResponse.json({ error: "Failed to fetch mockups" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("mockups:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Mockup title is required" }, { status: 400 });
  }

  const approvalStatus = body.approvalStatus ? String(body.approvalStatus) : "PENDING_REVIEW";
  if (!isOneOf(approvalStatus, MOCKUP_STATUSES)) {
    return NextResponse.json({ error: "Invalid approvalStatus" }, { status: 400 });
  }

  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) return { error: "Order not found", status: 404 as const };
      if (order.stage === "CANCELLED") {
        return { error: "Cannot add mockup to a cancelled order", status: 400 as const };
      }

      const existingMockups = await tx.orderMockup.findMany({
        where: { orderId: id },
        select: { version: true },
      });
      const nextVersion = existingMockups.reduce((max, m) => Math.max(max, m.version), 0) + 1;

      const mockup = await tx.orderMockup.create({
        data: {
          orderId: id,
          title,
          fileUrl:
            typeof body.fileUrl === "string" && body.fileUrl.trim()
              ? body.fileUrl.trim()
              : "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
          version: nextVersion,
          approvalStatus,
          clientFeedback:
            typeof body.clientFeedback === "string" && body.clientFeedback.trim()
              ? body.clientFeedback.trim()
              : null,
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: id,
          action: "MOCKUP_UPLOADED",
          description: `Mockup "${mockup.title}" (v${mockup.version}) added for client review`,
          performedBy: auth.user.name,
        },
      });

      return { mockup };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.mockup, { status: 201 });
  } catch (error) {
    console.error("Mockups POST error:", error);
    return NextResponse.json({ error: "Failed to add mockup" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("mockups:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const mockupId = typeof body.mockupId === "string" ? body.mockupId.trim() : "";
  const approvalStatus = body.approvalStatus ? String(body.approvalStatus) : "";
  if (!mockupId || !approvalStatus) {
    return NextResponse.json({ error: "mockupId and approvalStatus are required" }, { status: 400 });
  }
  if (!isOneOf(approvalStatus, MOCKUP_STATUSES)) {
    return NextResponse.json({ error: "Invalid approvalStatus" }, { status: 400 });
  }

  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.orderMockup.findFirst({
        where: { id: mockupId, orderId: id },
      });
      if (!target) {
        return { error: "Mockup not found for this order", status: 404 as const };
      }

      const updated = await tx.orderMockup.update({
        where: { id: mockupId },
        data: {
          approvalStatus,
          clientFeedback:
            body.clientFeedback !== undefined
              ? body.clientFeedback
                ? String(body.clientFeedback)
                : null
              : undefined,
        },
      });

      if (approvalStatus === "APPROVED" && body.autoAdvanceStage) {
        const order = await tx.order.findUnique({ where: { id } });
        if (order && (order.stage === "ORDER_CONFIRMED" || order.stage === "ARTWORK_SUBMITTED")) {
          await tx.order.update({
            where: { id },
            data: { stage: "SAMPLE_APPROVED" },
          });
          await tx.activityLog.create({
            data: {
              entityType: "ORDER",
              entityId: id,
              action: "STAGE_CHANGED",
              description: `Order ${order.orderNumber} moved from ${order.stage} to SAMPLE_APPROVED`,
              performedBy: auth.user.name,
            },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: id,
          action: "MOCKUP_UPDATED",
          description: `Mockup "${updated.title}" (v${updated.version}) marked ${updated.approvalStatus}`,
          performedBy: auth.user.name,
        },
      });

      return { updated };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.updated);
  } catch (error) {
    console.error("Mockups PATCH error:", error);
    return NextResponse.json({ error: "Failed to update mockup" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("mockups:write");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    let mockupId = searchParams.get("mockupId")?.trim() || "";
    if (!mockupId) {
      const parsed = await parseJsonBody<{ mockupId?: string }>(request);
      if (parsed.ok && typeof parsed.data.mockupId === "string") {
        mockupId = parsed.data.mockupId.trim();
      }
    }
    if (!mockupId) {
      return NextResponse.json({ error: "mockupId is required" }, { status: 400 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const target = await tx.orderMockup.findFirst({ where: { id: mockupId, orderId: id } });
      if (!target) return null;
      await tx.orderMockup.delete({ where: { id: mockupId } });
      await tx.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: id,
          action: "MOCKUP_DELETED",
          description: `Mockup "${target.title}" (v${target.version}) removed`,
          performedBy: auth.user.name,
        },
      });
      return target;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Mockup not found for this order" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mockups DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete mockup" }, { status: 500 });
  }
}
