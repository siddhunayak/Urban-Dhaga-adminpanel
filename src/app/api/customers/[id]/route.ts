import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { EMAIL_RE, GSTIN_RE, parseJsonBody } from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("customers:read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: "desc" } },
        quotations: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Customer GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("customers:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const { id } = await params;
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const companyName =
      body.companyName !== undefined
        ? String(body.companyName).trim()
        : existing.companyName;
    const contactPerson =
      body.contactPerson !== undefined
        ? String(body.contactPerson).trim()
        : existing.contactPerson;
    const email =
      body.email !== undefined
        ? String(body.email).trim().toLowerCase()
        : existing.email;
    const phone =
      body.phone !== undefined ? String(body.phone).trim() : existing.phone;

    if (!companyName || !contactPerson || !email || !phone) {
      return NextResponse.json(
        { error: "Company name, contact person, email, and phone cannot be blank" },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    let gstin = existing.gstin;
    if (body.gstin !== undefined) {
      gstin =
        typeof body.gstin === "string" && body.gstin.trim()
          ? body.gstin.trim().toUpperCase()
          : null;
      if (gstin && !GSTIN_RE.test(gstin)) {
        return NextResponse.json(
          { error: "GSTIN must be 15 characters (e.g. 29ABCDE1234F1Z5)" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cust = await tx.customer.update({
        where: { id },
        data: {
          companyName,
          contactPerson,
          email,
          phone,
          gstin,
          address:
            body.address !== undefined
              ? body.address
                ? String(body.address).trim()
                : null
              : existing.address,
          city:
            body.city !== undefined
              ? body.city
                ? String(body.city).trim()
                : null
              : existing.city,
          state:
            body.state !== undefined
              ? body.state
                ? String(body.state).trim()
                : null
              : existing.state,
          pincode:
            body.pincode !== undefined
              ? body.pincode
                ? String(body.pincode).trim()
                : null
              : existing.pincode,
          notes:
            body.notes !== undefined
              ? body.notes
                ? String(body.notes).trim()
                : null
              : existing.notes,
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "CUSTOMER",
          entityId: id,
          action: "UPDATED",
          description: `Customer ${cust.customerCode} (${cust.companyName}) updated`,
          performedBy: auth.user.name,
        },
      });

      return cust;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Customer PATCH error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("customers:write");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({ where: { id } });
      if (!existing) return { error: "Customer not found", status: 404 as const };

      const orderCount = await tx.order.count({ where: { customerId: id } });
      if (orderCount > 0) {
        return {
          error: `This customer has ${orderCount} order(s) and can't be deleted`,
          status: 409 as const,
        };
      }

      await tx.quotation.updateMany({ where: { customerId: id }, data: { customerId: null } });
      await tx.customer.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          entityType: "CUSTOMER",
          entityId: id,
          action: "DELETED",
          description: `Customer ${existing.customerCode} (${existing.companyName}) deleted`,
          performedBy: auth.user.name,
        },
      });

      return { ok: true as const };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
