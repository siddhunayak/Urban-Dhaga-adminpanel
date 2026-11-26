import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import {
  isOneOf,
  parseFiniteNumber,
  parseJsonBody,
  prismaErrorCode,
  PRODUCT_CATEGORIES,
} from "@/lib/validators";

export async function GET(request: Request) {
  const auth = await authorize("products:read");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: Record<string, unknown> = includeInactive ? {} : { isActive: true };
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
  const auth = await authorize("products:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const sku = typeof body.sku === "string" ? body.sku.trim().toUpperCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = body.category ? String(body.category) : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const basePrice = parseFiniteNumber(body.basePrice);

  if (!sku || !name || !category) {
    return NextResponse.json(
      { error: "SKU, product name, and category are required" },
      { status: 400 }
    );
  }
  if (!isOneOf(category, PRODUCT_CATEGORIES)) {
    return NextResponse.json({ error: "Invalid product category" }, { status: 400 });
  }
  if (basePrice === null || basePrice < 0) {
    return NextResponse.json({ error: "basePrice must be zero or greater" }, { status: 400 });
  }

  const gstRate =
    body.gstRate !== undefined && body.gstRate !== null && body.gstRate !== ""
      ? parseFiniteNumber(body.gstRate)
      : 5.0;
  if (gstRate === null || gstRate < 0 || gstRate > 28) {
    return NextResponse.json({ error: "gstRate must be between 0 and 28" }, { status: 400 });
  }

  const leadTimeDays =
    body.leadTimeDays !== undefined && body.leadTimeDays !== null && body.leadTimeDays !== ""
      ? parseFiniteNumber(body.leadTimeDays)
      : 7;
  if (leadTimeDays === null || leadTimeDays < 1 || !Number.isInteger(leadTimeDays)) {
    return NextResponse.json({ error: "leadTimeDays must be a positive integer" }, { status: 400 });
  }

  const rawTiers = Array.isArray(body.pricingTiers) ? body.pricingTiers : [];
  const tiers: { minQty: number; maxQty: number | null; unitPrice: number }[] = [];
  for (const t of rawTiers) {
    if (!t || typeof t !== "object") continue;
    const minQty = parseFiniteNumber((t as { minQty?: unknown }).minQty);
    const maxQtyRaw = (t as { maxQty?: unknown }).maxQty;
    const maxQty =
      maxQtyRaw === undefined || maxQtyRaw === null || maxQtyRaw === ""
        ? null
        : parseFiniteNumber(maxQtyRaw);
    const unitPrice = parseFiniteNumber((t as { unitPrice?: unknown }).unitPrice);
    if (minQty === null || minQty < 1 || !Number.isInteger(minQty)) {
      return NextResponse.json({ error: "Tier minQty must be a positive integer" }, { status: 400 });
    }
    if (maxQty !== null && (!Number.isInteger(maxQty) || maxQty < minQty)) {
      return NextResponse.json({ error: "Tier maxQty must be >= minQty" }, { status: 400 });
    }
    if (unitPrice === null || unitPrice < 0) {
      return NextResponse.json({ error: "Tier unitPrice must be zero or greater" }, { status: 400 });
    }
    tiers.push({ minQty, maxQty, unitPrice });
  }

  const rawVariants = Array.isArray(body.variants) ? body.variants : [];
  const variants: {
    sku: string;
    size: string;
    color: string;
    colorHex: string;
    currentStock: number;
    lowStockThreshold: number;
  }[] = [];
  for (const v of rawVariants) {
    if (!v || typeof v !== "object") continue;
    const rec = v as Record<string, unknown>;
    const vSku = typeof rec.sku === "string" ? rec.sku.trim().toUpperCase() : "";
    const size = typeof rec.size === "string" ? rec.size.trim() : "";
    const color = typeof rec.color === "string" ? rec.color.trim() : "";
    if (!vSku || !size || !color) {
      return NextResponse.json(
        { error: "Each variant requires sku, size, and color" },
        { status: 400 }
      );
    }
    const currentStock =
      rec.currentStock !== undefined && rec.currentStock !== ""
        ? parseFiniteNumber(rec.currentStock)
        : 0;
    const lowStockThreshold =
      rec.lowStockThreshold !== undefined && rec.lowStockThreshold !== ""
        ? parseFiniteNumber(rec.lowStockThreshold)
        : 20;
    if (currentStock === null || currentStock < 0 || !Number.isInteger(currentStock)) {
      return NextResponse.json({ error: "Variant currentStock must be >= 0" }, { status: 400 });
    }
    if (lowStockThreshold === null || lowStockThreshold < 0 || !Number.isInteger(lowStockThreshold)) {
      return NextResponse.json({ error: "Variant lowStockThreshold must be >= 0" }, { status: 400 });
    }
    variants.push({
      sku: vSku,
      size,
      color,
      colorHex: typeof rec.colorHex === "string" && rec.colorHex.trim() ? rec.colorHex.trim() : "#000000",
      currentStock,
      lowStockThreshold,
    });
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku,
          name,
          category,
          description: description || name,
          basePrice,
          gstRate,
          hsnCode: typeof body.hsnCode === "string" && body.hsnCode.trim() ? body.hsnCode.trim() : "6109",
          material: typeof body.material === "string" && body.material.trim() ? body.material.trim() : null,
          leadTimeDays,
          images: Array.isArray(body.images) ? JSON.stringify(body.images) : "[]",
          pricingTiers: { create: tiers },
          variants: { create: variants },
        },
        include: {
          pricingTiers: { orderBy: { minQty: "asc" } },
          variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "PRODUCT",
          entityId: created.id,
          action: "CREATED",
          description: `New catalog item added: ${created.name} (${created.sku})`,
          performedBy: auth.user.name,
        },
      });

      return created;
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (prismaErrorCode(error) === "P2002") {
      return NextResponse.json(
        { error: "A product or variant with this SKU already exists" },
        { status: 409 }
      );
    }
    console.error("Product POST error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
