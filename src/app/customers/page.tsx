"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  CheckCircle2,
  X,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  totalOrders: number;
  totalSpend: number;
  notes?: string | null;
  orders: Array<{ id: string; orderNumber: string; totalAmount: number; stage: string }>;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    gstin: "",
    address: "",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560038",
    notes: "",
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/customers", window.location.origin);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalClients = customers.length;
  const totalLifetimeGMV = customers.reduce((acc, c) => acc + c.totalSpend, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-orange-600" />
            <span>Corporate Clients & Accounts</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            B2B accounts directory with GSTIN registration, delivery addresses, and cumulative merchandise spend.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Client Account</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Corporate Accounts</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {totalClients} Companies
          </div>
          <span className="text-[11px] text-zinc-400">Verified GST registered businesses</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Cumulative Lifetime GMV</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(totalLifetimeGMV)}
          </div>
          <span className="text-[11px] text-zinc-400">Total B2B apparel & kits fulfilled</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Avg Account Spend</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(totalClients > 0 ? totalLifetimeGMV / totalClients : 0)}
          </div>
          <span className="text-[11px] text-zinc-400">Repeat customer lifetime value</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCustomers()}
            placeholder="Search company, SPOC, GSTIN..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
          />
        </div>

        <button
          onClick={fetchCustomers}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 text-zinc-600 dark:text-zinc-400"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 font-mono uppercase text-zinc-500 text-[10px]">
              <tr>
                <th className="px-4 py-3">Client Code</th>
                <th className="px-4 py-3">Company & GSTIN</th>
                <th className="px-4 py-3">Primary SPOC</th>
                <th className="px-4 py-3">Registered City</th>
                <th className="px-4 py-3 text-center">Orders</th>
                <th className="px-4 py-3 text-right">Lifetime Spend</th>
                <th className="px-4 py-3">Notes & Standards</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                    <span>Loading corporate clients...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400">
                    No client records found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/50 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {c.customerCode}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {c.companyName}
                      </div>
                      {c.gstin ? (
                        <div className="text-[10px] font-mono text-orange-600 dark:text-orange-400">
                          GSTIN: {c.gstin}
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-400">Unregistered GST</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">
                        {c.contactPerson}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {c.phone} • {c.email}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-300">
                      <div>{c.city || "Bangalore"}, {c.state || "KA"}</div>
                      <div className="text-[10px] text-zinc-400 truncate max-w-xs">{c.address}</div>
                    </td>

                    <td className="px-4 py-3.5 text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {c.totalOrders}
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(c.totalSpend)}
                    </td>

                    <td className="px-4 py-3.5 text-zinc-500 text-[11px] max-w-xs truncate">
                      {c.notes || "Standard B2B terms."}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg shadow-elevated space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Register Corporate Client Account
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
                  placeholder="e.g. PhonePe Technologies"
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
                  placeholder="e.g. Sameer Nigam"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Official Email *</label>
                <input
                  type="email"
                  required
                  placeholder="procurement@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98000 00000"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="text-zinc-500 font-medium">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="29AABCP1234F1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gstin: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono uppercase"
                />
              </div>

              <div className="col-span-2">
                <label className="text-zinc-500 font-medium">Billing & Delivery Address</label>
                <input
                  type="text"
                  placeholder="Office Park / Commercial Tower"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Pincode</label>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
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
                {saving ? "Registering..." : "Save Account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
