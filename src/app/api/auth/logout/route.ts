import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-server";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  try {
    const session = await getSessionUser();
    if (session) {
      await prisma.activityLog.create({
        data: {
          entityType: "AUTH",
          entityId: session.userId,
          action: "LOGOUT",
          description: `${session.name} (${session.role}) signed out`,
          performedBy: session.name,
        },
      });
    }
  } catch (err) {
    console.error("Logout audit error:", err);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
