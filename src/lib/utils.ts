import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as Indian Rupee currency (INR)
 * e.g. 124500 -> ₹1,24,500
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date string or Date object cleanly
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export const ORDER_STAGES: { [key: string]: { label: string; bg: string; text: string; border: string; step: number } } = {
  ORDER_CONFIRMED: { label: "Order Confirmed", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", step: 1 },
  ARTWORK_SUBMITTED: { label: "Artwork / Proofs", bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20", step: 2 },
  SAMPLE_APPROVED: { label: "Sample Approved", bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20", step: 3 },
  IN_PRODUCTION: { label: "In Production", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", step: 4 },
  QUALITY_CHECK: { label: "Quality Check", bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/20", step: 5 },
  READY_FOR_DISPATCH: { label: "Ready to Dispatch", bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/20", step: 6 },
  DISPATCHED: { label: "Dispatched", bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/20", step: 7 },
  DELIVERED: { label: "Delivered", bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", step: 8 },
  CANCELLED: { label: "Cancelled", bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20", step: 0 },
};

export const LEAD_STAGES: { [key: string]: { label: string; color: string; badge: string } } = {
  NEW: { label: "New Lead", color: "bg-blue-500", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  CONTACTED: { label: "Contacted", color: "bg-cyan-500", badge: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" },
  REQUIREMENT_GATHERED: { label: "Requirement Scoped", color: "bg-indigo-500", badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  QUOTE_SENT: { label: "Quote Sent", color: "bg-blue-600", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  NEGOTIATION: { label: "Negotiation", color: "bg-slate-600", badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20" },
  WON: { label: "Deal Won", color: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  LOST: { label: "Lost", color: "bg-zinc-500", badge: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
};

export const QUOTE_STATUS: { [key: string]: { label: string; badge: string } } = {
  DRAFT: { label: "Draft", badge: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20" },
  SENT: { label: "Sent to Client", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  ACCEPTED: { label: "Accepted", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  REJECTED: { label: "Declined", badge: "bg-red-500/10 text-red-600 border-red-500/20" },
  EXPIRED: { label: "Expired", badge: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20" },
};

