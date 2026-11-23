"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { titleCase } from "@/lib/order-status";
import { Button, Card, CardHeader, Field, inputCls, selectCls, apiError } from "@/components/ui";

interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  leadTimeDays: number;
  pricingTiers: { minQty: number; maxQty: number | null; unitPrice: number }[];
}

interface Line {
  key: number;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  customizationDetails: string;
  priceTouched: boolean;
}

const NEW_CUSTOMER = "__new__";

function tierPrice(p: Product, qty: number) {
  const tier = p.pricingTiers.find((t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty));
  return tier?.unitPrice ?? p.basePrice;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

let lineKey = 1;
const blankLine = (): Line => ({
  key: lineKey++,
  productId: "",
  productName: "",
  sku: "",
  quantity: 50,
  unitPrice: 0,
  customizationDetails: "",
  priceTouched: false,
});

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [contact, setContact] = useState({
    companyName: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    shippingAddress: "",
  });
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [priority, setPriority] = useState("NORMAL");
  const [deliveryDate, setDeliveryDate] = useState(isoDate(new Date(Date.now() + 10 * 86400000)));
  const [advancePaid, setAdvancePaid] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/products").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([c, p]) => {
        setCustomers(c);
        setProducts((p as (Product & { isActive?: boolean })[]).filter((x) => x.isActive !== false));
      })
      .catch(() => toast.error("Couldn't load customers and products"));
  }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0), [lines]);
  const isNewCustomer = customerId === NEW_CUSTOMER;

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      const addr = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(", ");
      setContact({
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        contactEmail: c.email,
        contactPhone: c.phone,
        shippingAddress: addr,
      });
    } else {
      setContact({ companyName: "", contactPerson: "", contactEmail: "", contactPhone: "", shippingAddress: "" });
    }
  };

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        const p = products.find((x) => x.id === next.productId);
        // Re-price from the volume slab whenever product/qty changes, unless the price was edited by hand.
        if (p && !next.priceTouched && ("productId" in patch || "quantity" in patch)) {
          next.unitPrice = tierPrice(p, next.quantity);
        }
        return next;
      })
    );

  const pickProduct = (key: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    updateLine(key, {
      productId,
      productName: p?.name ?? "",
      sku: p?.sku ?? "",
      priceTouched: false,
    });
    if (p) {
      const minDate = isoDate(new Date(Date.now() + p.leadTimeDays * 86400000));
      setDeliveryDate((d) => (d < minDate ? minDate : d));
    }
  };

  const submit = async () => {
    if (!customerId) return toast.error("Select a customer");
    if (!contact.companyName.trim() || !contact.contactPerson.trim())
      return toast.error("Company name and contact person are required");
    if (isNewCustomer && (!contact.contactEmail.trim() || !contact.contactPhone.trim()))
      return toast.error("Email and phone are required for a new customer");
    const validLines = lines.filter((l) => l.productName.trim());
    if (validLines.length === 0) return toast.error("Add at least one product");
    if (validLines.some((l) => l.quantity <= 0 || l.unitPrice < 0)) return toast.error("Check quantities and prices");
    if (total <= 0) return toast.error("Order total must be greater than zero");
    if (advancePaid > total) return toast.error("Advance can't be more than the order total");

    setSaving(true);
    try {
      let finalCustomerId = customerId;
      if (isNewCustomer) {
        const cRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: contact.companyName,
            contactPerson: contact.contactPerson,
            email: contact.contactEmail,
            phone: contact.contactPhone,
            address: contact.shippingAddress,
          }),
        });
        if (!cRes.ok) throw new Error(await apiError(cRes, "Couldn't create customer"));
        finalCustomerId = (await cRes.json()).id;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: finalCustomerId,
          ...contact,
          priority,
          targetDeliveryDate: deliveryDate,
          advancePaid,
          notes: notes.trim() || null,
          items: validLines.map((l) => ({
            productName: l.productName.trim(),
            sku: l.sku || undefined,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            customizationDetails: l.customizationDetails.trim() || undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error(await apiError(res, "Couldn't create order"));
      const order = await res.json();
      toast.success(`Order ${order.orderNumber} created`);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create order");
      setSaving(false);
    }
  };

  const setC = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setContact((c) => ({ ...c, [k]: e.target.value }));

  return (
    <div className="p-7 space-y-5 max-w-6xl">
      <Link href="/orders" className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders Register
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Customer */}
          <Card>
            <CardHeader title="Customer" subtitle="Pick an existing customer or add a new one" />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Customer" required className="sm:col-span-2">
                <select value={customerId} onChange={(e) => pickCustomer(e.target.value)} className={selectCls + " w-full"}>
                  <option value="">Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} — {c.contactPerson} ({c.customerCode})
                    </option>
                  ))}
                  <option value={NEW_CUSTOMER}>+ New customer</option>
                </select>
              </Field>
              {customerId && (
                <>
                  <Field label="Company name" required>
                    <input className={inputCls} value={contact.companyName} onChange={setC("companyName")} />
                  </Field>
                  <Field label="Contact person" required>
                    <input className={inputCls} value={contact.contactPerson} onChange={setC("contactPerson")} />
                  </Field>
                  <Field label="Email" required={isNewCustomer}>
                    <input type="email" className={inputCls} value={contact.contactEmail} onChange={setC("contactEmail")} />
                  </Field>
                  <Field label="Phone" required={isNewCustomer}>
                    <input className={inputCls} value={contact.contactPhone} onChange={setC("contactPhone")} />
                  </Field>
                  <Field label="Shipping address" className="sm:col-span-2">
                    <textarea
                      rows={2}
                      className={inputCls + " h-auto py-2"}
                      value={contact.shippingAddress}
                      onChange={setC("shippingAddress")}
                    />
                  </Field>
                </>
              )}
            </div>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader
              title="Line items"
              subtitle="Unit price fills in from the product's volume slab; you can override it"
              action={
                <Button onClick={() => setLines((l) => [...l, blankLine()])}>
                  <Plus className="w-3.5 h-3.5" /> Add item
                </Button>
              }
            />
            <div className="divide-y divide-zinc-100">
              {lines.map((l, i) => (
                <div key={l.key} className="p-4 grid grid-cols-12 gap-3 items-end">
                  <Field label={`Product ${i + 1}`} className="col-span-12 sm:col-span-5">
                    <select value={l.productId} onChange={(e) => pickProduct(l.key, e.target.value)} className={selectCls + " w-full"}>
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {titleCase(p.category)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Qty" className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      className={inputCls + " font-mono"}
                      value={l.quantity}
                      onChange={(e) => updateLine(l.key, { quantity: Math.max(0, Number(e.target.value)) })}
                    />
                  </Field>
                  <Field label="Unit price (₹)" className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min={0}
                      className={inputCls + " font-mono"}
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l.key, { unitPrice: Math.max(0, Number(e.target.value)), priceTouched: true })}
                    />
                  </Field>
                  <div className="col-span-3 sm:col-span-2 text-right">
                    <div className="text-[11px] text-zinc-500 mb-1">Line total</div>
                    <div className="h-8 flex items-center justify-end font-mono text-xs font-semibold">
                      {formatCurrency(l.quantity * l.unitPrice)}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={lines.length === 1}
                      onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Field label="Branding / customisation" className="col-span-12">
                    <input
                      className={inputCls}
                      placeholder="e.g. Front chest logo, screen print, 2 colours"
                      value={l.customizationDetails}
                      onChange={(e) => updateLine(l.key, { customizationDetails: e.target.value })}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Order details" />
            <div className="p-4 space-y-3">
              <Field label="Priority">
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectCls + " w-full"}>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </Field>
              <Field label="Target delivery date" required>
                <input type="date" className={inputCls} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
              </Field>
              <Field label="Advance received (₹)" hint="Leave 0 if no payment yet">
                <input
                  type="number"
                  min={0}
                  className={inputCls + " font-mono"}
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Math.max(0, Number(e.target.value)))}
                />
              </Field>
              <Field label="Internal notes">
                <textarea rows={3} className={inputCls + " h-auto py-2"} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-4 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Items</span>
              <span className="font-mono">{lines.filter((l) => l.productName).length}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Advance</span>
              <span className="font-mono">{formatCurrency(advancePaid)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Balance due</span>
              <span className="font-mono">{formatCurrency(Math.max(0, total - advancePaid))}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-200 text-sm font-semibold">
              <span>Order total</span>
              <span className="font-mono">{formatCurrency(total)}</span>
            </div>
            <Button variant="primary" className="w-full mt-2 h-9" disabled={saving} onClick={submit}>
              {saving ? "Creating order…" : "Create order"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
