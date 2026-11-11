import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server";
import { hashPassword } from "@/lib/password";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the Owner can provision new staff accounts" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    if (!body.name || !email || !body.password) {
      return NextResponse.json(
        { error: "Name, email, and initial password are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A staff account with this email already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash: hashPassword(body.password),
        role: body.role || "STAFF",
        department: body.department || "Operations",
        phone: body.phone || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        phone: true,
        createdAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        entityType: "TEAM",
        entityId: user.id,
        action: "CREATED",
        description: `Staff account created for ${user.name} (${user.role} — ${user.department})`,
        performedBy: session.name,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
