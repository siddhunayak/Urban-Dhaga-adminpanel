"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronRight, FileDown, Plus, Trash2, Ban, ExternalLink } from "lucide-react";
import { cn, formatCurrency, formatDate, formatDateTime, ORDER_STAGES } from "@/lib/utils";
import { PAYMENT_BADGE, SHIPMENT_LABEL, designStatus } from "@/lib/order-status";
import { generateJobSheetPDF, generateTaxInvoicePDF } from "@/lib/pdf-generator";
import { APP_REFRESH_EVENT } from "@/components/layout/header";
import { Badge, Button, Card, CardHeader, Field, Modal, inputCls, selectCls, thCls, theadRowCls, apiError } from "@/components/ui";

interface Mockup {
  id: string;
  title: string;
  fileUrl: string;
  version: number;
  approvalStatus: string;
  clientFeedback?: string | null;
  uploadedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  jobSheetNumber?: string | null;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  shippingAddress: string;
  stage: string;
  priority: string;
  targetDeliveryDate: string;
  actualDeliveryDate?: string | null;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: string;
  notes?: string | null;
  createdAt: string;
  customer?: { id: string; customerCode: string; gstin?: string | null } | null;
  quotation?: { quoteNumber: string; gstRate: number; taxType: string } | null;
  items: {
    id: string;
    productName: string;
    sku?: string | null;
    sizeBreakdown?: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    customizationDetails?: string | null;
  }[];
  mockups: Mockup[];
  payments?: {
    id: string;
    amount: number;
    method: string;
    reference?: string | null;
    notes?: string | null;
    recordedBy: string;
    paidAt: string;
  }[];
  qualityCheck?: {
    fabricQualityChecked: boolean;
    printFidelityChecked: boolean;
    colorAccuracyChecked: boolean;
    stitchingFinishChecked: boolean;
    packagingChecked: boolean;
    passed: boolean;
    inspectedBy?: string | null;
    remarks?: string | null;
    checkedAt?: string | null;
  } | null;
  shipment?: {
    courierPartner: string;
    trackingNumber: string;
    dispatchDate?: string | null;
    estimatedDelivery?: string | null;
    packageCount: number;
    totalWeightKg?: number | null;
    status: string;
    trackingUrl?: string | null;
  } | null;
}

interface Activity {
  id: string;
  action: string;
  description: string;
  performedBy: string;
  createdAt: string;
}

const FLOW = [
  "ORDER_CONFIRMED",
  "ARTWORK_SUBMITTED",
  "SAMPLE_APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
];

const QC_POINTS = [
  { key: "fabricQualityChecked", label: "Fabric / material quality" },
  { key: "printFidelityChecked", label: "Print / embroidery fidelity" },
  { key: "colorAccuracyChecked", label: "Colour accuracy (Pantone match)" },
  { key: "stitchingFinishChecked", label: "Stitching & finish" },
  { key: "packagingChecked", label: "Packaging & labelling" },
] as const;
type QcKey = (typeof QC_POINTS)[number]["key"];

const COURIERS = ["Delhivery", "Shiprocket", "Blue Dart", "DTDC", "Express", "Hand Delivery"];

