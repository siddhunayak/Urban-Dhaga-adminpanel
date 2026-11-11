import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const qc = await prisma.qualityCheck.findUnique({
      where: { orderId: id },
    });
    return NextResponse.json(qc);
  } catch (error) {
    console.error("QC GET error:", error);
    return NextResponse.json({ error: "Failed to fetch QC record" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const fabric = Boolean(body.fabricQualityChecked);
    const print = Boolean(body.printFidelityChecked);
    const color = Boolean(body.colorAccuracyChecked);
    const stitching = Boolean(body.stitchingFinishChecked);
    const packaging = Boolean(body.packagingChecked);

    const allPassed = fabric && print && color && stitching && packaging;

    const qc = await prisma.qualityCheck.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        fabricQualityChecked: fabric,
        printFidelityChecked: print,
        colorAccuracyChecked: color,
        stitchingFinishChecked: stitching,
        packagingChecked: packaging,
        passed: allPassed,
        inspectedBy: body.inspectedBy || "Quality Inspector",
        remarks: body.remarks || null,
        checkedAt: new Date(),
      },
      update: {
        fabricQualityChecked: fabric,
        printFidelityChecked: print,
        colorAccuracyChecked: color,
        stitchingFinishChecked: stitching,
        packagingChecked: packaging,
        passed: allPassed,
        inspectedBy: body.inspectedBy || "Quality Inspector",
        remarks: body.remarks || null,
        checkedAt: new Date(),
      },
    });

    if (allPassed && body.autoAdvanceStage) {
      await prisma.order.update({
        where: { id },
        data: { stage: "READY_FOR_DISPATCH" },
      });
    }

    await prisma.activityLog.create({
      data: {
        entityType: "ORDER",
        entityId: id,
        action: allPassed ? "QC_PASSED" : "QC_UPDATED",
        description: allPassed
          ? `Order passed 5-Point Quality Check successfully!`
          : `Quality Check checklist updated (${[fabric, print, color, stitching, packaging].filter(Boolean).length}/5 passed)`,
        performedBy: body.inspectedBy || "Quality Inspector",
      },
    });

    return NextResponse.json(qc);
  } catch (error) {
    console.error("QC POST error:", error);
    return NextResponse.json({ error: "Failed to update QC record" }, { status: 500 });
  }
}

