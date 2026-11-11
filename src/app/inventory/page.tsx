"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  RefreshCw,
  Package,
  Layers,
  ArrowUpDown,
  History,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface VariantItem {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  currentStock: number;
  lowStockThreshold: number;
  reorderQuantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    basePrice: number;
  };
}

export default function InventoryPage() {
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState("");

  // Adjustment Modal
  const [modalItem, setModalItem] = useState<VariantItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"INWARD" | "DISPATCH" | "SET">("INWARD");
  const [adjustQty, setAdjustQty] = useState(50);
  const [notes, setNotes] = useState("Factory blank inward receipt");
  const [adjusting, setAdjusting] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/inventory", window.location.origin);
      if (categoryFilter !== "ALL") url.searchParams.set("category", categoryFilter);
      if (lowStockOnly) url.searchParams.set("lowStockOnly", "true");
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setVariants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [categoryFilter, lowStockOnly]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalItem) return;

    try {
      setAdjusting(true);
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: modalItem.id,
          adjustmentType,
          quantity: adjustQty,
          notes,
        }),
      });

      if (res.ok) {
        setModalItem(null);
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdjusting(false);
    }
  };

  // Metrics
  const totalUnits = variants.reduce((acc, v) => acc + v.currentStock, 0);
  const lowCount = variants.filter((v) => v.currentStock <= v.lowStockThreshold).length;
  const totalValuation = variants.reduce((acc, v) => acc + v.currentStock * v.product.basePrice, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-orange-600" />
            <span>Variant-Level Stock Matrix</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time physical inventory by size and color, threshold reorder alerts, and raw goods inward.
          </p>
        </div>

        <button
          onClick={fetchInventory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Warehouse</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Total Units in Stock</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {totalUnits.toLocaleString("en-IN")} pcs
          </div>
          <span className="text-[11px] text-zinc-400">Across {variants.length} SKU variants</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Critical Low Stock Alerts</span>
          <div className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>{lowCount} SKUs</span>
          </div>
          <span className="text-[11px] text-zinc-400">Below minimum buffer threshold</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-500">Warehouse Valuation</span>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatCurrency(totalValuation)}
          </div>
          <span className="text-[11px] text-zinc-400">Blank inventory holding value</span>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1">
            {["ALL", "APPAREL", "DRINKWARE", "WELCOME_KITS"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                  categoryFilter === cat
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {cat === "ALL" ? "All Lines" : cat.replace("_", " ")}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-700 dark:text-red-300 cursor-pointer font-medium shrink-0 ml-2">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-red-600 rounded"
            />
            <span>Show Low Stock Only</span>
          </label>
        </div>

        <div className="relative md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchInventory()}
            placeholder="Search SKU, color, or item..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Stock Matrix Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 font-mono uppercase text-zinc-500 text-[10px]">
              <tr>
                <th className="px-4 py-3">Variant SKU</th>
                <th className="px-4 py-3">Base Product Line</th>
                <th className="px-4 py-3">Colorway</th>
                <th className="px-4 py-3 text-center">Size</th>
                <th className="px-4 py-3 text-right">Physical Stock</th>
                <th className="px-4 py-3 text-right">Min Threshold</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-orange-600" />
                    <span>Loading warehouse stock levels...</span>
                  </td>
                </tr>
              ) : variants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-zinc-400">
                    No variant records found.
                  </td>
                </tr>
              ) : (
                variants.map((v) => {
                  const isLow = v.currentStock <= v.lowStockThreshold;

                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-zinc-50/60 dark:hover:bg-zinc-850/50 transition-colors ${
                        isLow ? "bg-red-500/[0.02]" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {v.sku}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {v.product.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {v.product.category} • Base: {formatCurrency(v.product.basePrice)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0"
                            style={{ backgroundColor: v.colorHex }}
                          />
                          <span className="text-zinc-800 dark:text-zinc-200">{v.color}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                          {v.size}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold">
                        <span className={isLow ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"}>
                          {v.currentStock} pcs
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-zinc-400">
                        {v.lowStockThreshold} pcs
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            <span>LOW STOCK</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>HEALTHY</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setModalItem(v);
                            setAdjustQty(v.reorderQuantity || 50);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-md transition-colors"
                        >
                          + Inward / Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {modalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustStock}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md shadow-elevated space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Adjust Physical Stock
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  SKU: <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{modalItem.sku}</span> ({modalItem.color} / {modalItem.size})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 font-medium">Action Type</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { key: "INWARD", label: "Inward Stock (+)" },
                    { key: "DISPATCH", label: "Deduct (-)" },
                    { key: "SET", label: "Audit Count (=)" },
                  ].map((act) => (
                    <button
                      key={act.key}
                      type="button"
                      onClick={() => setAdjustmentType(act.key as any)}
                      className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-colors ${
                        adjustmentType === act.key
                          ? "bg-orange-600 text-white border-orange-600"
                          : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-sm"
                />
                <div className="flex gap-2 pt-1.5">
                  {[25, 50, 100, 200, 500].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setAdjustQty(q)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600"
                    >
                      +{q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Audit Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Blank shipment received from Tirupur mill"
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono flex justify-between">
                <span className="text-zinc-500">Stock Result:</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {modalItem.currentStock} →{" "}
                  {adjustmentType === "INWARD"
                    ? modalItem.currentStock + adjustQty
                    : adjustmentType === "DISPATCH"
                    ? Math.max(0, modalItem.currentStock - adjustQty)
                    : adjustQty}{" "}
                  units
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm"
              >
                {adjusting ? "Updating..." : "Confirm Stock Adjustment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
