"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { cn, formatCurrency, formatDate, ORDER_STAGES } from "@/lib/utils";
import { APP_REFRESH_EVENT } from "@/components/layout/header";
import { Badge, Button, Card, EmptyRow, Field, Modal, inputCls, thCls, theadRowCls, apiError } from "@/components/ui";

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
  notes?: string | null;
  createdAt: string;
  orders: { id: string; orderNumber: string; totalAmount: number; stage: string; createdAt: string }[];
}

type Form = Omit<Customer, "id" | "customerCode" | "createdAt" | "orders">;
const EMPTY: Form = { companyName: "", contactPerson: "", email: "", phone: "", gstin: "", address: "", city: "", state: "", pincode: "", notes: "" };
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const list: Customer[] = await res.json();
      setCustomers(list);
      return list;
    } catch {
      toast.error("Couldn't load customers");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().then((list) => {
      // Deep link from an order page: /customers?focus=<id>
      const focus = new URLSearchParams(window.location.search).get("focus");
      const c = focus && list.find((x) => x.id === focus);
      if (c) setViewing(c);
    });
    window.addEventListener(APP_REFRESH_EVENT, load);
    return () => window.removeEventListener(APP_REFRESH_EVENT, load);
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .map((c) => {
        const live = c.orders.filter((o) => o.stage !== "CANCELLED");
        return { ...c, orderCount: live.length, spend: live.reduce((s, o) => s + o.totalAmount, 0) };
      })
      .filter(
        (c) =>
          !q ||
          [c.customerCode, c.companyName, c.contactPerson, c.email, c.phone, c.gstin ?? "", c.city ?? ""].join(" ").toLowerCase().includes(q)
      );
  }, [customers, search]);

  const save = async () => {
    if (!editing) return;
    const f = editing.form;
    if (!f.companyName.trim() || !f.contactPerson.trim() || !f.email.trim() || !f.phone.trim())
      return toast.error("Company, contact person, email and phone are required");
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return toast.error("Enter a valid email");
    const gstin = (f.gstin ?? "").trim().toUpperCase();
    if (gstin && !GSTIN_RE.test(gstin)) return toast.error("GSTIN should be 15 characters, e.g. 29ABCDE1234F1Z5");

    setSaving(true);
    try {
      const res = await fetch(editing.id ? `/api/customers/${editing.id}` : "/api/customers", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, gstin: gstin || null }),
      });
      if (!res.ok) throw new Error(await apiError(res, "Couldn't save customer"));
      toast.success(editing.id ? "Customer updated" : "Customer added");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save customer");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Customer) => {
    if (!confirm(`Delete ${c.companyName}?`)) return;
    const res = await fetch(`/api/customers/${c.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error(await apiError(res, "Couldn't delete customer"));
    toast.success("Customer deleted");
    load();
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditing((ed) => (ed ? { ...ed, form: { ...ed.form, [k]: e.target.value } } : ed));

  return (
    <div className="p-7 space-y-5">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
          <div className="relative w-full sm:w-[260px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, code, GSTIN, city.." className={inputCls + " pl-8"} />
          </div>
          <Button variant="primary" onClick={() => setEditing({ id: null, form: { ...EMPTY } })}>
            <Plus className="w-3.5 h-3.5" /> Add Customer
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={cn(theadRowCls, "border-t")}>
                <th className={thCls}>Code</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Contact</th>
                <th className={thCls}>GSTIN</th>
                <th className={thCls}>City</th>
                <th className={cn(thCls, "text-right")}>Orders</th>
                <th className={cn(thCls, "text-right")}>Order Value</th>
                <th className={cn(thCls, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} onClick={() => setViewing(c)} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70 cursor-pointer">
                  <td className="px-4 py-3 font-mono text-zinc-700 whitespace-nowrap">{c.customerCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900">{c.companyName}</div>
                    <div className="text-[11px] text-zinc-500">{c.contactPerson}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-zinc-700">{c.email}</div>
                    <div className="text-[11px] text-zinc-500">{c.phone}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-700">{c.gstin || "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{c.city || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(c.spend)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" className="h-7 px-2" title="Edit" onClick={() => setEditing({ id: c.id, form: pick(c) })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" className="h-7 px-2 hover:text-red-700" title="Delete" onClick={() => remove(c)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <EmptyRow cols={8}>{loading ? "Loading customers…" : search ? "No matching customers found." : 'No customers yet. Click "+ Add Customer" to start.'}</EmptyRow>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / edit */}
      <Modal
        open={!!editing}
        wide
        title={editing?.id ? "Edit customer" : "Add customer"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save customer"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Company name" required>
              <input className={inputCls} autoFocus value={editing.form.companyName} onChange={set("companyName")} />
            </Field>
            <Field label="Contact person" required>
              <input className={inputCls} value={editing.form.contactPerson} onChange={set("contactPerson")} />
            </Field>
            <Field label="Email" required>
              <input type="email" className={inputCls} value={editing.form.email} onChange={set("email")} />
            </Field>
            <Field label="Phone" required>
              <input className={inputCls} value={editing.form.phone} onChange={set("phone")} />
            </Field>
            <Field label="GSTIN" hint="Optional · 15 characters">
              <input className={inputCls + " font-mono uppercase"} value={editing.form.gstin ?? ""} onChange={set("gstin")} />
            </Field>
            <Field label="City">
              <input className={inputCls} value={editing.form.city ?? ""} onChange={set("city")} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className={inputCls} value={editing.form.address ?? ""} onChange={set("address")} />
            </Field>
            <Field label="State">
              <input className={inputCls} value={editing.form.state ?? ""} onChange={set("state")} />
            </Field>
            <Field label="Pincode">
              <input className={inputCls} value={editing.form.pincode ?? ""} onChange={set("pincode")} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea rows={2} className={inputCls + " h-auto py-2"} value={editing.form.notes ?? ""} onChange={set("notes")} />
            </Field>
          </div>
        )}
      </Modal>

      {/* Customer detail */}
      <Modal
        open={!!viewing}
        wide
        title={viewing ? `${viewing.companyName} · ${viewing.customerCode}` : ""}
        onClose={() => setViewing(null)}
        footer={
          viewing && (
            <>
              <Button
                onClick={() => {
                  setEditing({ id: viewing.id, form: pick(viewing) });
                  setViewing(null);
                }}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              <Link href="/orders/new">
                <Button variant="primary">
                  <Plus className="w-3.5 h-3.5" /> New Order
                </Button>
              </Link>
            </>
          )
        }
      >
        {viewing && (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <Info label="Contact" value={viewing.contactPerson} />
              <Info label="Email" value={viewing.email} />
              <Info label="Phone" value={viewing.phone} />
              <Info label="GSTIN" value={viewing.gstin || "—"} />
              <Info label="Address" value={[viewing.address, viewing.city, viewing.state, viewing.pincode].filter(Boolean).join(", ") || "—"} />
              <Info label="Customer since" value={formatDate(viewing.createdAt)} />
            </div>
            <div className="pt-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500 mb-2">Orders ({viewing.orders.length})</div>
              <div className="border border-zinc-200 rounded-md divide-y divide-zinc-100">
                {viewing.orders.map((o) => {
                  const st = ORDER_STAGES[o.stage] ?? ORDER_STAGES.ORDER_CONFIRMED;
                  return (
                    <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-zinc-50">
                      <span className="font-mono font-medium">{o.orderNumber}</span>
                      <Badge className={cn(st.bg, st.text, st.border)}>{st.label}</Badge>
                      <span className="text-zinc-500">{formatDate(o.createdAt)}</span>
                      <span className="font-mono font-medium">{formatCurrency(o.totalAmount)}</span>
                    </Link>
                  );
                })}
                {viewing.orders.length === 0 && <div className="px-3 py-3 text-xs text-zinc-500">No orders yet.</div>}
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function pick(c: Customer): Form {
  return {
    companyName: c.companyName,
    contactPerson: c.contactPerson,
    email: c.email,
    phone: c.phone,
    gstin: c.gstin ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    pincode: c.pincode ?? "",
    notes: c.notes ?? "",
  };
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className="text-zinc-900">{value}</div>
    </div>
  );
}
