"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Activity,
  Users,
  X,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  phone?: string | null;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

const ROLE_BADGES: Record<string, string> = {
  OWNER: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SALES: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PRODUCTION: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  ACCOUNTS: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  STAFF: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
};

export default function TeamPage() {
  const [users, setUsers] = useState<StaffMember[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"team" | "audit">("team");
  const [entityFilter, setEntityFilter] = useState("ALL");

  // Add staff modal
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES",
    department: "Sales & Quotes",
    phone: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, usersRes, auditRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/users"),
        fetch(`/api/audit${entityFilter !== "ALL" ? `?entityType=${entityFilter}` : ""}`),
      ]);

      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUserRole(me.user?.role || "");
      }
      if (usersRes.ok) setUsers(await usersRes.json());
      if (auditRes.ok) setLogs(await auditRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [entityFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create staff member");
        return;
      }
      toast.success(`Provisioned account for ${data.name}`);
      setShowAdd(false);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "SALES",
        department: "Sales & Quotes",
        phone: "",
      });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Network error creating account");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: StaffMember) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }
      toast.success(`${u.name} ${data.isActive ? "activated" : "deactivated"}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleUpdate = async (u: StaffMember, role: string) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Permission denied");
        return;
      }
      toast.success(`Updated ${u.name} role to ${role}`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const isOwner = currentUserRole === "OWNER";

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-orange-600" />
            <span>Team Access & Audit Trail</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Role-based access control across Sales, Production, and Accounts, plus immutable activity history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
            <button
              onClick={() => setTab("team")}
              className={`px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1.5 ${
                tab === "team"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff & Roles ({users.length})</span>
            </button>
            <button
              onClick={() => setTab("audit")}
              className={`px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1.5 ${
                tab === "audit"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Log ({logs.length})</span>
            </button>
          </div>

          {isOwner && tab === "team" && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
          <span className="text-xs font-mono">Loading access controls...</span>
        </div>
      ) : tab === "team" ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 font-mono uppercase text-zinc-500 text-[10px]">
                <tr>
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-center">Access Role</th>
                  <th className="px-4 py-3 text-center">Account Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/50">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {u.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {u.email} {u.phone ? `• ${u.phone}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-300">
                      {u.department}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {isOwner ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleUpdate(u, e.target.value)}
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border cursor-pointer ${
                            ROLE_BADGES[u.role] || ROLE_BADGES.STAFF
                          }`}
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="SALES">SALES</option>
                          <option value="PRODUCTION">PRODUCTION</option>
                          <option value="ACCOUNTS">ACCOUNTS</option>
                          <option value="STAFF">STAFF</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                            ROLE_BADGES[u.role] || ROLE_BADGES.STAFF
                          }`}
                        >
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 border-red-500/20"
                        }`}
                      >
                        {u.isActive ? "ACTIVE" : "DISABLED"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isOwner ? (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 underline"
                        >
                          {u.isActive ? "Disable" : "Activate"}
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-zinc-400">Owner managed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["ALL", "ORDER", "QUOTE", "LEAD", "INVENTORY", "AUTH", "TEAM"].map((ent) => (
              <button
                key={ent}
                onClick={() => setEntityFilter(ent)}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg ${
                  entityFilter === ent
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600"
                }`}
              >
                {ent}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
                    {entry.entityType}
                  </span>
                  <span className="text-[10px] font-mono text-orange-600 shrink-0">
                    {entry.action}
                  </span>
                  <span className="text-zinc-800 dark:text-zinc-200 truncate">
                    {entry.description}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400 shrink-0">
                  {entry.performedBy} • {formatDateTime(entry.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUser}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-elevated space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Provision New Staff Login
              </h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Work Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-500 font-medium">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  >
                    <option value="SALES">SALES</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                    <option value="ACCOUNTS">ACCOUNTS</option>
                    <option value="STAFF">STAFF</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-500 font-medium">Department</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                    className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg"
              >
                {saving ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
