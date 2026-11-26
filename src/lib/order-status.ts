// Shared display helpers for order status columns (dashboard + orders register).

export const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Unpaid", cls: "bg-red-50 text-red-700 border-red-100" },
  PARTIAL_PAID: { label: "Partial", cls: "bg-amber-50 text-amber-700 border-amber-100" },
  FULLY_PAID: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
};

export const SHIPMENT_LABEL: Record<string, string> = {
  MANIFESTED: "Manifested",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

/** Production state buckets, also used as the "Fulfilment" filter options. */
export const FULFILMENT_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "IN_QC", label: "In QC" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export function fulfilmentKey(stage: string): (typeof FULFILMENT_OPTIONS)[number]["value"] {
  switch (stage) {
    case "ORDER_CONFIRMED":
    case "ARTWORK_SUBMITTED":
    case "SAMPLE_APPROVED":
      return "NOT_STARTED";
    case "IN_PRODUCTION":
      return "IN_PROGRESS";
    case "QUALITY_CHECK":
      return "IN_QC";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "COMPLETED";
  }
}

export function productionLabel(stage: string, qcPassed: boolean | null | undefined) {
  const key = fulfilmentKey(stage);
  switch (key) {
    case "NOT_STARTED":
      return { label: "Not started", cls: "text-zinc-500" };
    case "IN_PROGRESS":
      return { label: "In progress", cls: "text-amber-700" };
    case "IN_QC":
      return { label: qcPassed === false ? "QC failed" : "In QC", cls: "text-orange-700" };
    case "CANCELLED":
      return { label: "Cancelled", cls: "text-zinc-400" };
    default:
      return { label: "Completed", cls: "text-emerald-700" };
  }
}

/** Summarises artwork mockups into one design-approval state. */
export function designStatus(mockups: { approvalStatus: string; version?: number }[] | undefined) {
  if (!mockups || mockups.length === 0) return { label: "No artwork", cls: "text-zinc-400" };
  const latest = [...mockups].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
  if (latest.approvalStatus === "APPROVED") return { label: "Approved", cls: "text-emerald-700" };
  if (latest.approvalStatus === "REVISIONS_REQUESTED") return { label: "Revisions", cls: "text-red-700" };
  return { label: "Pending review", cls: "text-amber-700" };
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function categoryFor(
  items: { productName: string; sku?: string | null }[],
  products: { name: string; sku: string; category: string }[]
): string | null {
  for (const item of items) {
    const byName = products.find((p) => p.name.toLowerCase() === item.productName.toLowerCase());
    if (byName) return byName.category;
    const bySku = item.sku ? products.find((p) => item.sku!.startsWith(p.sku)) : undefined;
    if (bySku) return bySku.category;
  }
  return null;
}
