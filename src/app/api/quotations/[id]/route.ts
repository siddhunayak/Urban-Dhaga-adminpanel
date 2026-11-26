import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { generateNextOrderNumbers, runTxWithRetry } from "@/lib/sequence";
import {
  isOneOf,
  parseFiniteNumber,
  parseJsonBody,
  parseValidDate,
  QUOTATION_STATUSES,
} from "@/lib/validators";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("quotations:read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        order: true,
        customer: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Quotation GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("quotations:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const { id } = await params;

    if (body.action === "CONVERT_TO_ORDER") {
      const result = await runTxWithRetry(async (tx) => {
        const existing = await tx.quotation.findUnique({
          where: { id },
          include: { items: true, order: true },
        });
        if (!existing) {
          return { error: "Quotation not found", status: 404 as const };
        }
        if (existing.order) {
          return {
            error: `Quotation already converted to order ${existing.order.orderNumber}`,
            status: 409 as const,
          };
        }
        if (existing.status === "REJECTED" || existing.status === "EXPIRED") {
          return {
            error: `Cannot convert a ${existing.status.toLowerCase()} quotation to an order`,
            status: 400 as const,
          };
        }

        const productIds = existing.items
          .map((it) => it.productId)
          .filter((pid): pid is string => Boolean(pid));
        const products = productIds.length
          ? await tx.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, sku: true },
            })
          : [];
        const skuMap = new Map(products.map((p) => [p.id, p.sku]));

        const { orderNumber, jobSheetNumber, invoiceNumber } = await generateNextOrderNumbers(tx);

        const order = await tx.order.create({
          data: {
            orderNumber,
            invoiceNumber,
            quotationId: existing.id,
            customerId: existing.customerId,
            companyName: existing.companyName,
            contactPerson: existing.customerName,
            contactEmail: existing.clientEmail,
            contactPhone: existing.clientPhone,
            shippingAddress: existing.shippingAddress || "Bangalore, Karnataka",
            stage: "ORDER_CONFIRMED",
            priority: "NORMAL",
            targetDeliveryDate: new Date(
              Date.now() + (existing.estimatedDays || 10) * 24 * 60 * 60 * 1000
            ),
            gstRate: existing.gstRate,
            taxType: existing.taxType,
            totalAmount: existing.grandTotal,
            advancePaid: 0,
            balanceDue: existing.grandTotal,
            paymentStatus: "PENDING",
            jobSheetNumber,
            notes: `Converted from quotation ${existing.quoteNumber}.${existing.notes ? ` ${existing.notes}` : ""}`,
            items: {
              create: existing.items.map((it) => ({
                productName: it.productTitle,
                sku: (it.productId && skuMap.get(it.productId)) || "UD-PROD",
                sizeBreakdown: it.sizeBreakdown,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                customizationDetails: it.customizationDetails,
                lineTotal: it.lineTotal,
              })),
            },
            qualityCheck: {
              create: {
                fabricQualityChecked: false,
                printFidelityChecked: false,
                colorAccuracyChecked: false,
                stitchingFinishChecked: false,
                packagingChecked: false,
                passed: false,
                remarks: "Initial QC ticket generated with order.",
              },
            },
          },
          include: {
            items: true,
            payments: true,
            qualityCheck: true,
          },
        });

        await tx.quotation.update({
          where: { id },
          data: { status: "ACCEPTED" },
        });

        if (existing.customerId) {
          await tx.customer.update({
            where: { id: existing.customerId },
            data: {
              totalOrders: { increment: 1 },
              totalSpend: { increment: existing.grandTotal },
            },
          });
        }

        await tx.activityLog.create({
          data: {
            entityType: "ORDER",
            entityId: order.id,
            action: "CREATED",
            description: `Order ${orderNumber} created from quotation ${existing.quoteNumber}`,
            performedBy: auth.user.name,
          },
        });

        return { order };
      });

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ success: true, order: result.order });
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const nextStatus = body.status !== undefined ? String(body.status) : existing.status;
    if (!isOneOf(nextStatus, QUOTATION_STATUSES)) {
      return NextResponse.json({ error: "Invalid quotation status" }, { status: 400 });
    }

    let validUntil = existing.validUntil;
    if (body.validUntil !== undefined) {
      const d = parseValidDate(body.validUntil);
      if (!d) {
        return NextResponse.json({ error: "Invalid validUntil date" }, { status: 400 });
      }
      validUntil = d;
    }

    let estimatedDays = existing.estimatedDays;
    if (body.estimatedDays !== undefined) {
      const days = parseFiniteNumber(body.estimatedDays);
      if (days === null || days < 1 || !Number.isInteger(days)) {
        return NextResponse.json(
          { error: "estimatedDays must be a positive integer" },
          { status: 400 }
        );
      }
      estimatedDays = days;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.update({
        where: { id },
        data: {
          status: nextStatus,
          notes:
            body.notes !== undefined
              ? body.notes
                ? String(body.notes)
                : null
              : existing.notes,
          validUntil,
          estimatedDays,
          paymentTerms:
            typeof body.paymentTerms === "string" && body.paymentTerms.trim()
              ? body.paymentTerms.trim()
              : existing.paymentTerms,
        },
        include: { items: true },
      });

      if (nextStatus !== existing.status) {
        await tx.activityLog.create({
          data: {
            entityType: "QUOTE",
            entityId: id,
            action: "UPDATED",
            description: `Quote ${existing.quoteNumber} status marked as ${nextStatus}`,
            performedBy: auth.user.name,
          },
        });
      }

      return q;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Quotation PATCH error:", error);
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("quotations:write");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.quotation.findUnique({
        where: { id },
        include: { order: true },
      });
      if (!existing) {
        return { error: "Quotation not found", status: 404 as const };
      }
      if (existing.order) {
        return {
          error: "Cannot delete quotation that is already converted to an order",
          status: 400 as const,
        };
      }

      await tx.quotation.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          entityType: "QUOTE",
          entityId: id,
          action: "DELETED",
          description: `Quotation ${existing.quoteNumber} (${existing.companyName}) deleted`,
          performedBy: auth.user.name,
        },
      });
      return { ok: true as const };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Quotation DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}
