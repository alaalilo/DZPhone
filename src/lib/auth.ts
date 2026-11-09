import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleAuthProvider } from "./firebase";
import { setState } from "./store";

const VISITOR_STORAGE_KEY = "dzphone_visitor_token_v1";

// Store admin auth token strictly in memory (never in localStorage) per security guidelines
let inMemoryAdminToken: string | null = null;
let cachedVisitorToken: string | null = null;

function generateRandomVisitorToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return (
    "vis-" +
    Math.random().toString(36).slice(2, 14) +
    "-" +
    Date.now().toString(36)
  );
}

export function getAdminToken(): string | null {
  return inMemoryAdminToken;
}

export function setAdminToken(token: string | null, email: string | null = null) {
  inMemoryAdminToken = token;
  setState(() => ({
    adminAuthenticated: Boolean(token),
    adminEmail: email,
  }));
}

export function getVisitorToken(): string {
  if (cachedVisitorToken) return cachedVisitorToken;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const existing = window.localStorage.getItem(VISITOR_STORAGE_KEY);
      if (existing && existing.trim().length >= 16) {
        cachedVisitorToken = existing.trim();
        return cachedVisitorToken;
      }
      const created = generateRandomVisitorToken();
      window.localStorage.setItem(VISITOR_STORAGE_KEY, created);
      cachedVisitorToken = created;
      return created;
    }
  } catch {
    // Fallback to in-memory token if localStorage is blocked
  }
  cachedVisitorToken = generateRandomVisitorToken();
  return cachedVisitorToken;
}

export async function signInAdminWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const idToken = await result.user.getIdToken();
  setAdminToken(idToken, result.user.email ?? "Google Admin");
  return idToken;
}

export async function signOutAdmin(): Promise<void> {
  setAdminToken(null, null);
  try {
    await signOut(auth);
  } catch {
    // ignore if not signed in via Firebase
  }
}
