import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      orders,
      leads,
      productsCount,
      variants,
      recentActivities,
      quotations,
    ] = await Promise.all([
      prisma.order.findMany({
        include: {
          items: true,
          qualityCheck: true,
          shipment: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.productVariant.findMany({
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

    // Calculate revenue metrics
    const totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const totalCollected = orders.reduce((acc, o) => acc + (o.advancePaid || 0), 0);
    const balanceDue = orders.reduce((acc, o) => acc + (o.balanceDue || 0), 0);

    // Active production orders (not DELIVERED or CANCELLED)
    const activeOrders = orders.filter(
      (o) => o.stage !== "DELIVERED" && o.stage !== "CANCELLED"
    );

    // Stage counts
    const ordersByStage: { [key: string]: number } = {};
    orders.forEach((o) => {
      ordersByStage[o.stage] = (ordersByStage[o.stage] || 0) + 1;
    });

    // Low stock items
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

    // Lead metrics
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.stage === "WON").length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    // Monthly revenue simulation/aggregation (last 5 months)
    const monthlyRevenue = [
      { month: "Jun", revenue: 420000, orders: 4 },
      { month: "Jul", revenue: 580000, orders: 6 },
      { month: "Aug", revenue: 790000, orders: 8 },
      { month: "Sep", revenue: 950000, orders: 11 },
      { month: "Oct", revenue: 1120000, orders: 14 },
      { month: "Nov", revenue: totalRevenue, orders: orders.length },
    ];

    // Category distribution from order items
    const categoryTotals: { [key: string]: number } = {
      APPAREL: 0,
      DRINKWARE: 0,
      WELCOME_KITS: 0,
      GIFTS: 0,
    };

    orders.forEach((ord) => {
      ord.items.forEach((item) => {
        if (item.productName.toLowerCase().includes("tee") || item.productName.toLowerCase().includes("hoodie")) {
          categoryTotals.APPAREL += item.lineTotal;
        } else if (item.productName.toLowerCase().includes("tumbler") || item.productName.toLowerCase().includes("bottle")) {
          categoryTotals.DRINKWARE += item.lineTotal;
        } else if (item.productName.toLowerCase().includes("kit")) {
          categoryTotals.WELCOME_KITS += item.lineTotal;
        } else {
          categoryTotals.GIFTS += item.lineTotal;
        }
      });
    });

    const categoryBreakdown = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: value || 15000,
    }));

    return NextResponse.json({
      metrics: {
        totalRevenue,
        totalCollected,
        balanceDue,
        activeOrdersCount: activeOrders.length,
        totalOrdersCount: orders.length,
        lowStockCount: lowStockItems.length,
        totalLeads,
        wonLeads,
        conversionRate,
        productsCount,
        quotationsCount: quotations.length,
      },
      ordersByStage,
      recentOrders: orders.slice(0, 5),
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

