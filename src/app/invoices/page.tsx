"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Receipt,
  Search,
  FileDown,
  IndianRupee,
  RefreshCw,
  CheckCircle2,
  Clock,
  Download,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { generateTaxInvoicePDF } from "@/lib/pdf-generator";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  shippingAddress: string;
  clientGstin?: string | null;
  gstRate: number;
  taxType: string;
  stage: string;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: string;
  createdAt: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    customizationDetails?: string | null;
  }>;
}

const PAYMENT_BADGES: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "Pending", badge: "bg-red-500/10 text-red-600 border-red-500/20" },
  PARTIAL_PAID: { label: "Partial Paid", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  FULLY_PAID: { label: "Settled", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<InvoiceRecord | null>(null);
  const [collectedAmount, setCollectedAmount] = useState(0);
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/invoices", window.location.origin);
      if (statusFilter !== "ALL") url.searchParams.set("paymentStatus", statusFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 200);
    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  const handleDownloadInvoice = (inv: InvoiceRecord) => {
    const doc = generateTaxInvoicePDF({
      invoiceNumber: inv.invoiceNumber,
      orderNumber: inv.orderNumber,
      companyName: inv.companyName,
      contactPerson: inv.contactPerson,
      contactPhone: inv.contactPhone,
      clientGstin: inv.clientGstin,
      shippingAddress: inv.shippingAddress,
      issueDate: inv.createdAt,
      items: inv.items,
      gstRate: inv.gstRate,
      taxType: inv.taxType,
      totalAmount: inv.totalAmount,
      advancePaid: inv.advancePaid,
      balanceDue: inv.balanceDue,
      paymentStatus: inv.paymentStatus,
    });
    doc.save(`${inv.invoiceNumber}_Urban_Dhaga_TaxInvoice.pdf`);
    toast.success(`Downloaded ${inv.invoiceNumber} Tax Invoice`);
  };

  const handleExportCSV = () => {
    const headers = [
      "Invoice No",
      "Order No",
      "Client Company",
      "Client GSTIN",
      "GST Rate %",
      "Total Amount (INR)",
      "Advance Paid (INR)",
      "Balance Due (INR)",
      "Payment Status",
      "Issue Date",
    ];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.orderNumber,
      `"${inv.companyName.replace(/"/g, '""')}"`,
      inv.clientGstin || "Unregistered",
      inv.gstRate,
      inv.totalAmount,
      inv.advancePaid,
      inv.balanceDue,
      inv.paymentStatus,
      formatDate(inv.createdAt),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Urban_Dhaga_GST_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported GST & Receivables CSV");
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal) return;

    try {
      setSavingPayment(true);
      const res = await fetch(`/api/orders/${paymentModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advancePaid: collectedAmount }),
      });

      if (!res.ok) {
        toast.error("Failed to update payment");
        return;
      }

      toast.success(`Updated payment ledger for ${paymentModal.invoiceNumber}`);
      setPaymentModal(null);
      fetchInvoices();
    } catch (err) {
      console.error(err);
      toast.error("Network error recording payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const totalBilled = invoices.reduce((acc, i) => acc + i.totalAmount, 0);
  const totalCollected = invoices.reduce((acc, i) => acc + i.advancePaid, 0);
  const totalReceivable = invoices.reduce((acc, i) => acc + i.balanceDue, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-orange-600" />
            <span>Tax Invoices & Receivables Ledger</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            GST-compliant B2B billing, advance & balance reconciliations, and accountant CSV exports.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-orange-600" />
          <span>Export GST Ledger CSV</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Total Billed Value</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(totalBilled)}
          </div>
          <span className="text-[11px] text-zinc-400">{invoices.length} active B2B tax invoices</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Collected Receipts</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalCollected)}
          </div>
          <span className="text-[11px] text-zinc-400">
            {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% realization rate
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Outstanding Receivables</span>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalReceivable)}
          </div>
          <span className="text-[11px] text-zinc-400">Balance due prior to / on dispatch</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "PENDING", "PARTIAL_PAID", "FULLY_PAID"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                statusFilter === st
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {st === "ALL" ? "All Invoices" : PAYMENT_BADGES[st]?.label || st}
            </button>
          ))}
        </div>

        <div className="relative md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, order #, client..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 font-mono uppercase text-zinc-500 text-[10px]">
              <tr>
                <th className="px-4 py-3">Invoice & Order</th>
                <th className="px-4 py-3">Billed Entity & GSTIN</th>
                <th className="px-4 py-3 text-right">Invoice Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                    <span>Loading ledger...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusCfg = PAYMENT_BADGES[inv.paymentStatus] || PAYMENT_BADGES.PENDING;
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {inv.invoiceNumber}
                        <div className="text-[10px] text-zinc-400 font-normal">
                          Ref: {inv.orderNumber} • {formatDate(inv.createdAt)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {inv.companyName}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          {inv.clientGstin ? `GSTIN: ${inv.clientGstin}` : "GST Unregistered"} • {inv.gstRate}% GST
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(inv.totalAmount)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatCurrency(inv.advancePaid)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(inv.balanceDue)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1 text-[11px] font-medium"
                        >
                          <FileDown className="w-3.5 h-3.5 text-orange-600" />
                          <span>Tax Invoice</span>
                        </button>

                        {inv.paymentStatus !== "FULLY_PAID" && (
                          <button
                            onClick={() => {
                              setPaymentModal(inv);
                              setCollectedAmount(inv.totalAmount);
                            }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 inline-flex items-center gap-1"
                          >
                            <IndianRupee className="w-3 h-3" />
                            <span>Record Payment</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPayment}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-elevated space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Update Payment Collection
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {paymentModal.invoiceNumber} — {paymentModal.companyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 flex justify-between text-xs font-mono">
              <span>Invoice Total:</span>
              <strong>{formatCurrency(paymentModal.totalAmount)}</strong>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-zinc-500 font-medium">Total Cumulative Amount Paid (INR)</label>
              <input
                type="number"
                min="0"
                max={paymentModal.totalAmount}
                required
                value={collectedAmount}
                onChange={(e) => setCollectedAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-sm"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCollectedAmount(Math.round(paymentModal.totalAmount * 0.5))}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  50% Advance
                </button>
                <button
                  type="button"
                  onClick={() => setCollectedAmount(paymentModal.totalAmount)}
                  className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                >
                  100% Full Settlement
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPayment}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                {savingPayment ? "Updating..." : "Save Payment Receipt"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