const MOCKUP_BADGE: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
  REVISIONS_REQUESTED: "bg-red-50 text-red-700 border-red-100",
};

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiError(res, "Request failed"));
  return res.json();
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState("");

  // Section form state
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("NEFT");
  const [payReference, setPayReference] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [mockupForm, setMockupForm] = useState({ title: "", fileUrl: "" });
  const [feedback, setFeedback] = useState<{ mockup: Mockup; text: string } | null>(null);
  const [qc, setQc] = useState<Record<QcKey, boolean>>({
    fabricQualityChecked: false,
    printFidelityChecked: false,
    colorAccuracyChecked: false,
    stitchingFinishChecked: false,
    packagingChecked: false,
  });
  const [qcRemarks, setQcRemarks] = useState("");
  const [ship, setShip] = useState({
    courierPartner: "Delhivery",
    trackingNumber: "",
    packageCount: 1,
    totalWeightKg: "",
    estimatedDelivery: "",
    status: "MANIFESTED",
  });
  const [details, setDetails] = useState({ priority: "NORMAL", targetDeliveryDate: "", notes: "", shippingAddress: "" });

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    if (res.status === 404) return setNotFound(true);
    if (!res.ok) return toast.error("Couldn't load order");
    const o: Order = await res.json();
    setOrder(o);
    if (o.qualityCheck) {
      setQc({
        fabricQualityChecked: o.qualityCheck.fabricQualityChecked,
        printFidelityChecked: o.qualityCheck.printFidelityChecked,
        colorAccuracyChecked: o.qualityCheck.colorAccuracyChecked,
        stitchingFinishChecked: o.qualityCheck.stitchingFinishChecked,
        packagingChecked: o.qualityCheck.packagingChecked,
      });
      setQcRemarks(o.qualityCheck.remarks ?? "");
    }
    if (o.shipment) {
      setShip({
        courierPartner: o.shipment.courierPartner,
        trackingNumber: o.shipment.trackingNumber,
        packageCount: o.shipment.packageCount,
        totalWeightKg: o.shipment.totalWeightKg?.toString() ?? "",
        estimatedDelivery: o.shipment.estimatedDelivery?.slice(0, 10) ?? "",
        status: o.shipment.status,
      });
    }
    setDetails({
      priority: o.priority,
      targetDeliveryDate: o.targetDeliveryDate.slice(0, 10),
      notes: o.notes ?? "",
      shippingAddress: o.shippingAddress,
    });
    fetch(`/api/audit?entityId=${id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setActivity)
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user?.name && setMe(d.user.name))
      .catch(() => {});
    window.addEventListener(APP_REFRESH_EVENT, load);
    return () => window.removeEventListener(APP_REFRESH_EVENT, load);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await load();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (notFound) {
    return (
      <div className="p-7">
        <Card className="p-10 text-center text-sm text-zinc-600">
          This order doesn&apos;t exist or was deleted.{" "}
          <Link href="/orders" className="underline">
            Back to Orders Register
          </Link>
        </Card>
      </div>
    );
  }
  if (!order) return <div className="p-7 text-xs text-zinc-500">Loading order…</div>;

  const o = order;
  const stage = ORDER_STAGES[o.stage] ?? ORDER_STAGES.ORDER_CONFIRMED;
  const pay = PAYMENT_BADGE[o.paymentStatus] ?? PAYMENT_BADGE.PENDING;
  const design = designStatus(o.mockups);
  const stepIndex = FLOW.indexOf(o.stage);
  const nextStage = stepIndex >= 0 && stepIndex < FLOW.length - 1 ? FLOW[stepIndex + 1] : null;
  const closed = o.stage === "DELIVERED" || o.stage === "CANCELLED";
  const qcAll = QC_POINTS.every((p) => qc[p.key]);
  const hasApprovedArtwork = o.mockups.some((m) => m.approvalStatus === "APPROVED");

  const setStage = (s: string) =>
    run(() => send(`/api/orders/${id}`, "PATCH", { stage: s }), `Moved to ${ORDER_STAGES[s]?.label ?? s}`);

  const advance = () => {
    if (!nextStage) return;
    // Gate checks so the order can't skip the work each stage represents.
    if (nextStage === "SAMPLE_APPROVED" && !hasApprovedArtwork)
      return toast.error("Approve an artwork mockup first (Design approvals section)");
    if (nextStage === "READY_FOR_DISPATCH" && !o.qualityCheck?.passed)
      return toast.error("Complete all 5 quality checks and save first");
    if (nextStage === "DISPATCHED" && !o.shipment)
      return toast.error("Save the dispatch details (courier & AWB) first");
    setStage(nextStage);
  };

  const recordPayment = async () => {
    if (payAmount <= 0) return toast.error("Enter an amount");
    if (payAmount > o.balanceDue) return toast.error(`Amount is more than the balance (${formatCurrency(o.balanceDue)})`);
    const ok = await run(
      () =>
        send(`/api/orders/${id}/payments`, "POST", {
          amount: payAmount,
          method: payMethod,
          reference: payReference.trim() || undefined,
        }),
      `Recorded ${formatCurrency(payAmount)}`
    );
    if (ok) {
      setPayOpen(false);
      setPayAmount(0);
      setPayReference("");
    }
  };

  const addMockup = async () => {
    if (!mockupForm.title.trim()) return toast.error("Give the mockup a title");
    const ok = await run(async () => {
      await send(`/api/orders/${id}/mockups`, "POST", mockupForm);
      if (o.stage === "ORDER_CONFIRMED") await send(`/api/orders/${id}`, "PATCH", { stage: "ARTWORK_SUBMITTED" });
    }, "Mockup added for review");
    if (ok) setMockupForm({ title: "", fileUrl: "" });
  };

  const reviewMockup = (m: Mockup, approvalStatus: string, clientFeedback?: string) =>
    run(
      () =>
        send(`/api/orders/${id}/mockups`, "PATCH", {
          mockupId: m.id,
          approvalStatus,
          clientFeedback,
          autoAdvanceStage: approvalStatus === "APPROVED",
        }),
      approvalStatus === "APPROVED" ? "Artwork approved" : "Revisions requested"
    );

  const saveQc = () =>
    run(async () => {
      await send(`/api/orders/${id}/qc`, "POST", {
        ...qc,
        remarks: qcRemarks,
        inspectedBy: me || "Quality Inspector",
        autoAdvanceStage: o.stage === "QUALITY_CHECK",
      });
    }, qcAll ? "QC passed" : "QC checklist saved");

  const saveShipment = () => {
    if (!ship.trackingNumber.trim()) return toast.error("Enter the AWB / tracking number");
    const firstDispatch = !o.shipment && o.stage === "READY_FOR_DISPATCH";
    return run(
      () =>
        send(`/api/orders/${id}/shipment`, "POST", {
          ...ship,
          totalWeightKg: ship.totalWeightKg || undefined,
          estimatedDelivery: ship.estimatedDelivery || undefined,
          advanceStage: firstDispatch,
        }),
      ship.status === "DELIVERED" ? "Delivered" : firstDispatch ? "Dispatched" : "Shipment saved"
    );
  };

  const saveDetails = () =>
    run(() => send(`/api/orders/${id}`, "PATCH", details), "Order details saved");

  const cancelOrder = () => {
    if (!confirm(`Cancel order ${o.orderNumber}? It will be removed from active workflow.`)) return;
    setStage("CANCELLED");
  };

  const deleteOrder = async () => {
    if (!confirm(`Permanently delete order ${o.orderNumber}? This can't be undone.`)) return;
    setBusy(true);
    try {
      await send(`/api/orders/${id}`, "DELETE");
      toast.success(`Order ${o.orderNumber} deleted`);
      router.push("/orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete order");
      setBusy(false);
    }
  };

  const downloadJobSheet = () => {
    generateJobSheetPDF({
      jobSheetNumber: o.jobSheetNumber || o.orderNumber,
      orderNumber: o.orderNumber,
      companyName: o.companyName,
      contactPerson: o.contactPerson,
      contactPhone: o.contactPhone,
      targetDeliveryDate: o.targetDeliveryDate,
      priority: o.priority,
      items: o.items,
      qualityCheck: o.qualityCheck,
      notes: o.notes,
    }).save(`${o.jobSheetNumber || o.orderNumber}_JobSheet.pdf`);
  };

  const downloadInvoice = () => {
    const inv = o.orderNumber.replace("UD-ORD-", "UD-INV-");
    generateTaxInvoicePDF({
      invoiceNumber: inv,
      orderNumber: o.orderNumber,
      companyName: o.companyName,
      contactPerson: o.contactPerson,
      contactPhone: o.contactPhone,
      clientGstin: o.customer?.gstin,
      shippingAddress: o.shippingAddress,
      issueDate: o.createdAt,
      items: o.items,
      gstRate: o.quotation?.gstRate ?? 5,
      taxType: o.quotation?.taxType ?? "CGST_SGST",
      totalAmount: o.totalAmount,
      advancePaid: o.advancePaid,
      balanceDue: o.balanceDue,
      paymentStatus: o.paymentStatus,
    }).save(`${inv}_TaxInvoice.pdf`);
  };

  return (
    <div className="p-7 space-y-5">
      <Link href="/orders" className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders Register
      </Link>

      {/* Header */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold font-mono text-zinc-900">{o.orderNumber}</h2>
              <Badge className={cn(stage.bg, stage.text, stage.border)}>{stage.label}</Badge>
              <Badge className={pay.cls}>{pay.label}</Badge>
              {o.priority !== "NORMAL" && <Badge className="bg-red-50 text-red-700 border-red-100">{o.priority}</Badge>}
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              {o.companyName} · {o.contactPerson} · Created {formatDate(o.createdAt)}
              {o.jobSheetNumber && ` · Job sheet ${o.jobSheetNumber}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={downloadJobSheet}>
              <FileDown className="w-3.5 h-3.5" /> Job sheet
            </Button>
            <Button onClick={downloadInvoice}>
              <FileDown className="w-3.5 h-3.5" /> Invoice
            </Button>
            {!closed && nextStage && (
              <Button variant="primary" disabled={busy} onClick={advance}>
                Move to {ORDER_STAGES[nextStage].label} <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Stepper */}
        {o.stage !== "CANCELLED" ? (
          <ol className="mt-5 grid grid-cols-4 md:grid-cols-8 gap-1.5">
            {FLOW.map((s, i) => {
              const done = i < stepIndex || o.stage === "DELIVERED";
              const current = i === stepIndex && o.stage !== "DELIVERED";
              return (
                <li key={s} className="flex flex-col gap-1.5">
                  <div className={cn("h-1.5 rounded-full", done ? "bg-zinc-900" : current ? "bg-blue-600" : "bg-zinc-200")} />
                  <span className={cn("text-[10px] leading-tight", current ? "text-blue-700 font-semibold" : done ? "text-zinc-800" : "text-zinc-400")}>
                    {done && <Check className="inline w-3 h-3 mr-0.5 -mt-0.5" />}
                    {ORDER_STAGES[s].label}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            This order is cancelled. Change its status below to reopen it.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          {/* Items */}
          <Card>
            <CardHeader title="Line items" subtitle={`${o.items.length} item(s)`} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={theadRowCls}>
                    <th className={thCls}>Product</th>
                    <th className={cn(thCls, "text-right")}>Qty</th>
                    <th className={cn(thCls, "text-right")}>Unit price</th>
                    <th className={cn(thCls, "text-right")}>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {o.items.map((it) => (
                    <tr key={it.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-900">{it.productName}</div>
                        <div className="text-[11px] text-zinc-500">
                          {[it.sku, it.customizationDetails].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{it.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(it.unitPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(it.lineTotal)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50/60">
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                      Order total
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(o.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Design approvals */}
          <Card>
            <CardHeader title="Design approvals" subtitle={`Artwork status: ${design.label}`} />
            <div className="divide-y divide-zinc-100">
              {[...o.mockups]
                .sort((a, b) => b.version - a.version)
                .map((m) => (
                  <div key={m.id} className="p-4 flex gap-3">
                    <a href={m.fileUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.fileUrl} alt={m.title} className="w-16 h-16 object-cover rounded border border-zinc-200 bg-zinc-50" />
                    </a>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900">{m.title}</span>
                        <span className="text-[10px] font-mono text-zinc-500">v{m.version}</span>
                        <Badge className={MOCKUP_BADGE[m.approvalStatus] ?? MOCKUP_BADGE.PENDING_REVIEW}>
                          {m.approvalStatus === "PENDING_REVIEW" ? "Pending review" : m.approvalStatus === "APPROVED" ? "Approved" : "Revisions requested"}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">Uploaded {formatDateTime(m.uploadedAt)}</div>
                      {m.clientFeedback && <div className="text-[11px] text-zinc-700 mt-1">Feedback: {m.clientFeedback}</div>}
                    </div>
                    {m.approvalStatus === "PENDING_REVIEW" && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <Button variant="primary" disabled={busy} onClick={() => reviewMockup(m, "APPROVED")}>
                          Approve
                        </Button>
                        <Button disabled={busy} onClick={() => setFeedback({ mockup: m, text: "" })}>
                          Request changes
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              {o.mockups.length === 0 && <div className="p-4 text-xs text-zinc-500">No artwork uploaded yet.</div>}
            </div>
            <div className="p-4 border-t border-zinc-200 grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 items-end">
              <Field label="Mockup title">
                <input
                  className={inputCls}
                  placeholder="e.g. Front logo placement"
                  value={mockupForm.title}
                  onChange={(e) => setMockupForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
              <Field label="Image link">
                <input
                  className={inputCls}
                  placeholder="https://… (Drive / Dropbox / image URL)"
                  value={mockupForm.fileUrl}
                  onChange={(e) => setMockupForm((f) => ({ ...f, fileUrl: e.target.value }))}
                />
              </Field>
              <Button disabled={busy} onClick={addMockup}>
                <Plus className="w-3.5 h-3.5" /> Add mockup
              </Button>
            </div>
          </Card>

          {/* QC */}
          <Card>
            <CardHeader
              title="Quality check"
              subtitle={
                o.qualityCheck?.checkedAt
                  ? `Last checked ${formatDateTime(o.qualityCheck.checkedAt)} by ${o.qualityCheck.inspectedBy ?? "—"}`
                  : "5-point inspection before dispatch"
              }
              action={
                o.qualityCheck?.passed ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100">Passed</Badge> : undefined
              }
            />
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QC_POINTS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-xs text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-zinc-900"
                      checked={qc[p.key]}
                      onChange={(e) => setQc((q) => ({ ...q, [p.key]: e.target.checked }))}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              <Field label="Remarks">
                <input className={inputCls} value={qcRemarks} onChange={(e) => setQcRemarks(e.target.value)} />
              </Field>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-500">
                  {QC_POINTS.filter((p) => qc[p.key]).length}/5 checked
                  {o.stage === "QUALITY_CHECK" && qcAll && " · saving will mark the order Ready to Dispatch"}
                </span>
                <Button variant="primary" disabled={busy} onClick={saveQc}>
                  Save QC
                </Button>
              </div>
            </div>
          </Card>

          {/* Dispatch */}
          <Card>
            <CardHeader
              title="Dispatch & delivery"
              subtitle={o.shipment ? `${SHIPMENT_LABEL[o.shipment.status] ?? o.shipment.status} · AWB ${o.shipment.trackingNumber}` : "Not dispatched yet"}
              action={
                o.shipment?.trackingUrl ? (
                  <a href={o.shipment.trackingUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-700 inline-flex items-center gap-1 hover:underline">
                    Track <ExternalLink className="w-3 h-3" />
                  </a>
                ) : undefined
              }
            />
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Courier">
                <select className={selectCls + " w-full"} value={ship.courierPartner} onChange={(e) => setShip((s) => ({ ...s, courierPartner: e.target.value }))}>
                  {[...new Set([ship.courierPartner, ...COURIERS])].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="AWB / tracking no." required>
                <input className={inputCls + " font-mono"} value={ship.trackingNumber} onChange={(e) => setShip((s) => ({ ...s, trackingNumber: e.target.value }))} />
              </Field>
              <Field label="Shipment status">
                <select className={selectCls + " w-full"} value={ship.status} onChange={(e) => setShip((s) => ({ ...s, status: e.target.value }))}>
                  {Object.entries(SHIPMENT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Packages">
                <input type="number" min={1} className={inputCls + " font-mono"} value={ship.packageCount} onChange={(e) => setShip((s) => ({ ...s, packageCount: Math.max(1, Number(e.target.value)) }))} />
              </Field>
              <Field label="Weight (kg)">
                <input type="number" min={0} className={inputCls + " font-mono"} value={ship.totalWeightKg} onChange={(e) => setShip((s) => ({ ...s, totalWeightKg: e.target.value }))} />
              </Field>
              <Field label="Estimated delivery">
                <input type="date" className={inputCls} value={ship.estimatedDelivery} onChange={(e) => setShip((s) => ({ ...s, estimatedDelivery: e.target.value }))} />
              </Field>
              <div className="sm:col-span-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-500">
                  {o.stage === "READY_FOR_DISPATCH" && !o.shipment
                    ? "Saving will mark the order Dispatched"
                    : "Set status to Delivered to close the order"}
                </span>
                <Button variant="primary" disabled={busy} onClick={saveShipment}>
                  {o.shipment ? "Update shipment" : "Save & dispatch"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Payment"
              action={
                o.balanceDue > 0 && o.stage !== "CANCELLED" ? (
                  <Button variant="primary" onClick={() => { setPayAmount(o.balanceDue); setPayOpen(true); }}>
                    Record payment
                  </Button>
                ) : undefined
              }
            />
            <div className="p-4 space-y-2 text-xs">
              <Row label="Order total" value={formatCurrency(o.totalAmount)} />
              <Row label="Received" value={formatCurrency(o.advancePaid)} cls="text-emerald-700" />
              <Row label="Balance due" value={formatCurrency(o.balanceDue)} cls={o.balanceDue > 0 ? "text-red-700" : "text-emerald-700"} bold />
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-600" style={{ width: `${o.totalAmount ? Math.min(100, (o.advancePaid / o.totalAmount) * 100) : 0}%` }} />
              </div>
              {o.payments && o.payments.length > 0 && (
                <div className="pt-3 mt-3 border-t border-zinc-100 space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-500">Payment history</div>
                  {o.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-[11px] text-zinc-700">
                      <span>
                        {p.method}
                        {p.reference ? ` · ${p.reference}` : ""}
                        <span className="text-zinc-400"> · {formatDate(p.paidAt)}</span>
                      </span>
                      <span className="font-mono font-medium text-emerald-700">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Customer"
              action={
                o.customer ? (
                  <Link href={`/customers?focus=${o.customer.id}`} className="text-[11px] text-blue-700 hover:underline">
                    {o.customer.customerCode}
                  </Link>
                ) : undefined
              }
            />
            <div className="p-4 space-y-1 text-xs">
              <div className="font-semibold text-zinc-900">{o.companyName}</div>
              <div className="text-zinc-700">{o.contactPerson}</div>
              <div className="text-zinc-600">{o.contactEmail}</div>
              <div className="text-zinc-600">{o.contactPhone}</div>
              {o.customer?.gstin && <div className="text-zinc-600 font-mono">GSTIN {o.customer.gstin}</div>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Order settings" />
            <div className="p-4 space-y-3">
              <Field label="Status (manual override)">
                <select className={selectCls + " w-full"} value={o.stage} disabled={busy} onChange={(e) => setStage(e.target.value)}>
                  {Object.entries(ORDER_STAGES).map(([k, s]) => (
                    <option key={k} value={k}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <select className={selectCls + " w-full"} value={details.priority} onChange={(e) => setDetails((d) => ({ ...d, priority: e.target.value }))}>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </Field>
                <Field label="Target delivery">
                  <input type="date" className={inputCls} value={details.targetDeliveryDate} onChange={(e) => setDetails((d) => ({ ...d, targetDeliveryDate: e.target.value }))} />
                </Field>
              </div>
              <Field label="Shipping address">
                <textarea rows={2} className={inputCls + " h-auto py-2"} value={details.shippingAddress} onChange={(e) => setDetails((d) => ({ ...d, shippingAddress: e.target.value }))} />
              </Field>
              <Field label="Internal notes">
                <textarea rows={2} className={inputCls + " h-auto py-2"} value={details.notes} onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))} />
              </Field>
              {o.actualDeliveryDate && <p className="text-[11px] text-emerald-700">Delivered on {formatDate(o.actualDeliveryDate)}</p>}
              <div className="flex justify-end">
                <Button disabled={busy} onClick={saveDetails}>
                  Save changes
                </Button>
              </div>
              <div className="pt-3 border-t border-zinc-200 flex flex-wrap gap-2">
                {o.stage !== "CANCELLED" && (
                  <Button variant="danger" disabled={busy} onClick={cancelOrder}>
                    <Ban className="w-3.5 h-3.5" /> Cancel order
                  </Button>
                )}
                <Button variant="danger" disabled={busy} onClick={deleteOrder}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <ol className="p-4 space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="text-xs">
                  <div className="text-zinc-800">{a.description}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {a.performedBy} · {formatDateTime(a.createdAt)}
                  </div>
                </li>
              ))}
              {activity.length === 0 && <li className="text-xs text-zinc-500">No activity yet.</li>}
            </ol>
          </Card>
        </div>
      </div>

      <Modal
        open={payOpen}
        title={`Record payment · ${o.orderNumber}`}
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <Button onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button variant="primary" disabled={busy} onClick={recordPayment}>
              Record {formatCurrency(payAmount)}
            </Button>
          </>
        }
      >
        <p className="text-xs text-zinc-600">Balance due: {formatCurrency(o.balanceDue)}</p>
        <Field label="Amount received (₹)">
          <input type="number" min={1} max={o.balanceDue} autoFocus className={inputCls + " font-mono"} value={payAmount} onChange={(e) => setPayAmount(Math.max(0, Number(e.target.value)))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <select className={selectCls + " w-full"} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="NEFT">NEFT</option>
              <option value="UPI">UPI</option>
              <option value="RTGS">RTGS</option>
              <option value="CARD">Card</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </Field>
          <Field label="UTR / Reference">
            <input className={inputCls + " font-mono"} placeholder="Optional" value={payReference} onChange={(e) => setPayReference(e.target.value)} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPayAmount(Math.round(o.balanceDue / 2))}>50%</Button>
          <Button onClick={() => setPayAmount(o.balanceDue)}>Full balance</Button>
        </div>
      </Modal>

      <Modal
        open={!!feedback}
        title="Request artwork changes"
        onClose={() => setFeedback(null)}
        footer={
          <>
            <Button onClick={() => setFeedback(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={busy || !feedback?.text.trim()}
              onClick={async () => {
                if (!feedback) return;
                const ok = await reviewMockup(feedback.mockup, "REVISIONS_REQUESTED", feedback.text.trim());
                if (ok) setFeedback(null);
              }}
            >
              Send feedback
            </Button>
          </>
        }
      >
        <Field label="What needs to change?">
          <textarea rows={3} autoFocus className={inputCls + " h-auto py-2"} value={feedback?.text ?? ""} onChange={(e) => setFeedback((f) => (f ? { ...f, text: e.target.value } : f))} />
        </Field>
      </Modal>
    </div>
  );
}

function Row({ label, value, cls, bold }: { label: string; value: string; cls?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-600">{label}</span>
      <span className={cn("font-mono", bold && "font-bold", cls ?? "text-zinc-900")}>{value}</span>
    </div>
  );
}
