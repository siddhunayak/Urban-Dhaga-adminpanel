import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { prismaErrorCode } from "@/lib/validators";

type DbClient = Prisma.TransactionClient | typeof prisma;

function extractTrailingNumber(value: string): number {
  const match = value.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function generateNextLeadNumber(db: DbClient = prisma): Promise<string> {
  const leads = await db.lead.findMany({ select: { leadNumber: true } });
  const maxNum = leads.reduce((max, l) => Math.max(max, extractTrailingNumber(l.leadNumber)), 1040);
  return `LD-${maxNum + 1}`;
}

export async function generateNextCustomerCode(db: DbClient = prisma): Promise<string> {
  const customers = await db.customer.findMany({ select: { customerCode: true } });
  const maxNum = customers.reduce((max, c) => Math.max(max, extractTrailingNumber(c.customerCode)), 100);
  return `UD-CUST-${maxNum + 1}`;
}

export async function generateNextQuoteNumber(db: DbClient = prisma): Promise<string> {
  const quotes = await db.quotation.findMany({ select: { quoteNumber: true } });
  const year = new Date().getFullYear();
  const maxNum = quotes.reduce((max, q) => Math.max(max, extractTrailingNumber(q.quoteNumber)), 40);
  return `UD-QT-${year}-${String(maxNum + 1).padStart(4, "0")}`;
}

export async function generateNextOrderNumbers(
  db: DbClient = prisma
): Promise<{ orderNumber: string; jobSheetNumber: string; invoiceNumber: string }> {
  const orders = await db.order.findMany({
    select: { orderNumber: true, jobSheetNumber: true, invoiceNumber: true },
  });
  const year = new Date().getFullYear();
  const maxOrder = orders.reduce((max, o) => Math.max(max, extractTrailingNumber(o.orderNumber)), 18);
  const maxJs = orders.reduce(
    (max, o) => Math.max(max, o.jobSheetNumber ? extractTrailingNumber(o.jobSheetNumber) : 0),
    88
  );
  const maxInv = orders.reduce(
    (max, o) => Math.max(max, o.invoiceNumber ? extractTrailingNumber(o.invoiceNumber) : 0),
    maxOrder
  );
  const nextOrderSeq = String(maxOrder + 1).padStart(4, "0");
  const nextInvSeq = String(Math.max(maxOrder + 1, maxInv + 1)).padStart(4, "0");
  return {
    orderNumber: `UD-ORD-${year}-${nextOrderSeq}`,
    jobSheetNumber: `JS-${year}-${String(maxJs + 1).padStart(4, "0")}`,
    invoiceNumber: `UD-INV-${year}-${nextInvSeq}`,
  };
}

export async function runTxWithRetry<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction((tx) => fn(tx));
    } catch (err) {
      lastErr = err;
      if (prismaErrorCode(err) === "P2002" && attempt < maxAttempts) {
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
