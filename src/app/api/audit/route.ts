import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  const isOrderScoped = Boolean(entityId) && (!entityType || entityType === "ORDER");
  const auth = await authorize(isOrderScoped ? "orders:read" : "audit:read");
  if (!auth.ok) return auth.response;

  try {
    const rawTake = Number(searchParams.get("take"));
    const rawSkip = Number(searchParams.get("skip"));
    const take = Number.isFinite(rawTake) && rawTake > 0 ? Math.min(200, Math.floor(rawTake)) : 100;
    const skip = Number.isFinite(rawSkip) && rawSkip >= 0 ? Math.floor(rawSkip) : 0;

    const where: Record<string, unknown> = {};
    if (entityType && entityType !== "ALL") {
      where.entityType = entityType;
    } else if (isOrderScoped) {
      where.entityType = "ORDER";
    }
    if (entityId) {
      where.entityId = entityId;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
