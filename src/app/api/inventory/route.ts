import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { isOneOf, parseFiniteNumber, parseJsonBody } from "@/lib/validators";

const ADJUSTMENT_TYPES = ["INWARD", "ADD", "DISPATCH", "DEDUCT", "SET"] as const;

export async function GET(request: Request) {
  const auth = await authorize("inventory:read");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get("lowStockOnly") === "true";
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const variants = await prisma.productVariant.findMany({
      where: includeInactive ? undefined : { product: { isActive: true } },
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
  const auth = await authorize("inventory:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const variantId = typeof body.variantId === "string" ? body.variantId.trim() : "";
  const adjustmentType = body.adjustmentType ? String(body.adjustmentType).toUpperCase() : "";
  const rawQty = parseFiniteNumber(body.quantity);

  if (!variantId) {
    return NextResponse.json({ error: "variantId is required" }, { status: 400 });
  }
  if (!isOneOf(adjustmentType, ADJUSTMENT_TYPES)) {
    return NextResponse.json(
      { error: `Invalid adjustmentType. Allowed: ${ADJUSTMENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (rawQty === null || !Number.isInteger(rawQty) || rawQty < 0) {
    return NextResponse.json({ error: "quantity must be a non-negative integer" }, { status: 400 });
  }
  if (adjustmentType !== "SET" && rawQty === 0) {
    return NextResponse.json({ error: "quantity must be greater than zero" }, { status: 400 });
  }

  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : "";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });
      if (!variant) {
        return { error: "Variant not found", status: 404 as const };
      }

      let newStock = variant.currentStock;
      if (adjustmentType === "INWARD" || adjustmentType === "ADD") {
        newStock = variant.currentStock + rawQty;
      } else if (adjustmentType === "DISPATCH" || adjustmentType === "DEDUCT") {
        if (rawQty > variant.currentStock) {
          return {
            error: `Insufficient stock for ${variant.sku} (available: ${variant.currentStock}, requested deduction: ${rawQty})`,
            status: 400 as const,
          };
        }
        newStock = variant.currentStock - rawQty;
      } else {
        newStock = rawQty;
      }

      const updated = await tx.productVariant.update({
        where: { id: variantId },
        data: { currentStock: newStock },
        include: { product: true },
      });

      await tx.activityLog.create({
        data: {
          entityType: "INVENTORY",
          entityId: variant.id,
          action: "UPDATED",
          description: `Stock adjusted for ${variant.product.name} (${variant.sku}): ${variant.currentStock} -> ${newStock} (${adjustmentType}: ${rawQty})${notes ? ` [${notes}]` : ""}`,
          performedBy: auth.user.name,
        },
      });

      return { updated };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.updated);
  } catch (error) {
    console.error("Inventory PATCH error:", error);
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}
