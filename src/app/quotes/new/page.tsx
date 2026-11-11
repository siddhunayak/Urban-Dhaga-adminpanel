"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileDown,
  Calculator,
  Building2,
  Package,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { generateQuotationPDF } from "@/lib/pdf-generator";

interface CustomerOption {
  id: string;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
}

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  category: string;
  basePrice: number;
  gstRate: number;
  pricingTiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number }>;
}

interface FormItem {
  productId?: string;
  productTitle: string;
  description: string;
  sizeBreakdown: { S: number; M: number; L: number; XL: number; "2XL": number };
  quantity: number;
  baseUnitPrice: number;
  customizationDetails: string;
  customizationCost: number;
  unitPrice: number;
  lineTotal: number;
}

const BRANDING_OPTIONS = [
  { label: "None (Blank Stock)", cost: 0 },
  { label: "Front Left Chest Ton-sur-Ton Embroidery", cost: 40 },
  { label: "Chest DTF Graphic + Back Screen Print (2-color)", cost: 55 },
  { label: "Front Left Chest Silicone HD Badge", cost: 50 },
  { label: "Laser Engraved Logo (Drinkware / Tech)", cost: 35 },
  { label: "Custom Woven Neck Tag + Size Sticker Polybag", cost: 25 },
];

export default function NewQuotationPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Client info state
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  // Commercial terms
  const [validDays, setValidDays] = useState(14);
  const [estimatedDays, setEstimatedDays] = useState(10);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxType, setTaxType] = useState("CGST_SGST");
  const [gstRate, setGstRate] = useState(5.0);
  const [advancePercent, setAdvancePercent] = useState(50);
  const [notes, setNotes] = useState("PANTONE match strictly guaranteed within +/- 5% delta.");
  const [submitting, setSubmitting] = useState(false);

  // Line items
  const [items, setItems] = useState<FormItem[]>([
    {
      productId: "",
      productTitle: "Heavyweight Cotton Oversized Tee (240 GSM)",
      description: "100% Combed Cotton 240 GSM, Ribbed Collar, Bio-washed",
      sizeBreakdown: { S: 25, M: 50, L: 50, XL: 25, "2XL": 0 },
      quantity: 150,
      baseUnitPrice: 420,
      customizationDetails: "Front Left Chest Ton-sur-Ton Embroidery",
      customizationCost: 40,
      unitPrice: 460,
      lineTotal: 69000,
    },
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("companyName")) setCompanyName(params.get("companyName") || "");
    if (params.get("customerName")) setCustomerName(params.get("customerName") || "");
    if (params.get("clientEmail")) setClientEmail(params.get("clientEmail") || "");
    if (params.get("clientPhone")) setClientPhone(params.get("clientPhone") || "");
    if (params.get("notes")) setNotes(params.get("notes") || "");

    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data))
      .catch(() => {});

    fetch("/api/products")
      .then((r) => r.json())
      .then((data: ProductOption[]) => {
        setProducts(data);
        if (Array.isArray(data) && data.length > 0) {
          const defaultProd = data.find((p) => p.sku === "UD-TSH-001") || data[0];
          setItems((prev) => {
            if (prev.length === 1 && !prev[0].productId) {
              const basePrice = getTierPrice(defaultProd, prev[0].quantity);
              const unitPrice = basePrice + prev[0].customizationCost;
              return [
                {
                  ...prev[0],
                  productId: defaultProd.id,
                  productTitle: defaultProd.name,
                  baseUnitPrice: basePrice,
                  unitPrice,
                  lineTotal: unitPrice * prev[0].quantity,
                },
              ];
            }
            return prev;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const c = customers.find((cust) => cust.id === customerId);
    if (c) {
      setCompanyName(c.companyName);
      setCustomerName(c.contactPerson);
      setClientEmail(c.email);
      setClientPhone(c.phone);
      setClientGstin(c.gstin || "");
      setShippingAddress(`${c.address || ""}, ${c.city || ""}`);
    }
  };

  const getTierPrice = (prod: ProductOption, qty: number): number => {
    if (!prod.pricingTiers || prod.pricingTiers.length === 0) return prod.basePrice;
    const sorted = [...prod.pricingTiers].sort((a, b) => b.minQty - a.minQty);
    for (const t of sorted) {
      if (qty >= t.minQty) {
        return t.unitPrice;
      }
    }
    return prod.basePrice;
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      const current = copy[index];
      const basePrice = getTierPrice(prod, current.quantity);
      const unitPrice = basePrice + current.customizationCost;
      copy[index] = {
        ...current,
        productId: prod.id,
        productTitle: prod.name,
        baseUnitPrice: basePrice,
        unitPrice,
        lineTotal: unitPrice * current.quantity,
      };
      return copy;
    });

    if (prod.gstRate && index === 0) {
      setGstRate(prod.gstRate);
    }
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = copy[index];
      const quantity = Math.max(1, qty);

      let basePrice = current.baseUnitPrice;
      if (current.productId) {
        const prod = products.find((p) => p.id === current.productId);
        if (prod) {
          basePrice = getTierPrice(prod, quantity);
        }
      }

      const unitPrice = basePrice + current.customizationCost;
      copy[index] = {
        ...current,
        quantity,
        baseUnitPrice: basePrice,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
      return copy;
    });
  };

  const handleCustomizationChange = (index: number, label: string, cost: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = copy[index];
      const unitPrice = current.baseUnitPrice + cost;
      copy[index] = {
        ...current,
        customizationDetails: label,
        customizationCost: cost,
        unitPrice,
        lineTotal: unitPrice * current.quantity,
      };
      return copy;
    });
  };

  const handleSizeChange = (
    index: number,
    size: "S" | "M" | "L" | "XL" | "2XL",
    count: number
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const current = copy[index];
      const newSizes = { ...current.sizeBreakdown, [size]: Math.max(0, count) };
      const totalQty = Object.values(newSizes).reduce((a, b) => a + b, 0);

      let basePrice = current.baseUnitPrice;
      if (current.productId) {
        const prod = products.find((p) => p.id === current.productId);
        if (prod) {
          basePrice = getTierPrice(prod, totalQty);
        }
      }

      const unitPrice = basePrice + current.customizationCost;
      copy[index] = {
        ...current,
        sizeBreakdown: newSizes,
        quantity: totalQty,
        baseUnitPrice: basePrice,
        unitPrice,
        lineTotal: unitPrice * totalQty,
      };
      return copy;
    });
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        productTitle: "Premium Brushed Fleece Zip Hoodie (380 GSM)",
        description: "Heavyweight 380 GSM brushed fleece",
        sizeBreakdown: { S: 10, M: 40, L: 40, XL: 10, "2XL": 0 },
        quantity: 100,
        baseUnitPrice: 980,
        customizationDetails: "Front Left Chest Silicone HD Badge",
        customizationCost: 50,
        unitPrice: 1030,
        lineTotal: 103000,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = (taxableAmount * gstRate) / 100;
  const grandTotal = Math.round(taxableAmount + taxAmount);
  const advanceAmount = Math.round((grandTotal * advancePercent) / 100);

  const handlePreviewPDF = () => {
    const doc = generateQuotationPDF({
      quoteNumber: "UD-QT-DRAFT",
      customerName: customerName || "Procurement Manager",
      companyName: companyName || "Client Enterprise",
      clientEmail: clientEmail || "client@company.com",
      clientPhone: clientPhone || "+91 98000 00000",
      clientGstin: clientGstin || null,
      shippingAddress: shippingAddress || null,
      validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
      items: items.map((it) => ({
        productTitle: it.productTitle,
        description: it.description,
        sizeBreakdown: JSON.stringify(it.sizeBreakdown),
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        customizationDetails: it.customizationDetails,
        lineTotal: it.lineTotal,
      })),
      subtotal,
      discountPercent,
      discountAmount,
      taxType,
      gstRate,
      taxAmount,
      grandTotal,
      paymentTerms: `${advancePercent}% advance on approval, ${100 - advancePercent}% prior to dispatch`,
      estimatedDays,
      notes,
    });
    doc.save(`Estimate_Draft_${companyName.replace(/\s+/g, "_") || "UrbanDhaga"}.pdf`);
    toast.success("Draft PDF estimate downloaded");
  };

  const handleSubmit = async (status: "DRAFT" | "SENT") => {
    if (!companyName.trim() || !customerName.trim()) {
      toast.error("Please provide client company and contact name.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          companyName,
          customerName,
          clientEmail: clientEmail || "orders@urbandhaga.com",
          clientPhone: clientPhone || "+91 00000 00000",
          clientGstin,
          shippingAddress,
          status,
          validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString(),
          discountPercent,
          taxType,
          gstRate,
          advanceRequiredPercent: advancePercent,
          paymentTerms: `${advancePercent}% advance on approval, ${100 - advancePercent}% prior to dispatch`,
          estimatedDays,
          notes,
          items: items.map((it) => ({
            productId: it.productId || null,
            productTitle: it.productTitle,
            description: it.description,
            sizeBreakdown: it.sizeBreakdown,
            quantity: it.quantity,
            baseUnitPrice: it.baseUnitPrice,
            customizationDetails: it.customizationDetails,
            customizationCost: it.customizationCost,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save quotation");
        return;
      }

      toast.success(`Quotation ${data.quoteNumber} ${status === "SENT" ? "issued" : "saved as draft"}`);
      router.push("/quotes");
    } catch (err) {
      console.error(err);
      toast.error("Network error saving quotation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Quotations</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePreviewPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-orange-600" />
            <span>Preview & Download PDF</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("DRAFT")}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Save as Draft
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit("SENT")}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/30 transition-all active:scale-95"
          >
            {submitting ? "Submitting..." : "Generate & Issue Estimate"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-600" />
                <span>Client & Commercial Entity</span>
              </h2>

              {customers.length > 0 && (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
                >
                  <option value="">-- Choose Existing Client --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.contactPerson})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-zinc-500 font-medium">Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Razorpay Software Pvt Ltd"
                  className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Contact Person *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Divya Krishnan"
                  className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Email Address</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="e.g. divya@razorpay.com"
                  className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="e.g. +91 98450 77889"
                  className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={clientGstin}
                  onChange={(e) => setClientGstin(e.target.value)}
                  placeholder="e.g. 29AABCR8765G1Z9"
                  className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono focus:ring-1 focus:ring-orange-500 uppercase"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Shipping Address</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Delivery address & pincode"
                  className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items & Slabs Builder */}
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-600" />
                  <span>Itemized Merchandising & Slabs</span>
                </h2>
                <p className="text-xs text-zinc-500">
                  Select catalog base, customize branding methods, and configure size matrix
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-4 relative"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-xs font-bold text-zinc-400">
                      0{idx + 1}.
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 text-xs">
                      {/* Product Base Selector */}
                      <div className="sm:col-span-2">
                        <label className="text-zinc-500 font-medium">Catalog Product Base</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          className="mt-1 w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                        >
                          <option value="">-- Choose Base Product --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Base: ₹{p.basePrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Customization Add-on */}
                      <div>
                        <label className="text-zinc-500 font-medium">Branding / Customization</label>
                        <select
                          value={item.customizationDetails}
                          onChange={(e) => {
                            const opt = BRANDING_OPTIONS.find((b) => b.label === e.target.value);
                            handleCustomizationChange(idx, e.target.value, opt?.cost || 0);
                          }}
                          className="mt-1 w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs truncate"
                        >
                          {BRANDING_OPTIONS.map((b) => (
                            <option key={b.label} value={b.label}>
                              {b.label} (+₹{b.cost})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-zinc-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Size Matrix Allocation */}
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">
                        Size Distribution Breakdown (or Direct Total)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">Batch Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                          className="w-20 text-center px-2 py-1 text-xs font-mono font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:ring-1 focus:ring-orange-500"
                        />
                        <span className="font-mono text-zinc-500">units</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {(["S", "M", "L", "XL", "2XL"] as const).map((size) => (
                        <div key={size} className="text-center">
                          <span className="text-[10px] font-mono font-bold text-zinc-500 block mb-1">
                            {size}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={item.sizeBreakdown[size] || 0}
                            onChange={(e) => handleSizeChange(idx, size, Number(e.target.value))}
                            className="w-full text-center px-2 py-1.5 text-xs font-mono bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Breakdown for Line Item */}
                  <div className="pt-2 flex items-center justify-between text-xs font-mono bg-zinc-100/60 dark:bg-zinc-800/40 p-2.5 rounded-lg">
                    <div className="text-zinc-500">
                      Base Slab: ₹{item.baseUnitPrice} + Branding: ₹{item.customizationCost} ={" "}
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ₹{item.unitPrice} / unit
                      </span>
                    </div>
                    <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Line Total: {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commercial Terms & Total Calculation Summary */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-orange-600" />
              <span>Commercial Terms & Tax</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-500 font-medium">Turnaround (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={estimatedDays}
                    onChange={(e) => setEstimatedDays(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 font-medium">Quote Valid (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Special Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">GST Rate Slab</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                >
                  <option value={5}>5% GST (Apparel & T-Shirts)</option>
                  <option value={12}>12% GST (Hoodies & Fleece)</option>
                  <option value={18}>18% GST (Corporate Kits, Drinkware, Tech)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Tax Schedule Type</label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                >
                  <option value="CGST_SGST">Intra-state: CGST + SGST (Karnataka)</option>
                  <option value="IGST">Inter-state: IGST (Other States)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Advance Milestone Required %</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={advancePercent}
                  onChange={(e) => setAdvancePercent(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-500">
                <span>GST ({gstRate}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <span>Total Payable:</span>
                <span className="text-orange-600 dark:text-orange-400">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <div className="pt-2 text-[11px] text-zinc-500 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Advance Trigger ({advancePercent}%):
                </span>{" "}
                {formatCurrency(advanceAmount)}
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit("SENT")}
              className="w-full py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/30 transition-all text-center"
            >
              Issue Quotation to Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

