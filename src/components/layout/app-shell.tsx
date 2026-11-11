"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);

  const isAuthPage = pathname === "/login";

  useEffect(() => {
    if (isAuthPage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthPage]);

  if (isAuthPage) {
    return (
      <>
        {children}
        <Toaster richColors position="bottom-right" closeButton />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenCommand={() => setCommandOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <Toaster richColors position="bottom-right" closeButton />
    </div>
  );
}
