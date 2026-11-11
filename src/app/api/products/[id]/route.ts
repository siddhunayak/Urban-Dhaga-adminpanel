import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        pricingTiers: { orderBy: { minQty: "asc" } },
        variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("Product GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        category: body.category ?? existing.category,
        description: body.description ?? existing.description,
        basePrice: body.basePrice !== undefined ? Number(body.basePrice) : existing.basePrice,
        gstRate: body.gstRate !== undefined ? Number(body.gstRate) : existing.gstRate,
        hsnCode: body.hsnCode ?? existing.hsnCode,
        material: body.material !== undefined ? body.material : existing.material,
        leadTimeDays: body.leadTimeDays !== undefined ? Number(body.leadTimeDays) : existing.leadTimeDays,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
      include: { pricingTiers: true, variants: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Product PATCH error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: "Failed to archive product" }, { status: 500 });
  }
}
