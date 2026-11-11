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
  ArrowRight,
  Plus,
  X,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "Navigation" | "Quick Action" | "Order" | "Quotation";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATIC_COMMANDS: CommandItem[] = [
  { id: "dash", title: "Operations Dashboard", subtitle: "Live revenue & production telemetry", category: "Navigation", href: "/dashboard", icon: LayoutDashboard },
  { id: "prod", title: "Production & Orders", subtitle: "Kanban board & 5-point QC gates", category: "Navigation", href: "/production", icon: Factory },
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
        else openPalette();
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const openPalette = () => {};

  if (!open) return null;

  const filtered = STATIC_COMMANDS.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, modules, or actions... (Esc to close)"
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 font-mono">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.href)}
                  className="w-full p-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-left transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 group-hover:text-orange-600 group-hover:border-orange-500/40 transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 transition-colors">
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
          <span>Navigation Quick Dial</span>
          <div className="flex items-center gap-2">
            <span>Use</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border text-zinc-600 dark:text-zinc-300">
              ↵ Enter
            </kbd>
            <span>to open</span>
          </div>
        </div>
      </div>
    </div>
  );
}
