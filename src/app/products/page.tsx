"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Tag,
  Clock,
  Shirt,
  X,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PricingTier {
  id: string;
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
}

interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  currentStock: number;
  lowStockThreshold: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  gstRate: number;
  hsnCode: string;
  material?: string | null;
  leadTimeDays: number;
  images: string;
  isActive: boolean;
  pricingTiers: PricingTier[];
  variants: ProductVariant[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Add Product modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    sku: `UD-${Math.floor(100 + Math.random() * 900)}`,
    name: "",
    category: "APPAREL",
    description: "",
    basePrice: 450,
    gstRate: 5.0,
    hsnCode: "6109",
    material: "100% Combed Cotton 220 GSM",
    leadTimeDays: 7,
    tiers: [
      { minQty: 50, maxQty: 99, unitPrice: 450 },
      { minQty: 100, maxQty: 299, unitPrice: 390 },
      { minQty: 300, maxQty: null, unitPrice: 350 },
    ],
  });
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = new URL("/api/products", window.location.origin);
      if (categoryFilter !== "ALL") url.searchParams.set("category", categoryFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formData.sku,
          name: formData.name,
          category: formData.category,
          description: formData.description,
          basePrice: Number(formData.basePrice),
          gstRate: Number(formData.gstRate),
          hsnCode: formData.hsnCode,
          material: formData.material,
          leadTimeDays: Number(formData.leadTimeDays),
          pricingTiers: formData.tiers,
          variants: [
            { sku: `${formData.sku}-BLK-M`, size: "M", color: "Jet Black", colorHex: "#111827", currentStock: 100, lowStockThreshold: 25 },
            { sku: `${formData.sku}-BLK-L`, size: "L", color: "Jet Black", colorHex: "#111827", currentStock: 120, lowStockThreshold: 25 },
            { sku: `${formData.sku}-WHT-M`, size: "M", color: "Off-White", colorHex: "#F8FAFC", currentStock: 80, lowStockThreshold: 20 },
            { sku: `${formData.sku}-WHT-L`, size: "L", color: "Off-White", colorHex: "#F8FAFC", currentStock: 90, lowStockThreshold: 20 },
          ],
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchProducts();
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
            <Package className="w-6 h-6 text-orange-600" />
            <span>Product Catalog & Tiered Pricing</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Corporate merchandising lines with volume discount slabs, technical fabric specs, and GST HSN tags.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-sm shadow-orange-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Catalog Item</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "APPAREL", "DRINKWARE", "WELCOME_KITS", "GIFTS"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                categoryFilter === cat
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {cat === "ALL" ? "All Categories" : cat.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
            placeholder="Search name, SKU, or specs..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
          <span>Loading catalog...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          No products found matching filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const totalStock = p.variants.reduce((acc, v) => acc + v.currentStock, 0);
            const lowVariants = p.variants.filter((v) => v.currentStock <= v.lowStockThreshold);

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-orange-500/50 dark:hover:border-orange-500/50 shadow-sm cursor-pointer transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {p.sku}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      HSN: {p.hsnCode} • GST {p.gstRate}%
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  </div>

                  {p.material && (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-850 p-2 rounded-md font-mono">
                      Fabric / Spec: {p.material}
                    </div>
                  )}

                  {/* Pricing Slabs Table */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-mono text-zinc-400 font-semibold block">
                      Volume Pricing Slabs
                    </span>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      {p.pricingTiers.slice(0, 3).map((t, i) => (
                        <div
                          key={i}
                          className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-[11px]"
                        >
                          <span className="text-[9px] text-zinc-400 font-mono block">
                            {t.minQty}{t.maxQty ? `-${t.maxQty}` : "+"} pcs
                          </span>
                          <strong className="font-mono text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(t.unitPrice)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-850 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {totalStock} in stock
                    </span>
                    {lowVariants.length > 0 && (
                      <span className="text-[10px] text-red-600 font-mono font-bold">
                        ({lowVariants.length} low)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {p.leadTimeDays}d lead
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-2xl shadow-elevated space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs text-orange-600 font-bold">
                  {selectedProduct.sku} • {selectedProduct.category}
                </span>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {selectedProduct.name}
                </h2>
                <p className="text-xs text-zinc-500 mt-1">{selectedProduct.description}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slabs breakdown */}
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Quantity-Based Pricing Matrix
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {selectedProduct.pricingTiers.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-center"
                  >
                    <span className="text-[10px] font-mono text-zinc-400 block">
                      {t.minQty} {t.maxQty ? `to ${t.maxQty}` : "+"} units
                    </span>
                    <strong className="text-sm font-mono text-orange-600 dark:text-orange-400">
                      {formatCurrency(t.unitPrice)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Variants table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                SKU Variants & Stock Levels
              </h3>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Variant SKU</th>
                      <th className="px-3 py-2">Color</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-right">Min Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {selectedProduct.variants.map((v) => (
                      <tr key={v.id}>
                        <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                          {v.sku}
                        </td>
                        <td className="px-3 py-2 flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-full border border-zinc-300 shrink-0"
                            style={{ backgroundColor: v.colorHex }}
                          />
                          <span>{v.color}</span>
                        </td>
                        <td className="px-3 py-2 font-mono font-bold">{v.size}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          <span className={v.currentStock <= v.lowStockThreshold ? "text-red-600" : ""}>
                            {v.currentStock} pcs
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-400">
                          {v.lowStockThreshold}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProduct}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg shadow-elevated space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Add New Catalog Merchandise
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
              <div>
                <label className="text-zinc-500 font-medium">Product SKU</label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                >
                  <option value="APPAREL">Apparel</option>
                  <option value="DRINKWARE">Drinkware</option>
                  <option value="WELCOME_KITS">Welcome Kits</option>
                  <option value="GIFTS">Gifts & Accessories</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-zinc-500 font-medium">Product Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Cotton Terry Crewneck (320 GSM)"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="text-zinc-500 font-medium">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">Base Price (INR)</label>
                <input
                  type="number"
                  required
                  value={formData.basePrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, basePrice: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-zinc-500 font-medium">GST Rate %</label>
                <input
                  type="number"
                  value={formData.gstRate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gstRate: Number(e.target.value) }))}
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
                {saving ? "Creating..." : "Save Product & Variants"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
