import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { EMAIL_RE, parseFiniteNumber, parseJsonBody } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("vendors:read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Vendor GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("vendors:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const { id } = await params;
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    const companyName =
      body.companyName !== undefined ? String(body.companyName).trim() : existing.companyName;
    const contactPerson =
      body.contactPerson !== undefined
        ? String(body.contactPerson).trim()
        : existing.contactPerson;
    const phone = body.phone !== undefined ? String(body.phone).trim() : existing.phone;
    const servicesProvided =
      body.servicesProvided !== undefined
        ? String(body.servicesProvided).trim()
        : existing.servicesProvided;

    if (!name || !companyName || !contactPerson || !phone || !servicesProvided) {
      return NextResponse.json(
        { error: "Name, company name, contact person, phone, and services cannot be blank" },
        { status: 400 }
      );
    }

    let email = existing.email;
    if (body.email !== undefined) {
      email =
        typeof body.email === "string" && body.email.trim()
          ? body.email.trim().toLowerCase()
          : null;
      if (email && !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
      }
    }

    let rating = existing.rating;
    if (body.rating !== undefined) {
      const r = parseFiniteNumber(body.rating);
      if (r === null || r < 0 || r > 5) {
        return NextResponse.json({ error: "Rating must be between 0 and 5" }, { status: 400 });
      }
      rating = r;
    }

    let activeJobsCount = existing.activeJobsCount;
    if (body.activeJobsCount !== undefined) {
      const jobs = parseFiniteNumber(body.activeJobsCount);
      if (jobs === null || jobs < 0 || !Number.isInteger(jobs)) {
        return NextResponse.json(
          { error: "activeJobsCount must be a non-negative integer" },
          { status: 400 }
        );
      }
      activeJobsCount = jobs;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.vendor.update({
        where: { id },
        data: {
          name,
          companyName,
          contactPerson,
          phone,
          email,
          servicesProvided,
          address:
            body.address !== undefined
              ? body.address
                ? String(body.address).trim()
                : null
              : existing.address,
          rating,
          activeJobsCount,
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "VENDOR",
          entityId: id,
          action: "UPDATED",
          description: `Vendor ${v.name} updated`,
          performedBy: auth.user.name,
        },
      });

      return v;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Vendor PATCH error:", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("vendors:write");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.vendor.findUnique({ where: { id } });
      if (!existing) return null;
      await tx.vendor.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          entityType: "VENDOR",
          entityId: id,
          action: "DELETED",
          description: `Vendor ${existing.name} deleted`,
          performedBy: auth.user.name,
        },
      });
      return existing;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vendor DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}
