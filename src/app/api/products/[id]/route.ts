import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import {
  isOneOf,
  parseFiniteNumber,
  parseJsonBody,
  PRODUCT_CATEGORIES,
} from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("products:read");
  if (!auth.ok) return auth.response;

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
  const auth = await authorize("products:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    if (!name) {
      return NextResponse.json({ error: "Product name cannot be blank" }, { status: 400 });
    }

    const category = body.category !== undefined ? String(body.category) : existing.category;
    if (!isOneOf(category, PRODUCT_CATEGORIES)) {
      return NextResponse.json({ error: "Invalid product category" }, { status: 400 });
    }

    const basePrice =
      body.basePrice !== undefined ? parseFiniteNumber(body.basePrice) : existing.basePrice;
    if (basePrice === null || basePrice < 0) {
      return NextResponse.json({ error: "basePrice must be zero or greater" }, { status: 400 });
    }

    const gstRate =
      body.gstRate !== undefined ? parseFiniteNumber(body.gstRate) : existing.gstRate;
    if (gstRate === null || gstRate < 0 || gstRate > 28) {
      return NextResponse.json({ error: "gstRate must be between 0 and 28" }, { status: 400 });
    }

    const leadTimeDays =
      body.leadTimeDays !== undefined
        ? parseFiniteNumber(body.leadTimeDays)
        : existing.leadTimeDays;
    if (leadTimeDays === null || leadTimeDays < 1 || !Number.isInteger(leadTimeDays)) {
      return NextResponse.json({ error: "leadTimeDays must be a positive integer" }, { status: 400 });
    }

    let replacementTiers: { minQty: number; maxQty: number | null; unitPrice: number }[] | null = null;
    if (Array.isArray(body.pricingTiers)) {
      replacementTiers = [];
      for (const t of body.pricingTiers) {
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
        replacementTiers.push({ minQty, maxQty, unitPrice });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (replacementTiers !== null) {
        await tx.pricingTier.deleteMany({ where: { productId: id } });
      }

      const prod = await tx.product.update({
        where: { id },
        data: {
          name,
          category,
          description:
            body.description !== undefined ? String(body.description).trim() : existing.description,
          basePrice,
          gstRate,
          hsnCode: body.hsnCode !== undefined ? String(body.hsnCode).trim() : existing.hsnCode,
          material:
            body.material !== undefined
              ? body.material
                ? String(body.material).trim()
                : null
              : existing.material,
          leadTimeDays,
          isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
          images: Array.isArray(body.images) ? JSON.stringify(body.images) : existing.images,
          ...(replacementTiers !== null
            ? { pricingTiers: { create: replacementTiers } }
            : {}),
        },
        include: {
          pricingTiers: { orderBy: { minQty: "asc" } },
          variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
        },
      });

      await tx.activityLog.create({
        data: {
          entityType: "PRODUCT",
          entityId: id,
          action: "UPDATED",
          description: `Catalog item ${prod.name} (${prod.sku}) updated`,
          performedBy: auth.user.name,
        },
      });

      return prod;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Product PATCH error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("products:write");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const archived = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) return null;

      await tx.product.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.activityLog.create({
        data: {
          entityType: "PRODUCT",
          entityId: id,
          action: "ARCHIVED",
          description: `Catalog item ${existing.name} (${existing.sku}) archived`,
          performedBy: auth.user.name,
        },
      });

      return existing;
    });

    if (!archived) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product DELETE error:", error);
    return NextResponse.json({ error: "Failed to archive product" }, { status: 500 });
  }
}
