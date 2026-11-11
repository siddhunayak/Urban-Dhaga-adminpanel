import { prisma } from "@/lib/prisma";

function extractTrailingNumber(value: string): number {
  const match = value.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function generateNextLeadNumber(): Promise<string> {
  const leads = await prisma.lead.findMany({ select: { leadNumber: true } });
  const maxNum = leads.reduce((max, l) => Math.max(max, extractTrailingNumber(l.leadNumber)), 1040);
  return `LD-${maxNum + 1}`;
}

export async function generateNextCustomerCode(): Promise<string> {
  const customers = await prisma.customer.findMany({ select: { customerCode: true } });
  const maxNum = customers.reduce((max, c) => Math.max(max, extractTrailingNumber(c.customerCode)), 100);
  return `UD-CUST-${maxNum + 1}`;
}

export async function generateNextQuoteNumber(): Promise<string> {
  const quotes = await prisma.quotation.findMany({ select: { quoteNumber: true } });
  const year = new Date().getFullYear();
  const maxNum = quotes.reduce((max, q) => Math.max(max, extractTrailingNumber(q.quoteNumber)), 40);
  return `UD-QT-${year}-${String(maxNum + 1).padStart(4, "0")}`;
}

export async function generateNextOrderNumbers(): Promise<{ orderNumber: string; jobSheetNumber: string }> {
  const orders = await prisma.order.findMany({
    select: { orderNumber: true, jobSheetNumber: true },
  });
  const year = new Date().getFullYear();
  const maxOrder = orders.reduce((max, o) => Math.max(max, extractTrailingNumber(o.orderNumber)), 18);
  const maxJs = orders.reduce(
    (max, o) => Math.max(max, o.jobSheetNumber ? extractTrailingNumber(o.jobSheetNumber) : 0),
    88
  );
  return {
    orderNumber: `UD-ORD-${year}-${String(maxOrder + 1).padStart(4, "0")}`,
    jobSheetNumber: `JS-${year}-${String(maxJs + 1).padStart(4, "0")}`,
  };
}
