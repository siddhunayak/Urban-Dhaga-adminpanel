"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Factory,
  Kanban,
  Table as TableIcon,
  Search,
  Filter,
  Truck,
  Clock,
  ShieldCheck,
  FileDown,
  X,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Image as ImageIcon,
  IndianRupee,
  Plus,
} from "lucide-react";
import { formatCurrency, formatDate, ORDER_STAGES } from "@/lib/utils";
import { generateJobSheetPDF } from "@/lib/pdf-generator";

interface OrderItem {
  id: string;
  productName: string;
  sku?: string | null;
  sizeBreakdown?: string | null;
  quantity: number;
  unitPrice: number;
  customizationDetails?: string | null;
  lineTotal: number;
}

interface QualityCheck {
  id: string;
  fabricQualityChecked: boolean;
  printFidelityChecked: boolean;
  colorAccuracyChecked: boolean;
  stitchingFinishChecked: boolean;
  packagingChecked: boolean;
  passed: boolean;
  inspectedBy?: string | null;
  remarks?: string | null;
  checkedAt?: string | null;
}

interface ShipmentDetails {
  id: string;
  courierPartner: string;
  trackingNumber: string;
  dispatchDate?: string | null;
  estimatedDelivery?: string | null;
  packageCount: number;
  totalWeightKg?: number | null;
  status: string;
  trackingUrl?: string | null;
}

interface OrderMockup {
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
  items: OrderItem[];
  mockups?: OrderMockup[];
  qualityCheck?: QualityCheck | null;
  shipment?: ShipmentDetails | null;
}

const STAGE_ORDER = [
  "ORDER_CONFIRMED",
  "ARTWORK_SUBMITTED",
  "SAMPLE_APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
];

