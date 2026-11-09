import crypto from "node:crypto";
import { type Request, type Response, type NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import { getOrCreateUser } from "../db/users.ts";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email: string };
}

// Ephemeral per-process fallback secret if ADMIN_SESSION_SECRET is not provided in dev
const EPHEMERAL_SECRET = crypto.randomBytes(32).toString("hex");

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || EPHEMERAL_SECRET;
}

const SCRYPT_SALT = "dzphone-scrypt-v2-algeria";

export function hashPasswordScrypt(plain: string, salt = SCRYPT_SALT): Buffer {
  return crypto.scryptSync(plain, salt, 64);
}

/**
 * Verifies a candidate password against process.env.ADMIN_PASSWORD_HASH or process.env.ADMIN_PASSWORD
 * using scrypt key derivation and constant-time comparison.
 * NOTE: Never falls back to any hardcoded default password.
 */
export function verifyPasswordTimingSafe(candidate: string): boolean {
  if (!candidate || typeof candidate !== "string") return false;

  const configuredHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (configuredHash && configuredHash.startsWith("scrypt:")) {
    const [, salt, hexHash] = configuredHash.split(":");
    if (!salt || !hexHash) return false;
    const expectedBuf = Buffer.from(hexHash, "hex");
    const candidateBuf = hashPasswordScrypt(candidate, salt);
    return (
      expectedBuf.length === candidateBuf.length &&
      crypto.timingSafeEqual(expectedBuf, candidateBuf)
    );
  }

  const configuredPlain = process.env.ADMIN_PASSWORD?.trim();
  if (
    !configuredPlain ||
    configuredPlain === "REPLACE_WITH_STRONG_ADMIN_PASSWORD"
  ) {
    return false;
  }

  const expectedDerived = hashPasswordScrypt(configuredPlain);
  const candidateDerived = hashPasswordScrypt(candidate);
  return (
    expectedDerived.length === candidateDerived.length &&
    crypto.timingSafeEqual(expectedDerived, candidateDerived)
  );
}

export function isAdminPasswordConfigured(): boolean {
  const plain = process.env.ADMIN_PASSWORD?.trim();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const validPlain = Boolean(
    plain &&
      plain.length >= 12 &&
      plain !== "REPLACE_WITH_STRONG_ADMIN_PASSWORD" &&
      !/^YOUR_|^CHANGE_ME|^REPLACE_WITH/i.test(plain)
  );
  const hashParts = hash?.split(":");
  const validHash = Boolean(
    hashParts?.length === 3 &&
      hashParts[0] === "scrypt" &&
      (hashParts[1]?.length ?? 0) >= 16 &&
      /^[a-f0-9]{128}$/i.test(hashParts[2] || "")
  );
  return validPlain || validHash;
}

/** Production session signing key: 32 cryptographically random bytes encoded as 64 hex chars. */
export function isAdminSessionSecretConfigured(): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() || "";
  return /^[a-f0-9]{64}$/i.test(secret);
}

export function isPreviewAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !isAdminPasswordConfigured();
}

export function parseAdminEmailAllowlist(
  raw = process.env.ADMIN_EMAILS
): Set<string> {
  if (!raw || typeof raw !== "string") return new Set();
  const items = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e !== "admin@example.com");
  return new Set(items);
}

export function isAllowedAdminEmail(
  email: string | undefined | null,
  emailVerified: boolean | undefined | null,
  rawAllowlist = process.env.ADMIN_EMAILS
): boolean {
  if (emailVerified !== true) return false;
  if (!email || typeof email !== "string") return false;
  const allowlist = parseAdminEmailAllowlist(rawAllowlist);
  if (allowlist.size === 0) return false; // Fail closed when ADMIN_EMAILS is empty/missing
  return allowlist.has(email.trim().toLowerCase());
}

export function createAdminSessionToken(subject = "admin"): string {
  const issuedAt = Date.now().toString();
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = `${subject}:${issuedAt}:${nonce}`;
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  return `pwd.${subject}.${issuedAt}.${nonce}.${sig}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  if (!token || !token.startsWith("pwd.")) return false;
  const parts = token.split(".");
  if (parts.length !== 5) return false;
  const [, subject, issuedAt, nonce, sig] = parts;
  const payload = `${subject}:${issuedAt}:${nonce}`;
  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const ageMs = Date.now() - Number(issuedAt);
  // 12-hour session expiry
  return ageMs >= 0 && ageMs < 1000 * 60 * 60 * 12;
}

export const securityHeadersMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com",
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  next();
};

type RateBucket = { count: number; resetAt: number };

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  errorMessage: string;
}) {
  const buckets = new Map<string, RateBucket>();

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, Math.max(options.windowMs, 30_000));
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    // Use Express req.ip (governed by app.set("trust proxy", hops)), never raw x-forwarded-for or x-visitor-token headers
    const key = String(req.ip || req.socket?.remoteAddress || "global");
    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    if (existing.count >= options.maxRequests) {
      res.setHeader(
        "Retry-After",
        Math.ceil((existing.resetAt - now) / 1000).toString()
      );
      return res.status(429).json({ error: options.errorMessage });
    }
    existing.count += 1;
    return next();
  };
}

type VerifyIdTokenFn = (token: string) => Promise<DecodedIdToken>;
let customVerifyIdToken: VerifyIdTokenFn | null = null;

export function setTokenVerifierForTesting(fn: VerifyIdTokenFn | null) {
  customVerifyIdToken = fn;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "غير مصرح: يرجى تسجيل الدخول أولاً" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "غير مصرح: يرجى تسجيل الدخول أولاً" });
  }

  // 1. Check cryptographic HMAC session token
  if (verifyAdminSessionToken(token)) {
    try {
      await getOrCreateUser("admin-session-user", "admin@dzphone.dz", "admin");
    } catch {
      // ignore non-fatal DB user sync error
    }
    req.user = { uid: "admin-session-user", email: "admin@dzphone.dz" };
    return next();
  }

  // 2. Check Firebase Google OAuth ID token with strict ADMIN_EMAILS allowlist and email_verified check
  try {
    const verifier =
      customVerifyIdToken ?? ((t: string) => adminAuth.verifyIdToken(t));
    const decodedToken = await verifier(token);

    if (
      !isAllowedAdminEmail(decodedToken.email, decodedToken.email_verified)
    ) {
      return res.status(403).json({
        error:
          "غير مصرح: هذا البريد الإلكتروني غير مدرج ضمن قائمة المشرفين المعتمدين (ADMIN_EMAILS) أو غير مؤكد.",
      });
    }

    const normalizedEmail = decodedToken.email!.trim().toLowerCase();
    try {
      await getOrCreateUser(decodedToken.uid, normalizedEmail, "admin");
    } catch {
      // ignore non-fatal DB user sync error during unit tests
    }
    req.user = decodedToken;
    return next();
  } catch (error: any) {
    // Never log the raw token string
    console.error(
      "Error verifying auth token:",
      error?.code || error?.message || "Invalid token"
    );
    return res.status(401).json({ error: "غير مصرح: رمز الجلسة غير صالح" });
  }
};
