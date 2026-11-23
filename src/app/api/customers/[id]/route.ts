import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        companyName: body.companyName ?? existing.companyName,
        contactPerson: body.contactPerson ?? existing.contactPerson,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        gstin: body.gstin !== undefined ? body.gstin : existing.gstin,
        address: body.address !== undefined ? body.address : existing.address,
        city: body.city !== undefined ? body.city : existing.city,
        state: body.state !== undefined ? body.state : existing.state,
        pincode: body.pincode !== undefined ? body.pincode : existing.pincode,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Customer PATCH error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderCount = await prisma.order.count({ where: { customerId: id } });
    if (orderCount > 0) {
      return NextResponse.json(
        { error: `This customer has ${orderCount} order(s) and can't be deleted` },
        { status: 409 }
      );
    }
    await prisma.quotation.updateMany({ where: { customerId: id }, data: { customerId: null } });
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
