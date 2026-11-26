import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { hashPassword } from "@/lib/password";
import { isOneOf, parseJsonBody, USER_ROLES } from "@/lib/validators";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  isActive: true,
  phone: true,
  createdAt: true,
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("users:read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("User GET [id] error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("users:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const { id } = await params;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const nextRole = body.role !== undefined ? String(body.role).toUpperCase() : target.role;
    if (!isOneOf(nextRole, USER_ROLES)) {
      return NextResponse.json(
        { error: `Invalid role. Allowed: ${USER_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const nextActive = body.isActive !== undefined ? Boolean(body.isActive) : target.isActive;

    if (id === auth.user.userId && nextActive === false) {
      return NextResponse.json(
        { error: "Cannot deactivate your own Owner account" },
        { status: 400 }
      );
    }
    if (id === auth.user.userId && nextRole !== "OWNER") {
      return NextResponse.json(
        { error: "Cannot demote your own Owner account" },
        { status: 400 }
      );
    }

    if (target.role === "OWNER" && target.isActive && (nextRole !== "OWNER" || !nextActive)) {
      const otherOwners = await prisma.user.count({
        where: { role: "OWNER", isActive: true, id: { not: id } },
      });
      if (otherOwners === 0) {
        return NextResponse.json(
          { error: "Cannot remove or deactivate the sole active Owner" },
          { status: 400 }
        );
      }
    }

    let nextPasswordHash = target.passwordHash;
    if (body.newPassword !== undefined && body.newPassword !== null && body.newPassword !== "") {
      if (typeof body.newPassword !== "string" || body.newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }
      nextPasswordHash = hashPassword(body.newPassword);
    }

    const nextDepartment =
      typeof body.department === "string" && body.department.trim()
        ? body.department.trim()
        : target.department;

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          role: nextRole,
          department: nextDepartment,
          isActive: nextActive,
          passwordHash: nextPasswordHash,
        },
        select: USER_SELECT,
      });

      await tx.activityLog.create({
        data: {
          entityType: "TEAM",
          entityId: id,
          action: "UPDATED",
          description: `Staff member ${u.name} updated (Role: ${u.role}, Active: ${u.isActive})`,
          performedBy: auth.user.name,
        },
      });

      return u;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("User PATCH error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize("users:write");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    if (id === auth.user.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === "OWNER" && target.isActive) {
      const otherOwners = await prisma.user.count({
        where: { role: "OWNER", isActive: true, id: { not: id } },
      });
      if (otherOwners === 0) {
        return NextResponse.json(
          { error: "Cannot delete the sole active Owner" },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
      await tx.activityLog.create({
        data: {
          entityType: "TEAM",
          entityId: id,
          action: "DELETED",
          description: `Staff member ${target.name} (${target.email}) deleted`,
          performedBy: auth.user.name,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
