import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (stage && stage !== "ALL") {
      where.stage = stage;
    }
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
        { requirement: { contains: search } },
        { leadNumber: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const count = await prisma.lead.count();
    const leadNumber = `LD-${1040 + count + 1}`;

    const lead = await prisma.lead.create({
      data: {
        leadNumber,
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        email: body.email,
        phone: body.phone,
        city: body.city || null,
        requirement: body.requirement,
        category: body.category || "APPAREL",
        estimatedQuantity: Number(body.estimatedQuantity) || 100,
        estimatedBudget: body.estimatedBudget ? Number(body.estimatedBudget) : null,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        stage: body.stage || "NEW",
        source: body.source || "WEBSITE",
        notes: body.notes || null,
        assignedTo: body.assignedTo || "Sales Team",
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "LEAD",
        entityId: lead.id,
        action: "CREATED",
        description: `New lead created for ${lead.companyName} (${lead.estimatedQuantity} pcs)`,
        performedBy: "Admin",
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Lead create error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
