"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

const DEMO_ACCOUNTS = [
  { label: "Owner / Admin", email: "arjun@urbandhaga.com", role: "OWNER" },
  { label: "Sales Manager", email: "pooja.sales@urbandhaga.com", role: "SALES" },
  { label: "Production & QC", email: "vikram.ops@urbandhaga.com", role: "PRODUCTION" },
  { label: "Accounts", email: "meera.accounts@urbandhaga.com", role: "ACCOUNTS" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("arjun@urbandhaga.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invalid credentials");
        return;
      }

      toast.success(`Welcome back, ${data.user.name}`);
      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get("from") || "/dashboard";
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Network error during sign-in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Identity */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 mx-auto rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white shadow-md shadow-orange-600/20">
            <Sparkles className="w-6 h-6 text-amber-100" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Urban Dhaga Admin
          </h1>
          <p className="text-xs text-zinc-500">
            Internal Operations, Quotations & Production Control
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleLogin}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4"
        >
          <div className="space-y-1.5 text-xs">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>Staff Email</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@urbandhaga.com"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your staff password"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-lg shadow-sm shadow-orange-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] disabled:opacity-60"
          >
            <span>{loading ? "Signing in..." : "Sign In to Workspace"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick-Fill Staff Switcher for Initial Setup / Testing */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span className="flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Seeded Staff Quick-Fill
            </span>
            <span>Default pass: urbandhaga2026</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => {
                  setEmail(acc.email);
                  setPassword("urbandhaga2026");
                }}
                className="p-2 text-left rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-orange-500/40 hover:bg-orange-500/5 transition-colors"
              >
                <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                  {acc.label}
                </div>
                <div className="text-[10px] font-mono text-zinc-400 truncate">
                  {acc.email}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
