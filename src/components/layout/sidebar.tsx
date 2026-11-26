"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Layers, Package, Users, CreditCard, Truck, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Layers },
  { name: "Orders Register", href: "/orders", icon: Package },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Fulfilment", href: "/fulfilment", icon: Truck },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 9c2 9 4 17 9 17 6 0 7-11 9-17 1.5-4.5 5-9 9-9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M17 26c4-1 9-8 13-16 2-4 4-7 7-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-[200px] border-r border-zinc-200 bg-white flex flex-col h-screen select-none shrink-0 sticky top-0">
      {/* Brand */}
      <div className="h-[72px] flex items-center gap-2 px-4">
        <BrandMark className="w-9 h-8 text-blue-600" />
        <span className="font-bold text-[15px] tracking-wide text-zinc-900">URBANDHAGAA</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 pt-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors",
                isActive
                  ? "bg-zinc-100 text-zinc-900 font-semibold"
                  : "text-zinc-600 font-medium hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-zinc-900" : "text-zinc-500")} strokeWidth={1.75} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-zinc-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-zinc-900 truncate">{user?.name || "UrbanDhagaa Admin"}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide truncate">{user?.role || "Admin"}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
