import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { parseJsonBody } from "@/lib/validators";

const LATE_STAGES = new Set(["READY_FOR_DISPATCH", "DISPATCHED", "DELIVERED", "CANCELLED"]);

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
      select: { id: true, qualityCheck: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order.qualityCheck);
  } catch (error) {
    console.error("QC GET error:", error);
    return NextResponse.json({ error: "Failed to fetch QC record" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("qc:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const fabric = Boolean(body.fabricQualityChecked);
  const print = Boolean(body.printFidelityChecked);
  const color = Boolean(body.colorAccuracyChecked);
  const stitching = Boolean(body.stitchingFinishChecked);
  const packaging = Boolean(body.packagingChecked);
  const allPassed = fabric && print && color && stitching && packaging;
  const inspectedBy =
    typeof body.inspectedBy === "string" && body.inspectedBy.trim()
      ? body.inspectedBy.trim()
      : auth.user.name;
  const remarks = typeof body.remarks === "string" && body.remarks.trim() ? body.remarks.trim() : null;

  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) return { error: "Order not found", status: 404 as const };
      if (order.stage === "CANCELLED") {
        return { error: "Cannot inspect a cancelled order", status: 400 as const };
      }

      const qc = await tx.qualityCheck.upsert({
        where: { orderId: id },
        create: {
          orderId: id,
          fabricQualityChecked: fabric,
          printFidelityChecked: print,
          colorAccuracyChecked: color,
          stitchingFinishChecked: stitching,
          packagingChecked: packaging,
          passed: allPassed,
          inspectedBy,
          remarks,
          checkedAt: new Date(),
        },
        update: {
          fabricQualityChecked: fabric,
          printFidelityChecked: print,
          colorAccuracyChecked: color,
          stitchingFinishChecked: stitching,
          packagingChecked: packaging,
          passed: allPassed,
          inspectedBy,
          remarks,
          checkedAt: new Date(),
        },
      });

      if (allPassed && body.autoAdvanceStage && !LATE_STAGES.has(order.stage)) {
        await tx.order.update({
          where: { id },
          data: { stage: "READY_FOR_DISPATCH" },
        });
        await tx.activityLog.create({
          data: {
            entityType: "ORDER",
            entityId: id,
            action: "STAGE_CHANGED",
            description: `Order ${order.orderNumber} moved from ${order.stage} to READY_FOR_DISPATCH`,
            performedBy: auth.user.name,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          entityType: "ORDER",
          entityId: id,
          action: allPassed ? "QC_PASSED" : "QC_UPDATED",
          description: allPassed
            ? `Order ${order.orderNumber} passed 5-Point Quality Check!`
            : `Quality Check checklist updated for ${order.orderNumber} (${[fabric, print, color, stitching, packaging].filter(Boolean).length}/5 passed)`,
          performedBy: auth.user.name,
        },
      });

      return { qc };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.qc);
  } catch (error) {
    console.error("QC POST error:", error);
    return NextResponse.json({ error: "Failed to update QC record" }, { status: 500 });
  }
}
