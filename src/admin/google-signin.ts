// Google's own sign-in button (Google Identity Services) on masjidview.my, so Google's window says
// "to continue to masjidview.my" instead of the Supabase project address. The ID token goes to
// supabase.auth.signInWithIdToken. Without NEXT_PUBLIC_GOOGLE_CLIENT_ID, or when Google's script
// cannot load, the sign-in page keeps the redirect flow (signInWithOAuth).

export const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
/** Give up on Google's script after this long and show the redirect button. */
export const GIS_TIMEOUT_MS = 5000;

export const googleClientId = (): string | null => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;

/** Google's button language: Malay or English, like the page. */
export const gisLocale = (locale: string) => (locale.startsWith("en") ? "en" : "ms");

/** Google's button is 200–400 px wide; fill the column. */
export const gisWidth = (px: number) => Math.round(Math.min(400, Math.max(200, px)));

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * A fresh nonce per sign-in: Google gets the SHA-256 hash (it ends up inside the ID token),
 * Supabase gets the raw value and checks that it hashes to the one in the token (stops replays).
 */
export async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = hex(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return { raw, hashed: hex(new Uint8Array(digest)) };
}

// The parts of google.accounts.id this page uses.
export interface GisCredentialResponse {
  credential: string;
}
export interface GisId {
  initialize(o: { client_id: string; callback: (r: GisCredentialResponse) => void; nonce: string; ux_mode?: "popup"; use_fedcm_for_button?: boolean; itp_support?: boolean }): void;
  renderButton(el: HTMLElement, o: { type: "standard"; theme: "outline" | "filled_blue" | "filled_black"; size: "large"; text: "continue_with"; shape: "rectangular" | "pill"; logo_alignment: "left" | "center"; width: number; locale: string }): void;
}
declare global {
  interface Window {
    google?: { accounts?: { id?: GisId } };
  }
}

let loading: Promise<GisId> | null = null;

/** Loads Google's script once; rejects after GIS_TIMEOUT_MS (blocked, offline). */
export function loadGis(): Promise<GisId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<GisId>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SCRIPT;
    s.async = true;
    const timer = setTimeout(() => reject(new Error("timeout")), GIS_TIMEOUT_MS);
    s.onload = () => {
      clearTimeout(timer);
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("no google.accounts.id"));
    };
    s.onerror = () => {
      clearTimeout(timer);
      reject(new Error("load failed"));
    };
    document.head.appendChild(s);
  }).catch((e) => {
    loading = null; // try again on the next visit to the page
    throw e;
  });
  return loading;
}
