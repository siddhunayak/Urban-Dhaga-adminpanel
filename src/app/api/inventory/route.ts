import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const variants = await prisma.productVariant.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            basePrice: true,
          },
        },
      },
      orderBy: [
        { product: { name: "asc" } },
        { color: "asc" },
        { size: "asc" },
      ],
    });

    let filtered = variants;

    if (category && category !== "ALL") {
      filtered = filtered.filter((v) => v.product.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          v.product.name.toLowerCase().includes(q) ||
          v.color.toLowerCase().includes(q) ||
          v.size.toLowerCase().includes(q)
      );
    }

    if (lowStockOnly) {
      filtered = filtered.filter((v) => v.currentStock <= v.lowStockThreshold);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Inventory GET error:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { variantId, adjustmentType, quantity, notes } = body;

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    let newStock = variant.currentStock;
    const qty = Math.abs(Number(quantity));

    if (adjustmentType === "INWARD" || adjustmentType === "ADD") {
      newStock += qty;
    } else if (adjustmentType === "DISPATCH" || adjustmentType === "DEDUCT") {
      newStock = Math.max(0, newStock - qty);
    } else if (adjustmentType === "SET") {
      newStock = Math.max(0, qty);
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { currentStock: newStock },
      include: { product: true },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "INVENTORY",
        entityId: variant.id,
        action: "UPDATED",
        description: `Stock adjusted for ${variant.product.name} (${variant.sku}): ${variant.currentStock} -> ${newStock} (${adjustmentType}: ${qty}) ${notes ? `[${notes}]` : ""}`,
        performedBy: "Admin",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Inventory PATCH error:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}

