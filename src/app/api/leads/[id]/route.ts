import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        stage: body.stage !== undefined ? body.stage : existingLead.stage,
        notes: body.notes !== undefined ? body.notes : existingLead.notes,
        assignedTo: body.assignedTo !== undefined ? body.assignedTo : existingLead.assignedTo,
        estimatedQuantity: body.estimatedQuantity ? Number(body.estimatedQuantity) : existingLead.estimatedQuantity,
        estimatedBudget: body.estimatedBudget ? Number(body.estimatedBudget) : existingLead.estimatedBudget,
      },
    });

    if (body.stage && body.stage !== existingLead.stage) {
      await prisma.activityLog.create({
        data: {
          entityType: "LEAD",
          entityId: id,
          action: "STAGE_CHANGED",
          description: `Lead ${existingLead.leadNumber} moved to ${body.stage}`,
          performedBy: "Admin",
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Lead PATCH error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}

