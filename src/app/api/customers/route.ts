import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { generateNextCustomerCode, runTxWithRetry } from "@/lib/sequence";
import { EMAIL_RE, GSTIN_RE, parseJsonBody } from "@/lib/validators";

export async function GET(request: Request) {
  const auth = await authorize("customers:read");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactPerson: { contains: search } },
        { customerCode: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        orders: {
          select: { id: true, orderNumber: true, totalAmount: true, stage: true, createdAt: true },
        },
      },
      orderBy: { totalSpend: "desc" },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize("customers:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  const contactPerson = typeof body.contactPerson === "string" ? body.contactPerson.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!companyName || !contactPerson || !email || !phone) {
    return NextResponse.json(
      { error: "Company name, contact person, email, and phone are required" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const gstin =
    typeof body.gstin === "string" && body.gstin.trim()
      ? body.gstin.trim().toUpperCase()
      : null;
  if (gstin && !GSTIN_RE.test(gstin)) {
    return NextResponse.json(
      { error: "GSTIN must be 15 characters (e.g. 29ABCDE1234F1Z5)" },
      { status: 400 }
    );
  }

  try {
    const customer = await runTxWithRetry(async (tx) => {
      const customerCode = await generateNextCustomerCode(tx);

      const created = await tx.customer.create({
        data: {
          customerCode,
          companyName,
          contactPerson,
          email,
          phone,
          gstin,
          address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
          city: typeof body.city === "string" && body.city.trim() ? body.city.trim() : null,
          state: typeof body.state === "string" && body.state.trim() ? body.state.trim() : "Karnataka",
          pincode: typeof body.pincode === "string" && body.pincode.trim() ? body.pincode.trim() : null,
          notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "CUSTOMER",
          entityId: created.id,
          action: "CREATED",
          description: `Customer ${created.customerCode} (${created.companyName}) registered`,
          performedBy: auth.user.name,
        },
      });

      return created;
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Customer POST error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
