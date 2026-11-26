"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Box,
  Clock,
  CheckCircle2,
  Truck,
  TrendingUp,
  CreditCard,
  AlertCircle,
  FileText,
  ChevronRight,
} from "lucide-react";
import { cn, formatCurrency, formatDate, ORDER_STAGES } from "@/lib/utils";
import { APP_REFRESH_EVENT } from "@/components/layout/header";
import { PAYMENT_BADGE, SHIPMENT_LABEL, productionLabel, titleCase } from "@/lib/order-status";

interface ActiveOrder {
  id: string;
  orderNumber: string;
  companyName: string;
  contactPerson: string;
  category: string | null;
  stage: string;
  paymentStatus: string;
  qcPassed: boolean | null;
  shipmentStatus: string | null;
  targetDeliveryDate: string;
  totalAmount: number;
}

interface OmsStats {
  totalOrders: number;
  openOrders: number;
  confirmedOrders: number;
  inFulfilment: number;
  totalOrderValue: number;
  amountReceived: number;
  outstandingReceivables: number;
  designApprovalsPending: number;
  recentActiveOrders: ActiveOrder[];
}

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  caption?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-md p-4 min-h-[114px] flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-600 leading-snug">
          {label}
        </span>
        <span className="w-7 h-7 shrink-0 rounded-md bg-zinc-50 border border-zinc-100 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
        </span>
      </div>
      <div className="mt-1 text-xl font-bold font-mono text-zinc-900">{value}</div>
      {caption && <div className="mt-auto pt-3 text-[11px] text-zinc-500">{caption}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OmsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStats(json.oms);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    window.addEventListener(APP_REFRESH_EVENT, fetchStats);
    return () => window.removeEventListener(APP_REFRESH_EVENT, fetchStats);
  }, [fetchStats]);

  const s = stats;
  const n = (v: number | undefined) => (s ? v ?? 0 : loading ? "…" : 0);
  const money = (v: number | undefined) => (s ? formatCurrency(v ?? 0) : loading ? "…" : formatCurrency(0));
  const orders = s?.recentActiveOrders ?? [];

  return (
    <div className="p-7 space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        <StatCard label="Total Orders" value={n(s?.totalOrders)} icon={Box} />
        <StatCard label="Open Orders" value={n(s?.openOrders)} caption="In active workflow" icon={Clock} />
        <StatCard
          label="Confirmed Orders"
          value={n(s?.confirmedOrders)}
          caption="Ready for execution"
          icon={CheckCircle2}
        />
        <StatCard label="In Fulfilment" value={n(s?.inFulfilment)} caption="Production & dispatch" icon={Truck} />
        <StatCard label="Total Order Value" value={money(s?.totalOrderValue)} icon={TrendingUp} />
        <StatCard
          label="Amount Received"
          value={money(s?.amountReceived)}
          caption="Cleared payments"
          icon={CreditCard}
        />
        <StatCard
          label="Outstanding Receivables"
          value={money(s?.outstandingReceivables)}
          caption="Unpaid balances"
          icon={AlertCircle}
        />
        <StatCard
          label="Design Approvals Pending"
          value={n(s?.designApprovalsPending)}
          caption="Artwork review"
          icon={FileText}
        />
      </div>

      {/* Recent Active Orders */}
      <div className="bg-white border border-zinc-200 rounded-md">
        <div className="flex items-center justify-between px-4 py-3.5">
          <h2 className="text-[13px] font-semibold text-zinc-900">Recent Active Orders</h2>
          <Link
            href="/orders"
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-zinc-800 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
          >
            View All Orders <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-zinc-200 bg-zinc-50/60 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                <th className="text-left font-semibold px-4 py-3">Order ID</th>
                <th className="text-left font-semibold px-4 py-3">Customer</th>
                <th className="text-left font-semibold px-4 py-3">Category</th>
                <th className="text-left font-semibold px-4 py-3">Order Status</th>
                <th className="text-left font-semibold px-4 py-3">Payment</th>
                <th className="text-left font-semibold px-4 py-3">Production</th>
                <th className="text-left font-semibold px-4 py-3">Delivery</th>
                <th className="text-right font-semibold px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const stage = ORDER_STAGES[o.stage] ?? ORDER_STAGES.ORDER_CONFIRMED;
                const pay = PAYMENT_BADGE[o.paymentStatus] ?? PAYMENT_BADGE.PENDING;
                const prod = productionLabel(o.stage, o.qcPassed);
                return (
                  <tr key={o.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70">
                    <td className="px-4 py-3 font-mono font-medium text-zinc-900 whitespace-nowrap">
                      <Link href={`/orders/${o.id}`} className="hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{o.companyName}</div>
                      <div className="text-[11px] text-zinc-500">{o.contactPerson}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{o.category ? titleCase(o.category) : "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block text-[10px] font-medium px-2 py-0.5 rounded border whitespace-nowrap",
                          stage.bg,
                          stage.text,
                          stage.border
                        )}
                      >
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block text-[10px] font-medium px-2 py-0.5 rounded border", pay.cls)}>
                        {pay.label}
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 font-medium whitespace-nowrap", prod.cls)}>{prod.label}</td>
                    <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                      {o.shipmentStatus ? SHIPMENT_LABEL[o.shipmentStatus] ?? o.shipmentStatus : formatDate(o.targetDeliveryDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-zinc-900 whitespace-nowrap">
                      {formatCurrency(o.totalAmount)}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-zinc-600">
                    {loading
                      ? "Loading orders…"
                      : error
                      ? "Couldn't load orders. Use the refresh button to try again."
                      : 'No orders created yet. Click "+ New Order" to start!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
