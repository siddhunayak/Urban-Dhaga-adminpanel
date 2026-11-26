import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { hasPermission, Permission } from "@/lib/rbac";

export interface AuthenticatedUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      isActive: true,
    },
  });

  if (!dbUser || !dbUser.isActive) return null;

  return {
    userId: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    department: dbUser.department,
  };
}

export async function authorize(
  permission: Permission
): Promise<{ ok: true; user: AuthenticatedUser } | { ok: false; response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!hasPermission(user.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden: insufficient role permissions" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, user };
}
