"use client";
// Sign in (designs/admin/Main): Google first, email magic link as backup (PRD §4.1).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "./i18n";
import { ROUTES, routeAfterSignIn } from "./routing";
import { useAdmin } from "./session";
import { LangToggle } from "./shell/AdminShell";
import { LogoMark } from "./shell/icons";

const returnTo = () => `${window.location.origin}${ROUTES.signIn}`;

export function SignIn() {
  const a = useAdmin();
  const { t } = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (or just returned from Google / the email link): go to the right page.
  useEffect(() => {
    if (a.status === "ready") router.replace(routeAfterSignIn(a));
  }, [a, router]);

  // Errors handed back on the return URL (e.g. the link expired).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search + window.location.hash.replace(/^#/, "&"));
    const msg = q.get("error_description");
    if (msg) setError(t("signin.error", { message: msg }));
  }, [t]);

  const google = async () => {
    setError(null);
    setBusy(true);
    const { error: e } = await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: returnTo() } });
    if (e) {
      setError(t("signin.error", { message: e.message }));
      setBusy(false);
    }
  };

  const magic = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(null);
    setSent(null);
    const addr = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return setError(t("signin.emailInvalid"));
    setBusy(true);
    const { error: e } = await getSupabase().auth.signInWithOtp({ email: addr, options: { emailRedirectTo: returnTo(), shouldCreateUser: true } });
    setBusy(false);
    if (e) setError(t("signin.error", { message: e.message }));
    else setSent(t("signin.magicSent", { email: addr }));
  };

  const working = a.status === "loading" || a.status === "ready";
  const blocked = a.status === "notConfigured" || a.status === "error";
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[440px] flex-col px-6 pt-5 pb-7">
      <div className="flex justify-end">
        <LangToggle />
      </div>
      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <LogoMark size={76} />
        <h1 className="text-[30px] font-extrabold tracking-[-0.5px]">{t("app.name")}</h1>
        <p className="max-w-[290px] text-[15px] leading-normal font-medium text-adm-muted">{t("signin.tagline")}</p>
      </div>

      {blocked ? (
        <p role="alert" className="mt-14 rounded-[14px] bg-[#FDECE8] px-4 py-3 text-center text-[14px] text-adm-danger">
          {a.status === "notConfigured" ? t("app.notConfigured") : t("home.loadError", { message: a.error ?? "" })}
        </p>
      ) : working ? (
        <p role="status" className="mt-14 text-center text-[15px] text-adm-muted">
          {a.status === "ready" ? t("signin.signingIn") : t("app.loading")}
        </p>
      ) : (
        <div className="mt-14 flex flex-col gap-3.5">
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="flex h-[54px] items-center justify-center gap-3 rounded-[14px] bg-adm-ink text-[16px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-60"
          >
            <span aria-hidden="true" className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-[15px] font-extrabold text-adm-ink">
              G
            </span>
            {t("signin.google")}
          </button>
          <div className="flex items-center gap-3 text-[13px] font-semibold text-[#6A7D74]">
            <div className="h-px flex-1 bg-[#D5E1DA]" />
            {t("signin.or")}
            <div className="h-px flex-1 bg-[#D5E1DA]" />
          </div>
          <form onSubmit={magic} className="flex flex-col gap-3.5" noValidate>
            <label htmlFor="email" className="text-[13px] font-bold text-[#3A4E45]">
              {t("signin.emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("signin.emailPlaceholder")}
              className="-mt-1.5 h-[52px] rounded-[14px] border border-adm-line bg-white px-4 text-[16px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green"
            />
            <button
              type="submit"
              disabled={busy}
              className="h-[52px] rounded-[14px] border-[1.5px] border-adm-green text-[15px] font-bold text-adm-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-60"
            >
              {t("signin.magic")}
            </button>
          </form>
          <p className="text-center text-[13px] leading-normal text-adm-muted">{t("signin.magicHint")}</p>
          {sent && (
            <p role="status" className="rounded-[14px] bg-adm-soft px-4 py-3 text-center text-[14px] font-semibold text-adm-green-dark">
              {sent}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-[14px] bg-[#FDECE8] px-4 py-3 text-center text-[14px] text-adm-danger">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="mt-auto pt-10 text-center text-[13px] leading-relaxed text-adm-muted">
        {t("signin.legal")}{" "}
        <Link href={ROUTES.privacy} className="font-bold text-adm-green underline-offset-2 hover:underline">
          {t("signin.privacy")}
        </Link>
        <div className="mt-2.5">
          {t("signin.newMasjid")}{" "}
          <button type="button" onClick={google} className="min-h-11 font-bold text-adm-green underline-offset-2 hover:underline">
            {t("signin.register")}
          </button>
        </div>
      </div>
    </div>
  );
}