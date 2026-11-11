export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  exp: number;
}

export const SESSION_COOKIE_NAME = "ud_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn("WARNING: AUTH_SECRET env var is not configured. Using fallback key.");
  }
  return "urban-dhaga-dev-fallback-key-2026";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(
  user: Omit<SessionPayload, "exp">
): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_DURATION_MS,
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getHmacKey();
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded)
  );
  const sig = toBase64Url(new Uint8Array(sigBuffer));
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  try {
    const key = await getHmacKey();
    const sigBytes = fromBase64Url(sig);
    const sigBuffer = new ArrayBuffer(sigBytes.length);
    new Uint8Array(sigBuffer).set(sigBytes);

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuffer,
      new TextEncoder().encode(encoded)
    );
    if (!valid) return null;

    const json = new TextDecoder().decode(fromBase64Url(encoded));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.userId || !payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
