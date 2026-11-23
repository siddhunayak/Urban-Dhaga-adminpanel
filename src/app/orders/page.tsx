"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn, formatCurrency, ORDER_STAGES } from "@/lib/utils";
import {
  PAYMENT_BADGE,
  SHIPMENT_LABEL,
  FULFILMENT_OPTIONS,
  fulfilmentKey,
  productionLabel,
  designStatus,
  titleCase,
  categoryFor,
} from "@/lib/order-status";
import { APP_REFRESH_EVENT } from "@/components/layout/header";

interface Order {
  id: string;
  orderNumber: string;
  jobSheetNumber?: string | null;
  quotationId?: string | null;
  companyName: string;
  contactPerson: string;
  stage: string;
  paymentStatus: string;
  totalAmount: number;
  balanceDue: number;
  targetDeliveryDate: string;
  items: { productName: string; sku?: string | null }[];
  mockups?: { approvalStatus: string; version: number }[];
  qualityCheck?: { passed: boolean } | null;
  shipment?: { status: string } | null;
}

interface Product {
  name: string;
  sku: string;
  category: string;
}

const selectCls =
  "h-[30px] min-w-[110px] pl-3 pr-8 text-xs text-zinc-800 bg-white border border-zinc-200 rounded-md appearance-none cursor-pointer hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-no-repeat bg-[length:14px] bg-[right_8px_center] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2318181b%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')]";

export default function OrdersRegisterPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [stage, setStage] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [fulfilment, setFulfilment] = useState("ALL");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const [oRes, pRes] = await Promise.all([fetch("/api/orders"), fetch("/api/products")]);
      if (!oRes.ok) throw new Error(`HTTP ${oRes.status}`);
      setOrders(await oRes.json());
      if (pRes.ok) setProducts(await pRes.json());
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    window.addEventListener(APP_REFRESH_EVENT, fetchData);
    return () => window.removeEventListener(APP_REFRESH_EVENT, fetchData);
  }, [fetchData]);

  const rows = useMemo(
    () => orders.map((o) => ({ ...o, category: categoryFor(o.items, products) })),
    [orders, products]
  );

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((o) => {
      if (q) {
        const hay = [o.orderNumber, o.companyName, o.contactPerson, o.jobSheetNumber ?? ""].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (category !== "ALL" && o.category !== category) return false;
      if (stage !== "ALL" && o.stage !== stage) return false;
      if (payment !== "ALL" && o.paymentStatus !== payment) return false;
      if (fulfilment !== "ALL" && fulfilmentKey(o.stage) !== fulfilment) return false;
      return true;
    });
  }, [rows, search, category, stage, payment, fulfilment]);

  const th = "text-left font-semibold px-4 py-3 whitespace-nowrap";

  return (
    <div className="p-7">
      <div className="bg-white border border-zinc-200 rounded-md">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4">
          <div className="relative w-full lg:w-[234px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID, Customer, PO.."
              className="w-full h-[30px] pl-8 pr-3 text-xs bg-white border border-zinc-200 rounded-md placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </select>
            <select value={stage} onChange={(e) => setStage(e.target.value)} className={selectCls}>
              <option value="ALL">All Order Statuses</option>
              {Object.entries(ORDER_STAGES).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
            <select value={payment} onChange={(e) => setPayment(e.target.value)} className={selectCls}>
              <option value="ALL">All Payments</option>
              {Object.entries(PAYMENT_BADGE).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))}
            </select>
            <select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)} className={selectCls}>
              <option value="ALL">All Fulfilment</option>
              {FULFILMENT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-zinc-200 bg-zinc-50/60 text-[10px] uppercase tracking-[0.06em] text-zinc-500">
                <th className={th}>Order ID</th>
                <th className={th}>Customer</th>
                <th className={th}>Cat</th>
                <th className={th}>Order Status</th>
                <th className={th}>Payment Status</th>
                <th className={th}>Design</th>
                <th className={th}>Production</th>
                <th className={th}>Delivery Status</th>
                <th className={cn(th, "text-right")}>Total (INR)</th>
                <th className={cn(th, "text-right")}>Payment Remains</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const st = ORDER_STAGES[o.stage] ?? ORDER_STAGES.ORDER_CONFIRMED;
                const pay = PAYMENT_BADGE[o.paymentStatus] ?? PAYMENT_BADGE.PENDING;
                const prod = productionLabel(o.stage, o.qualityCheck?.passed);
                const design = designStatus(o.mockups);
                return (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/orders/${o.id}`)}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-zinc-900 whitespace-nowrap">{o.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{o.companyName}</div>
                      <div className="text-[11px] text-zinc-500">{o.contactPerson}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">{o.category ? titleCase(o.category) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block text-[10px] font-medium px-2 py-0.5 rounded border whitespace-nowrap", st.bg, st.text, st.border)}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-block text-[10px] font-medium px-2 py-0.5 rounded border", pay.cls)}>{pay.label}</span>
                    </td>
                    <td className={cn("px-4 py-3 font-medium whitespace-nowrap", design.cls)}>{design.label}</td>
                    <td className={cn("px-4 py-3 font-medium whitespace-nowrap", prod.cls)}>{prod.label}</td>
                    <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                      {o.shipment ? SHIPMENT_LABEL[o.shipment.status] ?? o.shipment.status : "Not dispatched"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-zinc-900 whitespace-nowrap">
                      {formatCurrency(o.totalAmount)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-mono font-medium whitespace-nowrap",
                        o.balanceDue > 0 ? "text-red-700" : "text-emerald-700"
                      )}
                    >
                      {formatCurrency(o.balanceDue)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-xs text-zinc-600">
                    {loading
                      ? "Loading orders…"
                      : error
                      ? "Couldn't load orders. Use the refresh button to try again."
                      : "No matching orders found."}
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
