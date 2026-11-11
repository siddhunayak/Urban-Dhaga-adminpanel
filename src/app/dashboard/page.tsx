"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  Factory,
  FileSpreadsheet,
  ArrowUpRight,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Plus,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency, formatDate, ORDER_STAGES } from "@/lib/utils";

interface DashboardData {
  metrics: {
    totalRevenue: number;
    totalCollected: number;
    balanceDue: number;
    activeOrdersCount: number;
    totalOrdersCount: number;
    lowStockCount: number;
    totalLeads: number;
    wonLeads: number;
    conversionRate: number;
    productsCount: number;
    quotationsCount: number;
  };
  ordersByStage: Record<string, number>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    companyName: string;
    contactPerson: string;
    stage: string;
    priority: string;
    totalAmount: number;
    balanceDue: number;
    targetDeliveryDate: string;
    items: Array<{ productName: string; quantity: number }>;
  }>;
  lowStockItems: Array<{
    id: string;
    sku: string;
    productName: string;
    category: string;
    size: string;
    color: string;
    currentStock: number;
    lowStockThreshold: number;
    reorderQuantity: number;
  }>;
  monthlyRevenue: Array<{ month: string; revenue: number; orders: number }>;
  categoryBreakdown: Array<{ name: string; value: number }>;
  recentActivities: Array<{
    id: string;
    entityType: string;
    action: string;
    description: string;
    performedBy: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restockModal, setRestockModal] = useState<{ id: string; name: string; sku: string } | null>(null);
  const [restockQty, setRestockQty] = useState(50);
  const [restocking, setRestocking] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleQuickRestock = async () => {
    if (!restockModal) return;
    try {
      setRestocking(true);
      await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: restockModal.id,
          adjustmentType: "INWARD",
          quantity: restockQty,
          notes: "Quick restock from Dashboard",
        }),
      });
      setRestockModal(null);
      fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setRestocking(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
          <span className="text-xs font-mono">Loading operations telemetry...</span>
        </div>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Operations & Revenue Command
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time telemetry across quotations, warehouse stock, and multi-stage production runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            href="/quotes/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Estimate</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Gross Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {formatCurrency(m?.totalRevenue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Advance: {formatCurrency(m?.totalCollected)}</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Due: {formatCurrency(m?.balanceDue)}
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Active Production Orders</span>
            <Factory className="w-4 h-4 text-orange-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {m?.activeOrdersCount || 0}
            <span className="text-xs font-normal text-zinc-400 ml-2">/ {m?.totalOrdersCount} total</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>In Job Sheet & QC Gates</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Lead Win Rate</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {m?.conversionRate || 0}%
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{m?.wonLeads} won</span>
            <span>{m?.totalLeads} qualified leads</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-medium">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
            {m?.lowStockCount || 0}
            <span className="text-xs font-normal text-zinc-400 ml-2">SKU variants</span>
          </div>
          <div className="mt-2 text-[11px] text-red-600 dark:text-red-400 font-medium">
            Requires factory inward stock
          </div>
        </div>
      </div>

      {/* Production Pipeline Funnel Snapshot */}
      <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Live Production Floor Stages
            </h3>
            <p className="text-xs text-zinc-500">Current allocation across manufacturing and dispatch gates</p>
          </div>
          <Link
            href="/production"
            className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium"
          >
            Open Kanban Board <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {Object.entries(ORDER_STAGES)
            .filter(([key]) => key !== "CANCELLED")
            .map(([key, stage]) => {
              const count = data?.ordersByStage[key] || 0;
              return (
                <div
                  key={key}
                  className={`p-3 rounded-lg border flex flex-col justify-between ${stage.bg} ${stage.border}`}
                >
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                    0{stage.step}. {stage.label}
                  </span>
                  <div className="text-xl font-bold font-mono mt-2 text-zinc-900 dark:text-zinc-100">
                    {count}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Growth Trend */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Revenue Inflow Trajectory
              </h3>
              <p className="text-xs text-zinc-500">Gross order value booked over last 6 cycles</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              +38% MoM
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyRevenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Gross Value"]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ea580c"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Contribution */}
        <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Category Distribution
            </h3>
            <p className="text-xs text-zinc-500">Share of revenue across product lines</p>
          </div>

          <div className="h-48 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categoryBreakdown || []} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Value"]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>Primary: Heavyweight Cotton Tees</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">54% Share</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Orders Table & Low Stock Alert Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent High Priority Orders */}
        <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Recent Production Orders
              </h3>
              <p className="text-xs text-zinc-500">Jobs actively on the floor or ready for dispatch</p>
            </div>
            <Link
              href="/production"
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recentOrders.map((ord) => {
              const stageConfig = ORDER_STAGES[ord.stage] || ORDER_STAGES.ORDER_CONFIRMED;
              return (
                <div
                  key={ord.id}
                  className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {ord.orderNumber}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${stageConfig.bg} ${stageConfig.text} ${stageConfig.border}`}>
                        {stageConfig.label}
                      </span>
                      {ord.priority === "HIGH" || ord.priority === "URGENT" ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 border border-red-500/20 font-bold">
                          {ord.priority}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate mt-1">
                      {ord.companyName}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {ord.items.map((i) => `${i.productName} (${i.quantity} pcs)`).join(" • ")}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(ord.totalAmount)}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>{formatDate(ord.targetDeliveryDate)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Warning & Restock Tool */}
        <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Critical Stock Alerts
                </h3>
                <span className="text-[10px] font-mono bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded border border-red-500/20 font-semibold">
                  {data?.lowStockItems.length} SKUs Low
                </span>
              </div>
              <p className="text-xs text-zinc-500">Variants below threshold requiring raw material inward</p>
            </div>
            <Link
              href="/inventory"
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium"
            >
              Full Inventory Matrix <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.lowStockItems.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-red-500/10 bg-red-500/[0.02] dark:bg-red-500/[0.04] flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {item.sku}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                      {item.size} • {item.color}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                    {item.productName}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                      {item.currentStock} pcs
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Min: {item.lowStockThreshold}
                    </div>
                  </div>

                  <button
                    onClick={() => setRestockModal({ id: item.id, name: item.productName, sku: item.sku })}
                    className="px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded-md border border-orange-500/20 transition-colors"
                  >
                    + Inward
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Restock Quick Modal */}
      {restockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-elevated space-y-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Inward Factory Stock
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Adding verified physical blank stock to warehouse for SKU: <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{restockModal.sku}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Quantity to Inward (Units)
              </label>
              <input
                type="number"
                min="1"
                value={restockQty}
                onChange={(e) => setRestockQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
              <div className="flex gap-2 pt-1">
                {[25, 50, 100, 200].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setRestockQty(q)}
                    className="text-[11px] font-mono px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setRestockModal(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restocking}
                onClick={handleQuickRestock}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm transition-all"
              >
                {restocking ? "Updating..." : `Confirm Inward (+${restockQty} pcs)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
