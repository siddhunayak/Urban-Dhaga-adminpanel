import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, SessionPayload, verifySessionToken } from "@/lib/session";

export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
