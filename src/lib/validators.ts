import { NextResponse } from "next/server";

export const USER_ROLES = ["OWNER", "SALES", "PRODUCTION", "ACCOUNTS", "STAFF"] as const;
export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "REQUIREMENT_GATHERED",
  "QUOTE_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;
export const LEAD_CATEGORIES = [
  "APPAREL",
  "GIFTS",
  "PACKS",
  "DRINKWARE",
  "TECH",
  "WELCOME_KITS",
  "STATIONERY",
] as const;
export const LEAD_SOURCES = ["WEBSITE", "WHATSAPP", "REFERRAL", "EVENT", "DIRECT"] as const;
export const PRODUCT_CATEGORIES = [
  "APPAREL",
  "DRINKWARE",
  "TECH",
  "STATIONERY",
  "WELCOME_KITS",
  "GIFTS",
] as const;
export const QUOTATION_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
export const TAX_TYPES = ["CGST_SGST", "IGST"] as const;
export const ORDER_STAGES = [
  "ORDER_CONFIRMED",
  "ARTWORK_SUBMITTED",
  "SAMPLE_APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;
export const ORDER_PRIORITIES = ["NORMAL", "HIGH", "URGENT"] as const;
export const MOCKUP_STATUSES = ["PENDING_REVIEW", "APPROVED", "REVISIONS_REQUESTED"] as const;
export const SHIPMENT_STATUSES = [
  "MANIFESTED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;
export const PAYMENT_METHODS = ["UPI", "NEFT", "RTGS", "CARD", "CASH", "CHEQUE"] as const;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isOneOf<T extends string>(val: unknown, allowed: readonly T[]): val is T {
  return typeof val === "string" && (allowed as readonly string[]).includes(val);
}

export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  try {
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 }),
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

export function parseFiniteNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export function parseValidDate(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computePaymentStatus(advancePaid: number, totalAmount: number): string {
  if (totalAmount > 0 && advancePaid >= totalAmount) return "FULLY_PAID";
  if (advancePaid > 0) return "PARTIAL_PAID";
  return "PENDING";
}

export function buildTrackingUrl(
  courierPartner: string,
  trackingNumber: string,
  customUrl?: string | null
): string {
  if (customUrl && customUrl.trim()) return customUrl.trim();
  const c = courierPartner.toLowerCase();
  const awb = encodeURIComponent(trackingNumber.trim());
  if (c.includes("blue")) return `https://www.bluedart.com/tracking?awb=${awb}`;
  if (c.includes("dtdc")) return `https://www.dtdc.in/tracking.asp?strCnno=${awb}`;
  if (c.includes("delhivery")) return `https://www.delhivery.com/track/package/${awb}`;
  return `https://shiprocket.co/tracking/${awb}`;
}

export function prismaErrorCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code?: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return null;
}
