import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { isActive: true };
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        pricingTiers: {
          orderBy: { minQty: "asc" },
        },
        variants: {
          orderBy: [{ color: "asc" }, { size: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const product = await prisma.product.create({
      data: {
        sku: body.sku,
        name: body.name,
        category: body.category,
        description: body.description,
        basePrice: Number(body.basePrice),
        gstRate: Number(body.gstRate) || 5.0,
        hsnCode: body.hsnCode || "6109",
        material: body.material || null,
        leadTimeDays: Number(body.leadTimeDays) || 7,
        images: body.images ? JSON.stringify(body.images) : "[]",
        pricingTiers: {
          create: (body.pricingTiers || []).map((t: { minQty: number; maxQty?: number | null; unitPrice: number }) => ({
            minQty: Number(t.minQty),
            maxQty: t.maxQty ? Number(t.maxQty) : null,
            unitPrice: Number(t.unitPrice),
          })),
        },
        variants: {
          create: (body.variants || []).map((v: { sku: string; size: string; color: string; colorHex?: string; currentStock?: number; lowStockThreshold?: number }) => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex || "#000000",
            currentStock: Number(v.currentStock) || 0,
            lowStockThreshold: Number(v.lowStockThreshold) || 20,
          })),
        },
      },
      include: {
        pricingTiers: true,
        variants: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "PRODUCT",
        entityId: product.id,
        action: "CREATED",
        description: `New catalog item added: ${product.name} (${product.sku})`,
        performedBy: "Admin",
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Product POST error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

