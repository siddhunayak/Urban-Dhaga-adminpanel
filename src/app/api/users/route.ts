import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth-server";
import { hashPassword } from "@/lib/password";
import { EMAIL_RE, isOneOf, parseJsonBody, USER_ROLES } from "@/lib/validators";

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

export async function GET() {
  const auth = await authorize("users:read");
  if (!auth.ok) return auth.response;

  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorize("users:write");
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role ? String(body.role).toUpperCase() : "STAFF";
  const department =
    typeof body.department === "string" && body.department.trim()
      ? body.department.trim()
      : "Operations";
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and initial password are required" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (!isOneOf(role, USER_ROLES)) {
    return NextResponse.json(
      { error: `Invalid role. Allowed: ${USER_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A staff account with this email already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          department,
          phone,
          isActive: true,
        },
        select: USER_SELECT,
      });

      await tx.activityLog.create({
        data: {
          entityType: "TEAM",
          entityId: created.id,
          action: "CREATED",
          description: `Staff account created for ${created.name} (${created.role} — ${created.department})`,
          performedBy: auth.user.name,
        },
      });

      return created;
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}
