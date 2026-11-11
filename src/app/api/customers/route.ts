import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNextCustomerCode } from "@/lib/sequence";

export async function GET(request: Request) {
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
  try {
    const body = await request.json();
    if (!body.companyName || !body.contactPerson || !body.email || !body.phone) {
      return NextResponse.json(
        { error: "Company name, contact person, email, and phone are required" },
        { status: 400 }
      );
    }

    const customerCode = await generateNextCustomerCode();

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        companyName: body.companyName.trim(),
        contactPerson: body.contactPerson.trim(),
        email: body.email.trim(),
        phone: body.phone.trim(),
        gstin: body.gstin ? body.gstin.trim().toUpperCase() : null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || "Karnataka",
        pincode: body.pincode || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Customer POST error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}

