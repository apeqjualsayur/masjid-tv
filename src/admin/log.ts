// Admin error logging: console only (no remote service), with context, and never with secrets.
// Anything that looks like a key, token, JWT or password is replaced before it is printed.

const PATTERNS: [RegExp, string][] = [
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[jwt]"], // access/refresh tokens, legacy keys
  [/\bsb_(secret|publishable)_[A-Za-z0-9_-]{8,}/g, "[supabase-key]"],
  [/\bsbp_[A-Za-z0-9]{16,}/g, "[access-token]"],
  [/\bre_[A-Za-z0-9_]{16,}/g, "[resend-key]"],
  [/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[token]"],
  [/((?:access|refresh)_token|apikey|api_key|password|secret|token_hash)(["']?\s*[:=]\s*["']?)[^\s"'&,}]+/gi, "$1$2[redacted]"],
  [/([?&]code=)[^&\s]+/g, "$1[redacted]"], // OAuth / PKCE code in a URL
  [/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi, "$1[redacted]@"],
];

export function redact(text: string): string {
  return PATTERNS.reduce((t, [re, to]) => t.replace(re, to), text);
}

function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`;
  if (err && typeof err === "object") {
    const e = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    if (e.message !== undefined) return [e.message, e.code && `code=${String(e.code)}`, e.details && `details=${String(e.details)}`, e.hint && `hint=${String(e.hint)}`].filter(Boolean).join(" ");
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

/** Context that helps debugging: where it happened, the page, and safe extra fields (no user data). */
export interface LogContext {
  where: string;
  [key: string]: string | number | boolean | null | undefined;
}

/** Logs one error with context, redacted. Returns the line printed (for tests). */
export function logError(ctx: LogContext, err: unknown): string {
  const page = typeof location !== "undefined" ? location.pathname : undefined;
  const fields = Object.entries({ ...ctx, page })
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  const line = redact(`[masjid-view/admin] ${fields} | ${describe(err)}`);
  console.error(line);
  return line;
}