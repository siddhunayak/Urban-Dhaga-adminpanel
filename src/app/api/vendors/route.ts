import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
  try {
    const body = await request.json();
    const vendor = await prisma.vendor.create({
      data: {
        name: body.name,
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        phone: body.phone,
        email: body.email || null,
        servicesProvided: body.servicesProvided,
        address: body.address || null,
        rating: Number(body.rating) || 5.0,
      },
    });
    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error("Vendor POST error:", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}

