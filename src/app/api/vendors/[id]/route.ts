import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        companyName: body.companyName ?? existing.companyName,
        contactPerson: body.contactPerson ?? existing.contactPerson,
        phone: body.phone ?? existing.phone,
        email: body.email !== undefined ? body.email : existing.email,
        servicesProvided: body.servicesProvided ?? existing.servicesProvided,
        address: body.address !== undefined ? body.address : existing.address,
        rating: body.rating !== undefined ? Number(body.rating) : existing.rating,
        activeJobsCount: body.activeJobsCount !== undefined ? Number(body.activeJobsCount) : existing.activeJobsCount,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Vendor PATCH error:", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.vendor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vendor DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}
