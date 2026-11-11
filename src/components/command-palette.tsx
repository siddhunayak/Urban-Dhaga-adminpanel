"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Factory,
  FileSpreadsheet,
  Inbox,
  Package,
  Boxes,
  Building2,
  Users2,
  Plus,
  X,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Quick Action" | "Order" | "Quotation" | "Lead" | "Product";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATIC_COMMANDS: CommandItem[] = [
  { id: "dash", title: "Operations Dashboard", subtitle: "Live revenue & production telemetry", category: "Navigation", href: "/dashboard", icon: LayoutDashboard },
  { id: "prod", title: "Production & Orders", subtitle: "Kanban board, mockups & 5-point QC gates", category: "Navigation", href: "/production", icon: Factory },
  { id: "quote-new", title: "Create New Estimate", subtitle: "Interactive quotation builder & PDF generator", category: "Quick Action", href: "/quotes/new", icon: Plus },
  { id: "quotes", title: "Quotations & Estimates", subtitle: "Review drafts, issued proposals & conversions", category: "Navigation", href: "/quotes", icon: FileSpreadsheet },
  { id: "leads", title: "Inquiries & Leads", subtitle: "Bulk corporate lead stages", category: "Navigation", href: "/leads", icon: Inbox },
  { id: "products", title: "Catalog & Slabs", subtitle: "Volume discount matrix & materials", category: "Navigation", href: "/products", icon: Package },
  { id: "inventory", title: "Stock & Inventory", subtitle: "Variant physical inventory & inward", category: "Navigation", href: "/inventory", icon: Boxes },
  { id: "customers", title: "Corporate Clients", subtitle: "B2B client directory with GSTIN", category: "Navigation", href: "/customers", icon: Building2 },
  { id: "vendors", title: "Manufacturing Workshops", subtitle: "Screen printers & embroidery partners", category: "Navigation", href: "/vendors", icon: Users2 },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [dynamicItems, setDynamicItems] = useState<CommandItem[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    let cancelled = false;
    Promise.all([
      fetch("/api/orders").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/quotations").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/products").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([orders, quotes, products]) => {
        if (cancelled) return;
        const items: CommandItem[] = [];
        if (Array.isArray(orders)) {
          orders.slice(0, 8).forEach((o: { id: string; orderNumber: string; companyName: string; stage: string }) => {
            items.push({
              id: `ord-${o.id}`,
              title: `${o.orderNumber} — ${o.companyName}`,
              subtitle: `Order stage: ${o.stage}`,
              category: "Order",
              href: "/production",
              icon: Factory,
            });
          });
        }
        if (Array.isArray(quotes)) {
          quotes.slice(0, 8).forEach((q: { id: string; quoteNumber: string; companyName: string; status: string }) => {
            items.push({
              id: `qt-${q.id}`,
              title: `${q.quoteNumber} — ${q.companyName}`,
              subtitle: `Quotation status: ${q.status}`,
              category: "Quotation",
              href: "/quotes",
              icon: FileSpreadsheet,
            });
          });
        }
        if (Array.isArray(products)) {
          products.slice(0, 8).forEach((p: { id: string; sku: string; name: string; category: string }) => {
            items.push({
              id: `prod-${p.id}`,
              title: `${p.sku} — ${p.name}`,
              subtitle: `Catalog line: ${p.category}`,
              category: "Product",
              href: "/products",
              icon: Package,
            });
          });
        }
        setDynamicItems(items);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open]);

  const allItems = query.trim().length > 0 ? [...STATIC_COMMANDS, ...dynamicItems] : STATIC_COMMANDS;
  const filtered = allItems.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        onClose();
        router.push(filtered[activeIndex].href);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, filtered, activeIndex, router]);

  if (!open) return null;

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules, order numbers, quotes, or SKUs... (Esc to close)"
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 font-mono">
              No matching commands or records found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => handleSelect(item.href)}
                  className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left transition-colors group ${
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? "bg-orange-500/10 border-orange-500/40 text-orange-600"
                          : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div
                        className={`text-xs font-semibold transition-colors ${
                          isSelected ? "text-orange-600" : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 shrink-0">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="p-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
          <span>↑↓ Navigate • ↵ Open</span>
          <span>Esc to dismiss</span>
        </div>
      </div>
    </div>
  );
}
