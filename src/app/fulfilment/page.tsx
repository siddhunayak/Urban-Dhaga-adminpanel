"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Calendar, AlertTriangle } from "lucide-react";
import { cn, formatCurrency, formatDate, ORDER_STAGES } from "@/lib/utils";
import { PAYMENT_BADGE, designStatus } from "@/lib/order-status";
import { APP_REFRESH_EVENT } from "@/components/layout/header";
import { Badge, Card, inputCls } from "@/components/ui";

interface Order {
  id: string;
  orderNumber: string;
  companyName: string;
  stage: string;
  priority: string;
  paymentStatus: string;
  totalAmount: number;
  targetDeliveryDate: string;
  items: { quantity: number }[];
  mockups?: { approvalStatus: string; version: number }[];
  qualityCheck?: { passed: boolean } | null;
  shipment?: { status: string; trackingNumber: string } | null;
}

const COLUMNS = [
  { key: "ARTWORK", title: "Artwork & Approval", stages: ["ORDER_CONFIRMED", "ARTWORK_SUBMITTED", "SAMPLE_APPROVED"] },
  { key: "PRODUCTION", title: "In Production", stages: ["IN_PRODUCTION"] },
  { key: "QC", title: "Quality Check", stages: ["QUALITY_CHECK"] },
  { key: "READY", title: "Ready to Dispatch", stages: ["READY_FOR_DISPATCH"] },
  { key: "TRANSIT", title: "Dispatched", stages: ["DISPATCHED"] },
  { key: "DONE", title: "Delivered", stages: ["DELIVERED"] },
];

export default function FulfilmentPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) setOrders(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(APP_REFRESH_EVENT, load);
    return () => window.removeEventListener(APP_REFRESH_EVENT, load);
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => !q || `${o.orderNumber} ${o.companyName}`.toLowerCase().includes(q));
  }, [orders, search]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-7 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-[260px]">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order or customer.." className={inputCls + " pl-8"} />
        </div>
        <p className="text-[11px] text-zinc-500">Open an order to update artwork, QC and dispatch. Cancelled orders are hidden.</p>
      </div>

      <div className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const list = visible.filter((o) => col.stages.includes(o.stage));
          return (
            <div key={col.key} className="bg-zinc-100/70 border border-zinc-200 rounded-md flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-200">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-700">{col.title}</span>
                <span className="text-[10px] font-mono font-semibold text-zinc-600 bg-white border border-zinc-200 rounded px-1.5">{list.length}</span>
              </div>
              <div className="p-2 space-y-2 flex-1">
                {list.map((o) => {
                  const st = ORDER_STAGES[o.stage];
                  const pay = PAYMENT_BADGE[o.paymentStatus] ?? PAYMENT_BADGE.PENDING;
                  const design = designStatus(o.mockups);
                  const late = o.stage !== "DELIVERED" && o.targetDeliveryDate.slice(0, 10) < today;
                  const pcs = o.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <Link key={o.id} href={`/orders/${o.id}`} className="block">
                      <Card className="p-3 hover:border-zinc-400 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-zinc-900">{o.orderNumber}</span>
                          {o.priority !== "NORMAL" && <Badge className="bg-red-50 text-red-700 border-red-100">{o.priority}</Badge>}
                        </div>
                        <div className="text-xs font-medium text-zinc-800 mt-1 truncate">{o.companyName}</div>
                        <div className="text-[11px] text-zinc-500">
                          {pcs} pcs · {formatCurrency(o.totalAmount)}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {col.stages.length > 1 && <Badge className={cn(st.bg, st.text, st.border)}>{st.label}</Badge>}
                          <Badge className={pay.cls}>{pay.label}</Badge>
                          {col.key === "ARTWORK" && <Badge className="bg-white border-zinc-200 text-zinc-700">{design.label}</Badge>}
                          {o.shipment && col.key === "TRANSIT" && (
                            <Badge className="bg-white border-zinc-200 text-zinc-700 font-mono">{o.shipment.trackingNumber}</Badge>
                          )}
                        </div>
                        <div className={cn("flex items-center gap-1 mt-2 text-[10px]", late ? "text-red-700 font-semibold" : "text-zinc-500")}>
                          {late ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                          {late ? "Overdue · " : "Due "}
                          {formatDate(o.targetDeliveryDate)}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
                {list.length === 0 && (
                  <div className="text-[11px] text-zinc-400 text-center pt-6">{loading ? "Loading…" : "No orders"}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
