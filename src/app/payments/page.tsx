"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, TrendingUp, CreditCard, AlertCircle, FileDown, Download, Clock } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { PAYMENT_BADGE } from "@/lib/order-status";
import { generateTaxInvoicePDF } from "@/lib/pdf-generator";
import { APP_REFRESH_EVENT } from "@/components/layout/header";
import { Badge, Button, Card, EmptyRow, Field, Modal, StatCard, inputCls, selectCls, thCls, theadRowCls, apiError } from "@/components/ui";

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  shippingAddress: string;
  clientGstin: string | null;
  gstRate: number;
  taxType: string;
  stage: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: string;
  createdAt: string;
  items: { productName: string; quantity: number; unitPrice: number; lineTotal: number; customizationDetails?: string | null }[];
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("NEFT");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/invoices", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setRows(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(APP_REFRESH_EVENT, load);
    return () => window.removeEventListener(APP_REFRESH_EVENT, load);
  }, [load]);

  const totals = useMemo(
    () => ({
      billed: rows.reduce((s, r) => s + r.totalAmount, 0),
      received: rows.reduce((s, r) => s + r.advancePaid, 0),
      outstanding: rows.reduce((s, r) => s + r.balanceDue, 0),
      unpaidCount: rows.filter((r) => r.balanceDue > 0).length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "ALL" && r.paymentStatus !== status) return false;
      if (q && ![r.invoiceNumber, r.orderNumber, r.companyName, r.contactPerson].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, status]);

  const openPay = (r: Invoice) => {
    setPaying(r);
    setAmount(r.balanceDue);
    setMethod("NEFT");
    setReference("");
  };

  const recordPayment = async () => {
    if (!paying) return;
    if (amount <= 0) return toast.error("Enter an amount");
    if (amount > paying.balanceDue) return toast.error(`Amount is more than the balance (${formatCurrency(paying.balanceDue)})`);
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${paying.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method,
          reference: reference.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await apiError(res, "Couldn't record payment"));
      toast.success(`Recorded ${formatCurrency(amount)} against ${paying.orderNumber}`);
      setPaying(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't record payment");
    } finally {
      setSaving(false);
    }
  };

  const downloadInvoice = (r: Invoice) =>
    generateTaxInvoicePDF({ ...r, issueDate: r.createdAt }).save(`${r.invoiceNumber}_TaxInvoice.pdf`);

  const exportCsv = () => {
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Invoice", "Order", "Customer", "GSTIN", "Total", "Received", "Balance", "Status", "Date"];
    const lines = filtered.map((r) =>
      [r.invoiceNumber, r.orderNumber, r.companyName, r.clientGstin, r.totalAmount, r.advancePaid, r.balanceDue, PAYMENT_BADGE[r.paymentStatus]?.label ?? r.paymentStatus, formatDate(r.createdAt)]
        .map(esc)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-7 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <StatCard label="Total Billed" value={formatCurrency(totals.billed)} caption="Across active orders" icon={TrendingUp} />
        <StatCard label="Amount Received" value={formatCurrency(totals.received)} caption="Cleared payments" icon={CreditCard} tone="green" />
        <StatCard label="Outstanding Receivables" value={formatCurrency(totals.outstanding)} caption="Unpaid balances" icon={AlertCircle} tone={totals.outstanding > 0 ? "red" : undefined} />
        <StatCard label="Orders With Balance" value={totals.unpaidCount} caption="Awaiting payment" icon={Clock} />
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4">
          <div className="relative w-full lg:w-[260px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, order, customer.." className={inputCls + " pl-8"} />
          </div>
          <div className="flex items-center gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="ALL">All Payments</option>
              {Object.entries(PAYMENT_BADGE).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.label}
                </option>
              ))}
            </select>
            <Button onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={cn(theadRowCls, "border-t")}>
                <th className={thCls}>Invoice</th>
                <th className={thCls}>Order ID</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Status</th>
                <th className={cn(thCls, "text-right")}>Total (INR)</th>
                <th className={cn(thCls, "text-right")}>Received</th>
                <th className={cn(thCls, "text-right")}>Balance</th>
                <th className={cn(thCls, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const pay = PAYMENT_BADGE[r.paymentStatus] ?? PAYMENT_BADGE.PENDING;
                return (
                  <tr key={r.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70">
                    <td className="px-4 py-3 font-mono text-zinc-700 whitespace-nowrap">{r.invoiceNumber}</td>
                    <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                      <Link href={`/orders/${r.id}`} className="text-zinc-900 hover:underline">
                        {r.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{r.companyName}</div>
                      <div className="text-[11px] text-zinc-500">{formatDate(r.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={pay.cls}>{pay.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(r.totalAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(r.advancePaid)}</td>
                    <td className={cn("px-4 py-3 text-right font-mono font-medium", r.balanceDue > 0 ? "text-red-700" : "text-emerald-700")}>
                      {formatCurrency(r.balanceDue)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {r.balanceDue > 0 && (
                          <Button variant="primary" className="h-7" onClick={() => openPay(r)}>
                            Record
                          </Button>
                        )}
                        <Button className="h-7" title="Download tax invoice" onClick={() => downloadInvoice(r)}>
                          <FileDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <EmptyRow cols={8}>
                  {loading ? "Loading payments…" : error ? "Couldn't load payments. Use the refresh button to try again." : "No matching payments found."}
                </EmptyRow>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!paying}
        title={`Record payment · ${paying?.orderNumber ?? ""}`}
        onClose={() => setPaying(null)}
        footer={
          <>
            <Button onClick={() => setPaying(null)}>Cancel</Button>
            <Button variant="primary" disabled={saving} onClick={recordPayment}>
              {saving ? "Saving…" : `Record ${formatCurrency(amount)}`}
            </Button>
          </>
        }
      >
        {paying && (
          <>
            <p className="text-xs text-zinc-600">
              {paying.companyName} · Balance due <span className="font-mono font-semibold text-zinc-900">{formatCurrency(paying.balanceDue)}</span>
            </p>
            <Field label="Amount received (₹)">
              <input type="number" min={1} autoFocus className={inputCls + " font-mono"} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method">
                <select className={selectCls + " w-full"} value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="NEFT">NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="RTGS">RTGS</option>
                  <option value="CARD">Card</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </Field>
              <Field label="UTR / Reference">
                <input className={inputCls + " font-mono"} placeholder="Optional" value={reference} onChange={(e) => setReference(e.target.value)} />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setAmount(Math.round(paying.balanceDue / 2))}>50%</Button>
              <Button onClick={() => setAmount(paying.balanceDue)}>Full balance</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
