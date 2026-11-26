import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { EMAIL_RE, parseFiniteNumber, parseJsonBody } from "@/lib/validators";

export async function GET() {
  const auth = await authorize("vendors:read");
  if (!auth.ok) return auth.response;

  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { rating: "desc" },
    });
    return NextResponse.json(vendors);
  } catch (error) {
    console.error("Vendors GET error:", error);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize("vendors:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const companyName =
    typeof body.companyName === "string" && body.companyName.trim()
      ? body.companyName.trim()
      : name;
  const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const servicesProvided =
    typeof body.servicesProvided === "string" ? body.servicesProvided.trim() : "";

  if (!name || !contactPerson || !phone || !servicesProvided) {
    return NextResponse.json(
      { error: "Vendor name, contact person, phone, and services provided are required" },
      { status: 400 }
    );
  }

  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : null;
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const rating =
    body.rating !== undefined && body.rating !== null && body.rating !== ""
      ? parseFiniteNumber(body.rating)
      : 5.0;
  if (rating === null || rating < 0 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 0 and 5" }, { status: 400 });
  }

  try {
    const vendor = await prisma.$transaction(async (tx) => {
      const created = await tx.vendor.create({
        data: {
          name,
          companyName,
          contactPerson,
          phone,
          email,
          servicesProvided,
          address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
          rating,
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "VENDOR",
          entityId: created.id,
          action: "CREATED",
          description: `Vendor ${created.name} (${created.servicesProvided}) added`,
          performedBy: auth.user.name,
        },
      });

      return created;
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error("Vendor POST error:", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}
