"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  FileDown,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate, QUOTE_STATUS } from "@/lib/utils";
import { generateQuotationPDF } from "@/lib/pdf-generator";

interface QuotationItem {
  id: string;
  productTitle: string;
  description?: string | null;
  sizeBreakdown?: string | null;
  quantity: number;
  unitPrice: number;
  customizationDetails?: string | null;
  lineTotal: number;
}

interface Quotation {
  id: string;
  quoteNumber: string;
  companyName: string;
  customerName: string;
  clientEmail: string;
  clientPhone: string;
  clientGstin?: string | null;
  shippingAddress?: string | null;
  status: string;
  validUntil: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxType: string;
  gstRate: number;
  taxAmount: number;
  grandTotal: number;
  advanceRequiredPercent: number;
  paymentTerms: string;
  estimatedDays: number;
  notes?: string | null;
  createdAt: string;
  items: QuotationItem[];
  order?: { id: string; orderNumber: string; stage: string } | null;
}

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL("/api/quotations", window.location.origin);
      if (statusFilter !== "ALL") url.searchParams.set("status", statusFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setQuotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotes();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchQuotes]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotes();
  };

  const handleDownloadPDF = (q: Quotation) => {
    const doc = generateQuotationPDF({
      quoteNumber: q.quoteNumber,
      customerName: q.customerName,
      companyName: q.companyName,
      clientEmail: q.clientEmail,
      clientPhone: q.clientPhone,
      clientGstin: q.clientGstin,
      shippingAddress: q.shippingAddress,
      validUntil: q.validUntil,
      items: q.items,
      subtotal: q.subtotal,
      discountPercent: q.discountPercent,
      discountAmount: q.discountAmount,
      taxType: q.taxType,
      gstRate: q.gstRate,
      taxAmount: q.taxAmount,
      grandTotal: q.grandTotal,
      paymentTerms: q.paymentTerms,
      estimatedDays: q.estimatedDays,
      notes: q.notes,
    });
    doc.save(`${q.quoteNumber}_Urban_Dhaga_Estimate.pdf`);
    toast.success(`Downloaded ${q.quoteNumber} PDF`);
  };

  const handleStatusChange = async (quoteId: string, status: string) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to update quote status");
        return;
      }
      toast.success(`Quote status updated to ${status}`);
      fetchQuotes();
    } catch (err) {
      console.error(err);
      toast.error("Network error updating quote");
    }
  };

  const handleDeleteQuote = async (quoteId: string, quoteNumber: string) => {
    try {
      const res = await fetch(`/api/quotations/${quoteId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete quotation");
        return;
      }
      toast.success(`Deleted draft quotation ${quoteNumber}`);
      fetchQuotes();
    } catch (err) {
      console.error(err);
      toast.error("Network error deleting quotation");
    }
  };

  const handleConvertToOrder = async (quoteId: string) => {
    try {
      setConvertingId(quoteId);
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONVERT_TO_ORDER" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to convert quotation");
        return;
      }
      if (data.success) {
        toast.success(`Converted to Production Order ${data.order.orderNumber}`);
        fetchQuotes();
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error converting quotation");
    } finally {
      setConvertingId(null);
    }
  };

  // Metrics
  const totalValue = quotes.reduce((acc, q) => acc + q.grandTotal, 0);
  const acceptedQuotes = quotes.filter((q) => q.status === "ACCEPTED");
  const winRate = quotes.length > 0 ? Math.round((acceptedQuotes.length / quotes.length) * 100) : 0;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Quotations & Estimates
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Build tiered volume quotes, calculate GST slabs, export official PDFs, and convert to production.
          </p>
        </div>

        <Link
          href="/quotes/new"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Quotation</span>
        </Link>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Total Quoted Volume</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(totalValue)}
          </div>
          <span className="text-[11px] text-zinc-400">{quotes.length} total commercial estimates</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Proposal Acceptance Rate</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {winRate}%
          </div>
          <span className="text-[11px] text-zinc-400">{acceptedQuotes.length} converted to production</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Average Proposal Size</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(quotes.length > 0 ? totalValue / quotes.length : 0)}
          </div>
          <span className="text-[11px] text-zinc-400">Standard apparel & kits blend</span>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "DRAFT", "SENT", "ACCEPTED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                statusFilter === st
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {st === "ALL" ? "All Estimates" : QUOTE_STATUS[st]?.label || st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by quote # or client..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Quotations Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 font-mono uppercase text-zinc-500 text-[10px]">
              <tr>
                <th className="px-4 py-3">Quote Ref</th>
                <th className="px-4 py-3">Corporate Client</th>
                <th className="px-4 py-3">Line Items</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3 text-right">Taxable</th>
                <th className="px-4 py-3 text-right">Total Payable</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                    <span>Loading quotations...</span>
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    No quotations found matching criteria.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => {
                  const statusConfig = QUOTE_STATUS[q.status] || QUOTE_STATUS.DRAFT;
                  const isConverted = Boolean(q.order);

                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {q.quoteNumber}
                        <div className="text-[10px] text-zinc-400 font-normal">
                          {formatDate(q.createdAt)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {q.companyName}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {q.customerName} • {q.clientPhone}
                        </div>
                        {q.clientGstin && (
                          <div className="text-[10px] font-mono text-zinc-400">
                            GST: {q.clientGstin}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-xs truncate">
                        <div className="text-zinc-800 dark:text-zinc-200 truncate">
                          {q.items.map((i) => i.productTitle).join(", ")}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {q.items.reduce((acc, i) => acc + i.quantity, 0)} units total
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                        {formatDate(q.validUntil)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-zinc-600 dark:text-zinc-400">
                        {formatCurrency(q.subtotal - q.discountAmount)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(q.grandTotal)}
                        <div className="text-[10px] text-zinc-400 font-normal">
                          Adv 50%: {formatCurrency(q.grandTotal * 0.5)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {isConverted ? (
                          <>
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusConfig.badge}`}>
                              {statusConfig.label}
                            </span>
                            <div className="text-[10px] font-mono text-emerald-600 mt-1">
                              Order {q.order?.orderNumber}
                            </div>
                          </>
                        ) : (
                          <select
                            value={q.status}
                            onChange={(e) => handleStatusChange(q.id, e.target.value)}
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-hidden ${statusConfig.badge}`}
                          >
                            {Object.entries(QUOTE_STATUS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleDownloadPDF(q)}
                          title="Download Official PDF Estimate"
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                        >
                          <FileDown className="w-3.5 h-3.5 text-orange-600" />
                          <span>PDF</span>
                        </button>

                        {!isConverted && (
                          <>
                            <button
                              onClick={() => handleConvertToOrder(q.id)}
                              disabled={convertingId === q.id}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs inline-flex items-center gap-1 active:scale-95"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{convertingId === q.id ? "Converting..." : "Accept & Order"}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteQuote(q.id, q.quoteNumber)}
                              title="Delete Draft Quotation"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-500/10 transition-colors inline-flex items-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {isConverted && (
                          <Link
                            href="/production"
                            className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1"
                          >
                            <span>Production</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
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
    </div>
  );
}

