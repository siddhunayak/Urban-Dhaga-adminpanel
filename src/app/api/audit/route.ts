import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const where: Record<string, unknown> = {};
    if (entityType && entityType !== "ALL") {
      where.entityType = entityType;
    }
    const entityId = searchParams.get("entityId");
    if (entityId) {
      where.entityId = entityId;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
  }
}
