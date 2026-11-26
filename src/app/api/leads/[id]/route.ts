import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import {
  EMAIL_RE,
  isOneOf,
  LEAD_CATEGORIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  parseFiniteNumber,
  parseJsonBody,
  parseValidDate,
} from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("leads:read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (error) {
    console.error("Lead GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("leads:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const { id } = await params;
    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const stage = body.stage !== undefined ? String(body.stage) : existingLead.stage;
    if (!isOneOf(stage, LEAD_STAGES)) {
      return NextResponse.json({ error: "Invalid lead stage" }, { status: 400 });
    }

    const category = body.category !== undefined ? String(body.category) : existingLead.category;
    if (!isOneOf(category, LEAD_CATEGORIES)) {
      return NextResponse.json({ error: "Invalid lead category" }, { status: 400 });
    }

    const source = body.source !== undefined ? String(body.source) : existingLead.source;
    if (!isOneOf(source, LEAD_SOURCES)) {
      return NextResponse.json({ error: "Invalid lead source" }, { status: 400 });
    }

    let estimatedQuantity = existingLead.estimatedQuantity;
    if (body.estimatedQuantity !== undefined) {
      const q = parseFiniteNumber(body.estimatedQuantity);
      if (q === null || q <= 0 || !Number.isInteger(q)) {
        return NextResponse.json(
          { error: "estimatedQuantity must be a positive integer" },
          { status: 400 }
        );
      }
      estimatedQuantity = q;
    }

    let estimatedBudget = existingLead.estimatedBudget;
    if (body.estimatedBudget !== undefined) {
      if (body.estimatedBudget === null || body.estimatedBudget === "") {
        estimatedBudget = null;
      } else {
        const b = parseFiniteNumber(body.estimatedBudget);
        if (b === null || b < 0) {
          return NextResponse.json(
            { error: "estimatedBudget must be zero or greater" },
            { status: 400 }
          );
        }
        estimatedBudget = b;
      }
    }

    let targetDate = existingLead.targetDate;
    if (body.targetDate !== undefined) {
      if (body.targetDate === null || body.targetDate === "") {
        targetDate = null;
      } else {
        const d = parseValidDate(body.targetDate);
        if (!d) {
          return NextResponse.json({ error: "Invalid targetDate" }, { status: 400 });
        }
        targetDate = d;
      }
    }

    const email =
      body.email !== undefined ? String(body.email).trim().toLowerCase() : existingLead.email;
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    const companyName =
      body.companyName !== undefined
        ? String(body.companyName).trim()
        : existingLead.companyName;
    const contactPerson =
      body.contactPerson !== undefined
        ? String(body.contactPerson).trim()
        : existingLead.contactPerson;
    const phone =
      body.phone !== undefined ? String(body.phone).trim() : existingLead.phone;
    const requirement =
      body.requirement !== undefined
        ? String(body.requirement).trim()
        : existingLead.requirement;
    if (!companyName || !contactPerson || !phone || !requirement) {
      return NextResponse.json(
        { error: "Company name, contact person, phone, and requirement cannot be blank" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: {
          companyName,
          contactPerson,
          email,
          phone,
          city:
            body.city !== undefined
              ? body.city
                ? String(body.city).trim()
                : null
              : existingLead.city,
          requirement,
          category,
          stage,
          source,
          targetDate,
          notes:
            body.notes !== undefined
              ? body.notes
                ? String(body.notes).trim()
                : null
              : existingLead.notes,
          assignedTo:
            body.assignedTo !== undefined
              ? body.assignedTo
                ? String(body.assignedTo).trim()
                : null
              : existingLead.assignedTo,
          estimatedQuantity,
          estimatedBudget,
        },
      });

      if (stage !== existingLead.stage) {
        await tx.activityLog.create({
          data: {
            entityType: "LEAD",
            entityId: id,
            action: "STAGE_CHANGED",
            description: `Lead ${existingLead.leadNumber} moved from ${existingLead.stage} to ${stage}`,
            performedBy: auth.user.name,
          },
        });
      }

      return lead;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Lead PATCH error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("leads:write");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findUnique({ where: { id } });
      if (!existing) return null;
      await tx.lead.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          entityType: "LEAD",
          entityId: id,
          action: "DELETED",
          description: `Lead ${existing.leadNumber} (${existing.companyName}) deleted`,
          performedBy: auth.user.name,
        },
      });
      return existing;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
