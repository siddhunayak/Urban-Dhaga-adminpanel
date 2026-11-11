"use client";

import { useEffect, useState } from "react";
import {
  Users2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Star,
  Layers,
  Wrench,
  CheckCircle2,
  X,
  RefreshCw,
  Factory,
} from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string | null;
  servicesProvided: string;
  address?: string | null;
  rating: number;
  activeJobsCount: number;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    contactPerson: "",
    phone: "",
    email: "",
    servicesProvided: "SCREEN_PRINTING, DTF",
    address: "Peenya Industrial Area, Bangalore",
    rating: 4.8,
  });

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vendors");
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchVendors();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Users2 className="w-6 h-6 text-orange-600" />
            <span>Vendors & Manufacturing Workshops</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Specialized outsourced printing, ton-sur-ton embroidery, stitching units, and custom packaging partners.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Workshop Partner</span>
        </button>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
          <span>Loading vendors...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((v) => {
            const services = v.servicesProvided.split(",").map((s) => s.trim());

            return (
              <div
                key={v.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm p-5 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {v.name}
                      </h3>
                      <span className="text-[11px] text-zinc-500">{v.companyName}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{v.rating}</span>
                    </div>
                  </div>

                  {/* Capabilities / Services */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {services.map((svc) => (
                      <span
                        key={svc}
                        className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        {svc.replace("_", " ")}
                      </span>
                    ))}
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 font-medium">
                      <span>SPOC: {v.contactPerson}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      <span>{v.phone}</span>
                    </div>
                    {v.address && (
                      <div className="flex items-start gap-2 text-[11px] text-zinc-400">
                        <MapPin className="w-3 h-3 text-zinc-400 shrink-0 mt-0.5" />
                        <span className="truncate">{v.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Active Production Jobs:</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded bg-orange-500/10">
                    {v.activeJobsCount} Active
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateVendor}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-elevated space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Register Workshop / Job Worker
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 font-medium">Workshop Trade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Screen Printing Hub"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Registered Business Entity</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Textiles LLP"
                  value={formData.companyName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-500 font-medium">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Babu"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactPerson: e.target.value }))}
                    className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-zinc-500 font-medium">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Services Provided (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="SCREEN_PRINTING, DTF, EMBROIDERY, PACKAGING"
                  value={formData.servicesProvided}
                  onChange={(e) => setFormData((prev) => ({ ...prev, servicesProvided: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Facility Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
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
                {saving ? "Registering..." : "Save Partner"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