export default function ProductionPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // QC modal state
  const [qcState, setQcState] = useState({
    fabric: false,
    print: false,
    color: false,
    stitching: false,
    packaging: false,
    inspectedBy: "Vikram Rathore (QC Master)",
    remarks: "",
  });
  const [savingQc, setSavingQc] = useState(false);

  // Dispatch modal state
  const [shipmentState, setShipmentState] = useState({
    courierPartner: "Shiprocket / Delhivery",
    trackingNumber: "",
    packageCount: 5,
    totalWeightKg: 65,
    status: "MANIFESTED",
  });
  const [savingShipment, setSavingShipment] = useState(false);

  // Payment & Mockup states
  const [paymentInput, setPaymentInput] = useState(0);
  const [savingPayment, setSavingPayment] = useState(false);
  const [mockupTitle, setMockupTitle] = useState("");
  const [mockupUrl, setMockupUrl] = useState("");
  const [savingMockup, setSavingMockup] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const url = new URL("/api/orders", window.location.origin);
      if (stageFilter !== "ALL") url.searchParams.set("stage", stageFilter);
      if (priorityFilter !== "ALL") url.searchParams.set("priority", priorityFilter);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString());
      const data: Order[] = await res.json();
      setOrders(data);

      setSelectedOrder((prev) => {
        if (!prev) return null;
        return data.find((o) => o.id === prev.id) || prev;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [stageFilter, priorityFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleOpenDetail = (ord: Order) => {
    setSelectedOrder(ord);
    setPaymentInput(ord.advancePaid || 0);
    if (ord.qualityCheck) {
      setQcState({
        fabric: ord.qualityCheck.fabricQualityChecked,
        print: ord.qualityCheck.printFidelityChecked,
        color: ord.qualityCheck.colorAccuracyChecked,
        stitching: ord.qualityCheck.stitchingFinishChecked,
        packaging: ord.qualityCheck.packagingChecked,
        inspectedBy: ord.qualityCheck.inspectedBy || "Vikram Rathore (QC Master)",
        remarks: ord.qualityCheck.remarks || "",
      });
    } else {
      setQcState({
        fabric: false,
        print: false,
        color: false,
        stitching: false,
        packaging: false,
        inspectedBy: "Vikram Rathore (QC Master)",
        remarks: "",
      });
    }
    if (ord.shipment) {
      setShipmentState({
        courierPartner: ord.shipment.courierPartner,
        trackingNumber: ord.shipment.trackingNumber,
        packageCount: ord.shipment.packageCount,
        totalWeightKg: ord.shipment.totalWeightKg || 50,
        status: ord.shipment.status,
      });
    } else {
      setShipmentState({
        courierPartner: "Shiprocket / Delhivery",
        trackingNumber: `AWB-${Math.floor(10000000 + Math.random() * 90000000)}`,
        packageCount: 4,
        totalWeightKg: 48,
        status: "MANIFESTED",
      });
    }
  };

  const handleAdvanceStage = async (orderId: string, currentStage: string, direction: 1 | -1) => {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= STAGE_ORDER.length) return;

    const nextStage = STAGE_ORDER[nextIndex];

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (!res.ok) {
        toast.error("Failed to update order stage");
        return;
      }
      toast.success(`Moved to ${ORDER_STAGES[nextStage]?.label || nextStage}`);
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Network error updating stage");
    }
  };

  const handlePriorityChange = async (orderId: string, priority: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      if (res.ok) {
        toast.success(`Priority marked as ${priority}`);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedOrder) return;
    try {
      setSavingPayment(true);
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advancePaid: paymentInput }),
      });
      if (!res.ok) {
        toast.error("Failed to record payment");
        return;
      }
      toast.success("Payment ledger updated");
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Network error updating payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleAddMockup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !mockupTitle.trim()) return;
    try {
      setSavingMockup(true);
      const res = await fetch(`/api/orders/${selectedOrder.id}/mockups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: mockupTitle, fileUrl: mockupUrl }),
      });
      if (!res.ok) {
        toast.error("Failed to add artwork mockup");
        return;
      }
      toast.success("Artwork proof added");
      setMockupTitle("");
      setMockupUrl("");
      fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMockup(false);
    }
  };

  const handleMockupDecision = async (mockupId: string, approvalStatus: string) => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/mockups`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mockupId,
          approvalStatus,
          autoAdvanceStage: approvalStatus === "APPROVED",
        }),
      });
      if (res.ok) {
        toast.success(`Mockup marked ${approvalStatus}`);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveQC = async () => {
    if (!selectedOrder) return;
    try {
      setSavingQc(true);
      const res = await fetch(`/api/orders/${selectedOrder.id}/qc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fabricQualityChecked: qcState.fabric,
          printFidelityChecked: qcState.print,
          colorAccuracyChecked: qcState.color,
          stitchingFinishChecked: qcState.stitching,
          packagingChecked: qcState.packaging,
          inspectedBy: qcState.inspectedBy,
          remarks: qcState.remarks,
          autoAdvanceStage: true,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to save QC audit");
        return;
      }
      const saved = await res.json();
      toast.success(
        saved.passed
          ? "5-Point QC Passed! Order ready for dispatch."
          : "QC inspection checklist saved"
      );
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Network error saving QC");
    } finally {
      setSavingQc(false);
    }
  };

  const handleSaveShipment = async () => {
    if (!selectedOrder) return;
    if (!shipmentState.trackingNumber.trim()) {
      toast.error("AWB / Tracking number is required");
      return;
    }
    try {
      setSavingShipment(true);
      const res = await fetch(`/api/orders/${selectedOrder.id}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courierPartner: shipmentState.courierPartner,
          trackingNumber: shipmentState.trackingNumber,
          packageCount: shipmentState.packageCount,
          totalWeightKg: shipmentState.totalWeightKg,
          status: shipmentState.status,
          advanceStage: true,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to book shipment");
        return;
      }
      toast.success(`Dispatched via ${shipmentState.courierPartner}`);
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Network error booking shipment");
    } finally {
      setSavingShipment(false);
    }
  };

  const handleDownloadJobSheet = (ord: Order) => {
    const doc = generateJobSheetPDF({
      jobSheetNumber: ord.jobSheetNumber || `JS-${ord.orderNumber.replace("UD-ORD-", "")}`,
      orderNumber: ord.orderNumber,
      companyName: ord.companyName,
      contactPerson: ord.contactPerson,
      contactPhone: ord.contactPhone,
      targetDeliveryDate: ord.targetDeliveryDate,
      priority: ord.priority,
      items: ord.items,
      qualityCheck: ord.qualityCheck,
      notes: ord.notes,
    });
    doc.save(`${ord.jobSheetNumber || ord.orderNumber}_JobSheet.pdf`);
    toast.success(`Job Sheet PDF downloaded for ${ord.orderNumber}`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Factory className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>Production & Order Execution</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            End-to-end tracking: Artwork proofs, printing & stitching floor, 5-point QC gates, and courier dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
              title="Table Grid View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchOrders}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-400"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-700 dark:text-zinc-300"
          >
            <option value="ALL">All Production Stages</option>
            {Object.entries(ORDER_STAGES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-700 dark:text-zinc-300"
          >
            <option value="ALL">All Priorities</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="URGENT">Urgent Priority</option>
          </select>
        </div>

        <div className="relative md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            placeholder="Search order #, client, job sheet..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main View: Kanban or Table */}
      {viewMode === "kanban" ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1400px]">
            {STAGE_ORDER.map((stageKey, colIdx) => {
              const stageConfig = ORDER_STAGES[stageKey];
              const stageOrders = orders.filter((o) => o.stage === stageKey);

              return (
                <div
                  key={stageKey}
                  className="w-72 shrink-0 flex flex-col rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 max-h-[75vh]"
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-zinc-400">
                        0{colIdx + 1}
                      </span>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {stageConfig.label}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
                      {stageOrders.length}
                    </span>
                  </div>

                  {/* Column Cards */}
                  <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                    {stageOrders.map((ord) => {
                      const totalUnits = ord.items.reduce((acc, i) => acc + i.quantity, 0);

                      return (
                        <div
                          key={ord.id}
                          onClick={() => handleOpenDetail(ord)}
                          className="p-3 bg-white dark:bg-zinc-855 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-xs cursor-pointer transition-all space-y-2 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                              {ord.orderNumber}
                            </span>
                            {ord.priority === "URGENT" || ord.priority === "HIGH" ? (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-500/10 text-red-600 border border-red-500/20">
                                {ord.priority}
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {ord.companyName}
                          </div>

                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {ord.items.map((i) => i.productName).join(" + ")}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400">
                            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                              {totalUnits} pcs • {formatCurrency(ord.totalAmount)}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              {formatDate(ord.targetDeliveryDate)}
                            </span>
                          </div>

                          {/* Quick Stage Controls */}
                          <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceStage(ord.id, ord.stage, -1);
                              }}
                              disabled={colIdx === 0}
                              className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-20"
                              title="Previous Stage"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            <span className="font-mono text-[9px] text-zinc-400">
                              {ord.jobSheetNumber || "Job Sheet"}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceStage(ord.id, ord.stage, 1);
                              }}
                              disabled={colIdx === STAGE_ORDER.length - 1}
                              className="p-1 text-blue-600 hover:text-blue-700 disabled:opacity-20 font-bold"
                              title="Advance to Next Stage"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {stageOrders.length === 0 && (
                      <div className="p-4 text-center text-zinc-400 text-xs font-mono">
                        No orders in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-850 border-b border-zinc-200 dark:border-zinc-800 font-mono uppercase text-zinc-500 text-[10px]">
                <tr>
                  <th className="px-4 py-3">Order & Job Sheet</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Production Items</th>
                  <th className="px-4 py-3">Target Dispatch</th>
                  <th className="px-4 py-3 text-right">Order Value</th>
                  <th className="px-4 py-3 text-center">Stage</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {orders.map((ord) => {
                  const stageConfig = ORDER_STAGES[ord.stage] || ORDER_STAGES.ORDER_CONFIRMED;
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => handleOpenDetail(ord)}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-850/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {ord.orderNumber}
                        <div className="text-[10px] text-zinc-400 font-normal">
                          {ord.jobSheetNumber}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {ord.companyName}
                        </div>
                        <div className="text-[11px] text-zinc-500">{ord.contactPerson}</div>
                      </td>

                      <td className="px-4 py-3 max-w-xs truncate">
                        <div className="text-zinc-800 dark:text-zinc-200 truncate">
                          {ord.items.map((i) => `${i.productName} (${i.quantity})`).join(", ")}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {ord.items.reduce((acc, i) => acc + i.quantity, 0)} units total
                        </div>
                      </td>

                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                        {formatDate(ord.targetDeliveryDate)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(ord.totalAmount)}
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                          Due: {formatCurrency(ord.balanceDue)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${stageConfig.bg} ${stageConfig.text} ${stageConfig.border}`}>
                          {stageConfig.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadJobSheet(ord);
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1"
                        >
                          <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Job Sheet</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Drawer & QC Panel */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-850">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedOrder.orderNumber}
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                    {selectedOrder.jobSheetNumber}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {selectedOrder.companyName} • {selectedOrder.contactPerson} ({selectedOrder.contactPhone})
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadJobSheet(selectedOrder)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm inline-flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Job Sheet PDF</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stage Stepper Banner */}
              <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-mono block">Current Stage</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                    {ORDER_STAGES[selectedOrder.stage]?.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedOrder.priority}
                    onChange={(e) => handlePriorityChange(selectedOrder.id, e.target.value)}
                    className="px-2 py-1 text-xs font-mono bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <button
                    onClick={() => handleAdvanceStage(selectedOrder.id, selectedOrder.stage, -1)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-700 rounded border border-zinc-200 dark:border-zinc-600 hover:bg-zinc-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleAdvanceStage(selectedOrder.id, selectedOrder.stage, 1)}
                    className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs"
                  >
                    Advance Next Stage →
                  </button>
                </div>
              </div>

              {/* Payment Reconciliation Card */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Payment & Receivables Status
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      selectedOrder.paymentStatus === "FULLY_PAID"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : selectedOrder.paymentStatus === "PARTIAL_PAID"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : "bg-red-500/10 text-red-600 border-red-500/20"
                    }`}
                  >
                    {selectedOrder.paymentStatus}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Order Total</span>
                    <strong>{formatCurrency(selectedOrder.totalAmount)}</strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Collected</span>
                    <strong className="text-emerald-600">{formatCurrency(selectedOrder.advancePaid)}</strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Balance Due</span>
                    <strong className="text-blue-600">{formatCurrency(selectedOrder.balanceDue)}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="number"
                    min="0"
                    max={selectedOrder.totalAmount}
                    value={paymentInput}
                    onChange={(e) => setPaymentInput(Number(e.target.value))}
                    className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setPaymentInput(selectedOrder.totalAmount)}
                    className="px-2.5 py-1.5 text-[11px] font-mono bg-zinc-200 dark:bg-zinc-700 rounded-lg hover:bg-zinc-300"
                  >
                    Full Amount
                  </button>
                  <button
                    type="button"
                    disabled={savingPayment}
                    onClick={handleRecordPayment}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                  >
                    {savingPayment ? "Saving..." : "Update Payment"}
                  </button>
                </div>
              </div>

              {/* Items & Size Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-wider">
                  Production Line Items & Sizing
                </h3>

                {selectedOrder.items.map((it) => {
                  let sizes: Record<string, number> = {};
                  if (it.sizeBreakdown) {
                    try {
                      sizes = JSON.parse(it.sizeBreakdown);
                    } catch {}
                  }

                  return (
                    <div
                      key={it.id}
                      className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                            {it.productName}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            Customization: {it.customizationDetails || "Standard production"}
                          </div>
                        </div>
                        <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {it.quantity} units
                        </div>
                      </div>

                      {Object.keys(sizes).length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 font-mono">Sizes:</span>
                          {Object.entries(sizes).map(([s, count]) => (
                            <span
                              key={s}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                            >
                              {s}: <strong className="text-zinc-900 dark:text-zinc-100">{count}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mockups & Artwork Approvals */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Design Mockups & Client Artwork Proofs
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {selectedOrder.mockups?.length || 0} versions
                  </span>
                </div>

                {selectedOrder.mockups && selectedOrder.mockups.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.mockups.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-850 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            v{m.version} • {m.title}
                          </div>
                          {m.clientFeedback && (
                            <div className="text-[11px] text-zinc-500 truncate">{m.clientFeedback}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.approvalStatus === "APPROVED" ? (
                            <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              APPROVED
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleMockupDecision(m.id, "APPROVED")}
                                className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMockupDecision(m.id, "REVISIONS_REQUESTED")}
                                className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded"
                              >
                                Revise
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-400 font-mono">
                    No artwork proofs uploaded yet.
                  </div>
                )}

                <form onSubmit={handleAddMockup} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add proof version title (e.g. Chest Print Proof v1)..."
                    value={mockupTitle}
                    onChange={(e) => setMockupTitle(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                  />
                  <button
                    type="submit"
                    disabled={savingMockup || !mockupTitle.trim()}
                    className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Proof</span>
                  </button>
                </form>
              </div>

              {/* Mandatory 5-Point Quality Check Checklist */}
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/[0.03] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      Mandatory 5-Point Quality Check Gate
                    </h3>
                  </div>
                  {selectedOrder.qualityCheck?.passed ? (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      QC PASSED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      INSPECTION PENDING
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {[
                    { key: "fabric", label: "1. Fabric & Material Inspection (GSM & defect audit)" },
                    { key: "print", label: "2. Print & Embroidery Fidelity (registration & wash test)" },
                    { key: "color", label: "3. Color Accuracy (Pantone delta <= 5% match)" },
                    { key: "stitching", label: "4. Stitching & Hemming Integrity (seam tension & labels)" },
                    { key: "packaging", label: "5. Packaging & Barcode Compliance (polybag & cartons)" },
                  ].map((chk) => (
                    <label
                      key={chk.key}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(qcState[chk.key as keyof typeof qcState])}
                        onChange={(e) =>
                          setQcState((prev) => ({ ...prev, [chk.key]: e.target.checked }))
                        }
                        className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                      />
                      <span className="text-zinc-800 dark:text-zinc-200">{chk.label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2">
                  <div>
                    <label className="text-zinc-500">Inspector Sign-off</label>
                    <input
                      type="text"
                      value={qcState.inspectedBy}
                      onChange={(e) => setQcState((prev) => ({ ...prev, inspectedBy: e.target.value }))}
                      className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500">Inspector Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. GSM verified 240, passed wash test"
                      value={qcState.remarks}
                      onChange={(e) => setQcState((prev) => ({ ...prev, remarks: e.target.value }))}
                      className="mt-1 w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingQc}
                  onClick={handleSaveQC}
                  className="w-full py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all"
                >
                  {savingQc ? "Saving Sign-off..." : "Submit Quality Check Audit & Advance"}
                </button>
              </div>

              {/* Courier & Logistics Tracking */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-600" />
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Dispatch & Logistics Tracking
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-500">Courier Partner</label>
                    <select
                      value={shipmentState.courierPartner}
                      onChange={(e) => setShipmentState((prev) => ({ ...prev, courierPartner: e.target.value }))}
                      className="mt-1 w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    >
                      <option value="Shiprocket / Delhivery">Shiprocket / Delhivery</option>
                      <option value="Blue Dart Express">Blue Dart Express</option>
                      <option value="DTDC Express">DTDC Express</option>
                      <option value="Direct Factory Hand Delivery">Direct Factory Hand Delivery</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-500">AWB / Tracking Number</label>
                    <input
                      type="text"
                      value={shipmentState.trackingNumber}
                      onChange={(e) => setShipmentState((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                      className="mt-1 w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500">Total Boxes</label>
                    <input
                      type="number"
                      value={shipmentState.packageCount}
                      onChange={(e) => setShipmentState((prev) => ({ ...prev, packageCount: Number(e.target.value) }))}
                      className="mt-1 w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-500">Consignment Weight (KG)</label>
                    <input
                      type="number"
                      value={shipmentState.totalWeightKg}
                      onChange={(e) => setShipmentState((prev) => ({ ...prev, totalWeightKg: Number(e.target.value) }))}
                      className="mt-1 w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingShipment}
                  onClick={handleSaveShipment}
                  className="w-full py-2 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg transition-colors"
                >
                  {savingShipment ? "Updating..." : "Book Shipment & Dispatch Consignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

