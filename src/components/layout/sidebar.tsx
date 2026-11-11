"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Factory,
  FileSpreadsheet,
  Inbox,
  Package,
  Boxes,
  Building2,
  Users2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: string;
  alert?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_ITEMS: NavGroup[] = [
  {
    group: "OPERATIONS",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Production & Orders", href: "/production", icon: Factory, badgeKey: "activeOrders" },
      { name: "Quotations & Estimates", href: "/quotes", icon: FileSpreadsheet },
      { name: "Leads & Inquiries", href: "/leads", icon: Inbox, badgeKey: "newLeads" },
    ],
  },
  {
    group: "CATALOG & INVENTORY",
    items: [
      { name: "Products & Slabs", href: "/products", icon: Package },
      { name: "Inventory Matrix", href: "/inventory", icon: Boxes, badgeKey: "lowStock", alert: true },
    ],
  },
  {
    group: "DIRECTORY & PARTNERS",
    items: [
      { name: "Corporate Clients", href: "/customers", icon: Building2 },
      { name: "Vendors & Workshops", href: "/vendors", icon: Users2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{ activeOrders?: number; lowStock?: number; newLeads?: number }>({});

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) {
          setCounts({
            activeOrders: data.metrics.activeOrdersCount,
            lowStock: data.metrics.lowStockCount,
            newLeads: data.metrics.totalLeads,
          });
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-screen select-none shrink-0 sticky top-0">
      {/* Brand Header */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white font-bold shadow-sm shadow-orange-600/30">
          <Sparkles className="w-5 h-5 text-amber-100" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight truncate">
              Urban Dhaga
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              Admin
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            Merchandising & CRM
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-3 text-[10px] font-mono tracking-wider text-zinc-400 dark:text-zinc-500 uppercase font-semibold">
              {group.group}
            </div>
            <div className="space-y-0.5 pt-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                const badgeCount = item.badgeKey ? counts[item.badgeKey as keyof typeof counts] : undefined;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                      isActive
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          isActive
                            ? "text-white dark:text-zinc-900"
                            : "text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold",
                          item.alert
                            ? "bg-red-500/10 text-red-600 border border-red-500/20"
                            : isActive
                            ? "bg-zinc-700 text-zinc-200 dark:bg-zinc-300 dark:text-zinc-800"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Production Line Quick Status */}
      <div className="p-3 mx-3 mb-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Peenya Facility</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">LIVE</span>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
          Printing: Line 1 & 2 Active • QC Gate 4
        </p>
      </div>

      {/* User Switcher Footer */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            AS
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              Arjun Sharma
            </span>
            <span className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
              Owner / Admin
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-400" />
      </div>
    </aside>
  );
}
