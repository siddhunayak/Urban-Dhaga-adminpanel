"use client";

import { usePathname } from "next/navigation";
import { Search, Plus, UserPlus } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  onOpenCommand?: () => void;
}

export function Header({ onOpenCommand }: HeaderProps) {
  const pathname = usePathname();

  const getBreadcrumb = () => {
    if (pathname.startsWith("/production")) return "Production & Orders";
    if (pathname.startsWith("/quotes")) return "Quotations & Estimates";
    if (pathname.startsWith("/leads")) return "Leads & Inquiries";
    if (pathname.startsWith("/products")) return "Catalog & Slabs";
    if (pathname.startsWith("/inventory")) return "Stock & Inventory";
    if (pathname.startsWith("/customers")) return "Corporate Clients";
    if (pathname.startsWith("/vendors")) return "Vendors & Workshops";
    if (pathname.startsWith("/invoices")) return "Invoices & Payments";
    if (pathname.startsWith("/team")) return "Team & Audit Log";
    return "Operations Dashboard";
  };

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400 font-mono">Urban Dhaga</span>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {getBreadcrumb()}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenCommand}
          className="flex items-center gap-3 px-3 py-1.5 text-xs text-zinc-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
            <span>Search orders, quotes, SKUs...</span>
          </div>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white dark:bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/leads?new=1"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-zinc-500" />
            <span>New Lead</span>
          </Link>

          <Link
            href="/quotes/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-lg shadow-sm shadow-orange-600/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Quote</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
