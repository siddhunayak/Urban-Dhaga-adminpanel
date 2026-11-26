import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { parseJsonBody } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody<{ email?: string; password?: string }>(request);
    if (!parsed.ok) return parsed.response;

    const email = (parsed.data.email || "").trim().toLowerCase();
    const password = parsed.data.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid credentials or deactivated account" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    });

    await prisma.activityLog.create({
      data: {
        entityType: "AUTH",
        entityId: user.id,
        action: "LOGIN",
        description: `${user.name} (${user.role}) signed in`,
        performedBy: user.name,
      },
    });

    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.url.startsWith("https://");

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
