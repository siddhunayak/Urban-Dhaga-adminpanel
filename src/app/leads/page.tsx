"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Inbox,
  Plus,
  Search,
  FileSpreadsheet,
  X,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate, LEAD_STAGES } from "@/lib/utils";

interface Lead {
  id: string;
  leadNumber: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  city?: string | null;
  requirement: string;
  category: string;
  estimatedQuantity: number;
  estimatedBudget?: number | null;
  targetDate?: string | null;
  stage: string;
  source: string;
  notes?: string | null;
  assignedTo?: string | null;
  createdAt: string;
}

const STAGES = [
  "NEW",
  "CONTACTED",
  "REQUIREMENT_GATHERED",
  "QUOTE_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // New lead form
  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    city: "Bangalore",
    requirement: "",
    category: "APPAREL",
    estimatedQuantity: 200,
    estimatedBudget: 90000,
    targetDate: "",
    source: "WEBSITE",
    notes: "",
    assignedTo: "Pooja Nair",
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/leads", window.location.origin);
      if (stageFilter !== "ALL") url.searchParams.set("stage", stageFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setShowAddModal(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 200);
    return () => clearTimeout(timer);
  }, [stageFilter, search]);

  const handleUpdateStage = async (leadId: string, nextStage: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (!res.ok) {
        toast.error("Failed to update lead stage");
        return;
      }
      toast.success(`Lead moved to ${LEAD_STAGES[nextStage]?.label || nextStage}`);
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error("Network error updating lead");
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to register lead");
        return;
      }

      toast.success(`Inquiry ${data.leadNumber} registered`);
      setShowAddModal(false);
      setFormData({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        city: "Bangalore",
        requirement: "",
        category: "APPAREL",
        estimatedQuantity: 200,
        estimatedBudget: 90000,
        targetDate: "",
        source: "WEBSITE",
        notes: "",
        assignedTo: "Pooja Nair",
      });
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error("Network error creating lead");
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const totalLeads = leads.length;
  const wonCount = leads.filter((l) => l.stage === "WON").length;
  const pipelineValue = leads
    .filter((l) => l.stage !== "WON" && l.stage !== "LOST")
    .reduce((acc, l) => acc + (l.estimatedBudget || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-orange-600" />
            <span>Corporate Inquiries & Leads</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Inbound bulk merchandising requests from website, WhatsApp, and procurement references.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Inbound Inquiry</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Pipeline Inquiries Value</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(pipelineValue)}
          </div>
          <span className="text-[11px] text-zinc-400">Active under negotiation</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Won Client Accounts</span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {wonCount} Deals Won
          </div>
          <span className="text-[11px] text-zinc-400">Converted to production orders</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Total Inquiries</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {totalLeads} Records
          </div>
          <span className="text-[11px] text-zinc-400">Website, WhatsApp, Direct</span>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStageFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
              stageFilter === "ALL"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
            }`}
          >
            All Inquiries
          </button>
          {STAGES.map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                stageFilter === st
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
              }`}
            >
              {LEAD_STAGES[st]?.label || st}
            </button>
          ))}
        </div>

        <div className="relative md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLeads()}
            placeholder="Search company, contact, or req..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 font-mono uppercase text-zinc-500 text-[10px]">
              <tr>
                <th className="px-4 py-3">Ref & Date</th>
                <th className="px-4 py-3">Client Entity</th>
                <th className="px-4 py-3">Custom Requirement</th>
                <th className="px-4 py-3 text-right">Volume</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-center">Stage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                    <span>Loading inquiries...</span>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    No leads found matching criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const stageConfig = LEAD_STAGES[lead.stage] || LEAD_STAGES.NEW;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {lead.leadNumber}
                        <div className="text-[10px] text-zinc-400 font-normal">
                          {formatDate(lead.createdAt)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {lead.companyName}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {lead.contactPerson} • {lead.phone}
                        </div>
                        {lead.city && (
                          <div className="text-[10px] text-zinc-400">{lead.city}</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="text-zinc-800 dark:text-zinc-200 line-clamp-2">
                          {lead.requirement}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          Source: {lead.source} • Owner: {lead.assignedTo || "Unassigned"}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {lead.estimatedQuantity} pcs
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {lead.estimatedBudget ? formatCurrency(lead.estimatedBudget) : "—"}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <select
                          value={lead.stage}
                          onChange={(e) => handleUpdateStage(lead.id, e.target.value)}
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-hidden ${stageConfig.badge}`}
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {LEAD_STAGES[s]?.label || s}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/quotes/new?companyName=${encodeURIComponent(lead.companyName)}&customerName=${encodeURIComponent(lead.contactPerson)}&clientEmail=${encodeURIComponent(lead.email)}&clientPhone=${encodeURIComponent(lead.phone)}&notes=${encodeURIComponent(lead.requirement)}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-md inline-flex items-center gap-1 transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Quote</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateLead}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg shadow-elevated space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Register New Bulk Inquiry
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-zinc-500 font-medium">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy / InMobi"
                  value={formData.companyName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-zinc-500 font-medium">Contact Person *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Phone / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98000 00000"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Email Address</label>
                <input
                  type="email"
                  placeholder="client@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="text-zinc-500 font-medium">Requirement Brief *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 500 Heavyweight Oversized Hoodies with front embroidery for annual hackathon"
                  value={formData.requirement}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requirement: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Est. Quantity (Units)</label>
                <input
                  type="number"
                  min="10"
                  value={formData.estimatedQuantity}
                  onChange={(e) => setFormData((prev) => ({ ...prev, estimatedQuantity: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Est. Budget (INR)</label>
                <input
                  type="number"
                  value={formData.estimatedBudget}
                  onChange={(e) => setFormData((prev) => ({ ...prev, estimatedBudget: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Inquiry Source</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                >
                  <option value="WEBSITE">Website Form</option>
                  <option value="WHATSAPP">WhatsApp Business</option>
                  <option value="REFERRAL">Client Referral</option>
                  <option value="DIRECT">Direct Calling</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Assigned Sales SPOC</label>
                <input
                  type="text"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm"
              >
                {saving ? "Registering..." : "Save Inquiry"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

