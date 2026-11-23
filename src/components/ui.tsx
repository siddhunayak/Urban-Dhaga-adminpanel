"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Shared building blocks for the UrbanDhagaa OMS look (white cards, zinc borders, black primary). */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("bg-white border border-zinc-200 rounded-md", className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-zinc-200">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-zinc-900">{title}</h2>
        {subtitle && <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        variant === "primary" && "bg-zinc-900 text-white hover:bg-zinc-800",
        variant === "secondary" && "bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50",
        variant === "danger" && "bg-white text-red-700 border border-red-200 hover:bg-red-50",
        variant === "ghost" && "text-zinc-600 hover:bg-zinc-100",
        className
      )}
    />
  );
}

export const inputCls =
  "w-full h-8 px-3 text-xs bg-white border border-zinc-200 rounded-md placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-50";

export const selectCls =
  "h-8 min-w-[110px] pl-3 pr-8 text-xs text-zinc-800 bg-white border border-zinc-200 rounded-md appearance-none cursor-pointer hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-no-repeat bg-[length:14px] bg-[right_8px_center] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2318181b%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')]";

export function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-[11px] font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block text-[10px] font-medium px-2 py-0.5 rounded border whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div
        className={cn("bg-white rounded-lg border border-zinc-200 shadow-xl w-full max-h-[90vh] flex flex-col", wide ? "max-w-2xl" : "max-w-md")}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-zinc-500 hover:bg-zinc-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-3">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-zinc-200 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  caption?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: "red" | "green";
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-md p-4 min-h-[114px] flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-600 leading-snug">{label}</span>
        <span className="w-7 h-7 shrink-0 rounded-md bg-zinc-50 border border-zinc-100 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
        </span>
      </div>
      <div
        className={cn(
          "mt-1 text-xl font-bold font-mono",
          tone === "red" ? "text-red-700" : tone === "green" ? "text-emerald-700" : "text-zinc-900"
        )}
      >
        {value}
      </div>
      {caption && <div className="mt-auto pt-3 text-[11px] text-zinc-500">{caption}</div>}
    </div>
  );
}

/** Table header cell / body cell class helpers. */
export const thCls = "text-left font-semibold px-4 py-3 whitespace-nowrap";
export const theadRowCls = "border-b border-zinc-200 bg-zinc-50/60 text-[10px] uppercase tracking-[0.06em] text-zinc-500";

export function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-xs text-zinc-600">
        {children}
      </td>
    </tr>
  );
}

/** Reads a JSON error body from a failed fetch, falling back to a generic message. */
export async function apiError(res: Response, fallback: string) {
  try {
    const j = await res.json();
    return j?.error || fallback;
  } catch {
    return fallback;
  }
}
