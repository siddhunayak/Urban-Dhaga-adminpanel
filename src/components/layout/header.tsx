"use client";

import { usePathname, useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/** Pages listen for this event to re-fetch their data when the header refresh button is clicked. */
export const APP_REFRESH_EVENT = "app:refresh";

const TITLES: [string, string][] = [
  ["/orders/new", "New Order"],
  ["/orders/", "Order Details"],
  ["/orders", "Master Orders Register"],
  ["/fulfilment", "Fulfilment"],
  ["/production", "Production Board"],
  ["/customers", "Customers"],
  ["/payments", "Payments"],
  ["/invoices", "Invoices & Ledger"],
  ["/quotes", "Quotations"],
  ["/leads", "Leads & Inquiries"],
  ["/products", "Products"],
  ["/inventory", "Inventory"],
  ["/vendors", "Vendors"],
  ["/team", "Team & Audit Log"],
];

interface HeaderProps {
  /** Kept for API compatibility; the command palette is opened with Ctrl/Cmd+K. */
  onOpenCommand?: () => void;
}

export function Header({}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Operations Dashboard";

  const handleRefresh = () => {
    setSpinning(true);
    window.dispatchEvent(new Event(APP_REFRESH_EVENT));
    router.refresh();
    setTimeout(() => setSpinning(false), 700);
  };

  return (
    <header className="h-[72px] border-b border-zinc-200 bg-white sticky top-0 z-20 flex items-center justify-between px-7 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-[17px] font-semibold text-zinc-900 tracking-tight">{title}</h1>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
          Live v1.0
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${spinning ? "animate-spin" : ""}`} />
        </button>
        <Link
          href="/orders/new"
          className="flex items-center gap-1.5 h-7 px-3 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Order</span>
        </Link>
      </div>
    </header>
  );
}
