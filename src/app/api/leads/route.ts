import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { generateNextLeadNumber, runTxWithRetry } from "@/lib/sequence";
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

function hasValidWebhookSecret(request: Request): boolean {
  const configured = process.env.LEAD_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");
  if (!configured || !provided) return false;
  const a = Buffer.from(configured);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const auth = await authorize("leads:read");
  if (!auth.ok) return auth.response;

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
  let actorName: string;
  if (request.headers.has("x-webhook-secret")) {
    if (!hasValidWebhookSecret(request)) {
      return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    }
    actorName = "Website / Webhook";
  } else {
    const auth = await authorize("leads:write");
    if (!auth.ok) return auth.response;
    actorName = auth.user.name;
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const requirement = typeof body.requirement === "string" ? body.requirement.trim() : "";

  if (!companyName || !contactPerson || !phone || !requirement) {
    return NextResponse.json(
      { error: "Company name, contact person, phone, and requirement are required" },
      { status: 400 }
    );
  }

  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : "pending@urbandhaga.com";
  if (typeof body.email === "string" && body.email.trim() && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const category = body.category ? String(body.category) : "APPAREL";
  if (!isOneOf(category, LEAD_CATEGORIES)) {
    return NextResponse.json({ error: "Invalid lead category" }, { status: 400 });
  }

  const stage = body.stage ? String(body.stage) : "NEW";
  if (!isOneOf(stage, LEAD_STAGES)) {
    return NextResponse.json({ error: "Invalid lead stage" }, { status: 400 });
  }

  const source = body.source ? String(body.source) : "WEBSITE";
  if (!isOneOf(source, LEAD_SOURCES)) {
    return NextResponse.json({ error: "Invalid lead source" }, { status: 400 });
  }

  const rawQty = body.estimatedQuantity ?? body.estimatedQty;
  const estimatedQuantity =
    rawQty !== undefined && rawQty !== null && rawQty !== ""
      ? parseFiniteNumber(rawQty)
      : 100;
  if (estimatedQuantity === null || estimatedQuantity <= 0 || !Number.isInteger(estimatedQuantity)) {
    return NextResponse.json(
      { error: "estimatedQuantity must be a positive integer" },
      { status: 400 }
    );
  }

  const estimatedBudget =
    body.estimatedBudget !== undefined && body.estimatedBudget !== null && body.estimatedBudget !== ""
      ? parseFiniteNumber(body.estimatedBudget)
      : null;
  if (
    body.estimatedBudget !== undefined &&
    body.estimatedBudget !== null &&
    body.estimatedBudget !== "" &&
    (estimatedBudget === null || estimatedBudget < 0)
  ) {
    return NextResponse.json(
      { error: "estimatedBudget must be zero or greater" },
      { status: 400 }
    );
  }

  let targetDate: Date | null = null;
  if (body.targetDate) {
    targetDate = parseValidDate(body.targetDate);
    if (!targetDate) {
      return NextResponse.json({ error: "Invalid targetDate" }, { status: 400 });
    }
  }

  try {
    const lead = await runTxWithRetry(async (tx) => {
      const leadNumber = await generateNextLeadNumber(tx);

      const created = await tx.lead.create({
        data: {
          leadNumber,
          companyName,
          contactPerson,
          email,
          phone,
          city: typeof body.city === "string" && body.city.trim() ? body.city.trim() : null,
          requirement,
          category,
          estimatedQuantity,
          estimatedBudget,
          targetDate,
          stage,
          source,
          notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
          assignedTo:
            typeof body.assignedTo === "string" && body.assignedTo.trim()
              ? body.assignedTo.trim()
              : "Sales Team",
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "LEAD",
          entityId: created.id,
          action: "CREATED",
          description: `New lead ${created.leadNumber} created for ${created.companyName} (${created.estimatedQuantity} pcs)`,
          performedBy: actorName,
        },
      });

      return created;
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Lead create error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
