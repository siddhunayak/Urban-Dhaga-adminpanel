import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { categoryFor } from "@/lib/order-status";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET() {
  const auth = await authorize("dashboard:read");
  if (!auth.ok) return auth.response;

  try {
    const [
      orders,
      leads,
      products,
      variants,
      recentActivities,
      quotations,
    ] = await Promise.all([
      prisma.order.findMany({
        include: {
          items: true,
          qualityCheck: true,
          shipment: true,
          mockups: { select: { approvalStatus: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        select: { name: true, sku: true, category: true, isActive: true },
      }),
      prisma.productVariant.findMany({
        where: { product: { isActive: true } },
        include: {
          product: {
            select: { name: true, category: true, sku: true },
          },
        },
      }),
      prisma.activityLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
      }),
      prisma.quotation.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const productsCount = products.filter((p) => p.isActive).length;

    const FULFILMENT_STAGES = ["IN_PRODUCTION", "QUALITY_CHECK", "READY_FOR_DISPATCH", "DISPATCHED"];
    const liveOrders = orders.filter((o) => o.stage !== "CANCELLED");
    const openOrders = orders.filter((o) => o.stage !== "DELIVERED" && o.stage !== "CANCELLED");

    const totalRevenue = liveOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const totalCollected = liveOrders.reduce((acc, o) => acc + (o.advancePaid || 0), 0);
    const balanceDue = liveOrders.reduce((acc, o) => acc + (o.balanceDue || 0), 0);

    const designApprovalsPending = openOrders.filter(
      (o) =>
        o.mockups.some((m) => m.approvalStatus === "PENDING_REVIEW") &&
        !o.mockups.some((m) => m.approvalStatus === "APPROVED")
    ).length;

    const oms = {
      totalOrders: liveOrders.length,
      openOrders: openOrders.length,
      confirmedOrders: orders.filter((o) => o.stage === "ORDER_CONFIRMED").length,
      inFulfilment: orders.filter((o) => FULFILMENT_STAGES.includes(o.stage)).length,
      totalOrderValue: totalRevenue,
      amountReceived: totalCollected,
      outstandingReceivables: balanceDue,
      designApprovalsPending,
      recentActiveOrders: openOrders.slice(0, 10).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        companyName: o.companyName,
        contactPerson: o.contactPerson,
        category: categoryFor(o.items, products),
        stage: o.stage,
        paymentStatus: o.paymentStatus,
        qcPassed: o.qualityCheck?.passed ?? null,
        shipmentStatus: o.shipment?.status ?? null,
        targetDeliveryDate: o.targetDeliveryDate,
        totalAmount: o.totalAmount,
      })),
    };

    const ordersByStage: Record<string, number> = {};
    orders.forEach((o) => {
      ordersByStage[o.stage] = (ordersByStage[o.stage] || 0) + 1;
    });

    const lowStockItems = variants
      .filter((v) => v.currentStock <= v.lowStockThreshold)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        productName: v.product.name,
        category: v.product.category,
        size: v.size,
        color: v.color,
        currentStock: v.currentStock,
        lowStockThreshold: v.lowStockThreshold,
        reorderQuantity: v.reorderQuantity,
      }));

    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.stage === "WON").length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // Real 6-month revenue aggregation from live orders
    const now = new Date();
    const monthlyBuckets: { year: number; monthIdx: number; month: string; revenue: number; orders: number }[] = [];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      monthlyBuckets.push({
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        month: MONTH_NAMES[d.getMonth()],
        revenue: 0,
        orders: 0,
      });
    }
    for (const ord of liveOrders) {
      const d = new Date(ord.createdAt);
      const bucket = monthlyBuckets.find(
        (b) => b.year === d.getFullYear() && b.monthIdx === d.getMonth()
      );
      if (bucket) {
        bucket.revenue += ord.totalAmount || 0;
        bucket.orders += 1;
      }
    }
    const monthlyRevenue = monthlyBuckets.map(({ month, revenue, orders: count }) => ({
      month,
      revenue,
      orders: count,
    }));

    // Real category distribution using Product lookup + fallback
    const categoryTotals: Record<string, number> = {};
    for (const ord of liveOrders) {
      for (const item of ord.items) {
        const cat = categoryFor([item], products) || "GIFTS";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.lineTotal || 0);
      }
    }
    const categoryBreakdown = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
    }));

    return NextResponse.json({
      metrics: {
        totalRevenue,
        totalCollected,
        balanceDue,
        activeOrdersCount: openOrders.length,
        totalOrdersCount: liveOrders.length,
        lowStockCount: lowStockItems.length,
        totalLeads,
        wonLeads,
        conversionRate,
        productsCount,
        quotationsCount: quotations.length,
      },
      oms,
      ordersByStage,
      recentOrders: liveOrders.slice(0, 5),
      lowStockItems,
      monthlyRevenue,
      categoryBreakdown,
      recentActivities,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
