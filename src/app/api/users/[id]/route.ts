import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server";
import { hashPassword } from "@/lib/password";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the Owner can modify staff roles or status" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (id === session.userId && body.isActive === false) {
      return NextResponse.json(
        { error: "Cannot deactivate your own Owner account" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: body.role ?? target.role,
        department: body.department ?? target.department,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : target.isActive,
        passwordHash: body.newPassword ? hashPassword(body.newPassword) : target.passwordHash,
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
        entityId: id,
        action: "UPDATED",
        description: `Staff member ${updated.name} updated (Role: ${updated.role}, Active: ${updated.isActive})`,
        performedBy: session.name,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("User PATCH error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
