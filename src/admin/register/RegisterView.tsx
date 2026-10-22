"use client";
// Daftar masjid (PRD Phase 2 §4.2, designs/admin/Register): step 1 = details, step 2 = review & submit.
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import { useT } from "../i18n";
import { notify } from "../notify";
import { ROUTES, routeAfterSignIn } from "../routing";
import { useAdmin } from "../session";
import { SimplePage } from "../SimplePage";
import { monogram } from "../shell/monogram";
import { ZonePicker } from "../ZonePicker";
import { supabaseRegisterBackend } from "./backend";
import { LIMITS, errorKeyOf, submitRegistration, validateRegistration, type FieldErrors, type LogoFile, type RegisterForm } from "./logic";
import { compressLogo } from "./logo";

export const LOGO_FAILED_KEY = "mv:logoFailed";

const fieldLabel = "text-[13px] font-bold text-[#3A4E45]";
const input = "h-[50px] w-full rounded-[14px] border bg-white px-4 text-[16px] text-adm-ink placeholder:text-[#8A9A92] focus-visible:outline-2 focus-visible:outline-adm-green";
const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";

function Field({ id, labelText, error, hint, children }: { id: string; labelText: string; error?: string; hint?: string; children: ReactNode }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={fieldLabel}>{labelText}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-[12px] text-adm-muted">{hint}</p>}
      {error && <p id={`${id}-err`} className="text-[13px] font-semibold text-adm-danger">{t(error)}</p>}
    </div>
  );
}

const empty: RegisterForm = { kind: "masjid", fullName: "", shortName: "", zone: null, address: "", phone: "" };

export function RegisterView() {
  const a = useAdmin();
  const { t } = useT();
  const router = useRouter();
  const uid = useId();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<RegisterForm>(empty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [logo, setLogo] = useState<LogoFile | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => () => {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
  }, [logoUrl]);

  const set = <K extends keyof RegisterForm>(k: K, v: RegisterForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k as keyof FieldErrors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    setLogoError(null);
    const r = await compressLogo(file);
    setLogoBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r.ok) {
      setLogoError(r.error === "type" ? "register.err.logoType" : r.error === "tooBig" ? "register.err.logoTooBig" : "register.err.logoDecode");
      return;
    }
    setLogo(r.logo);
    setLogoUrl(URL.createObjectURL(r.logo.blob));
  };
  const removeLogo = () => {
    setLogo(null);
    setLogoUrl(null);
    setLogoError(null);
  };

  const next = () => {
    const e = validateRegistration(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = (["fullName", "shortName", "zone", "address", "phone"] as const).find((k) => e[k]);
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    setStep(2);
    document.querySelector("[data-admin-scroll]")?.scrollTo?.(0, 0);
  };

  const submit = async () => {
    if (!a.session || !form.zone || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const sb = getSupabase();
      const r = await submitRegistration(supabaseRegisterBackend(sb, a.session.user.id), { ...form, zone: form.zone }, logo, () => crypto.randomUUID());
      notify("registered", r.orgId);
      try {
        if (r.logo === "failed") sessionStorage.setItem(LOGO_FAILED_KEY, r.orgId);
      } catch {}
      await a.refresh();
      router.replace(ROUTES.pending);
    } catch (e) {
      setSubmitError(errorKeyOf(e));
      setSubmitting(false);
    }
  };

  const back = step === 2 ? () => setStep(1) : a.orgs.length > 0 ? () => router.push(routeAfterSignIn(a)) : undefined;
  const mono = monogram(form.shortName, form.fullName);
  const avatar = (size: number) =>
    logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" style={{ width: size, height: size }} className="flex-none rounded-full bg-white object-contain ring-1 ring-adm-hair" />
    ) : (
      <div aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }} className="flex flex-none items-center justify-center rounded-full bg-adm-green font-extrabold text-white">
        {mono}
      </div>
    );

  return (
    <SimplePage title={t("register.title")} back={back} aside={t("register.step", { n: step })} progress={step / 2}>
      {step === 1 ? (
        <form
          ref={formRef}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          className="flex flex-col gap-[18px]"
        >
          <div className="flex flex-col gap-2">
            <span id={`${uid}-kind`} className={fieldLabel}>{t("register.kind")}</span>
            <div role="group" aria-labelledby={`${uid}-kind`} className="grid grid-cols-2 rounded-[14px] bg-[#E3ECE7] p-1">
              {(["masjid", "surau"] as const).map((k) => {
                const on = form.kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("kind", k)}
                    className={`h-11 rounded-[11px] text-[15px] focus-visible:outline-2 focus-visible:outline-adm-green ${on ? "bg-white font-bold text-adm-ink shadow-[0_1px_3px_rgba(18,38,30,0.12)]" : "font-semibold text-adm-muted"}`}
                  >
                    {t(`register.${k}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <Field id={`${uid}-fn`} labelText={t("register.fullName")} error={errors.fullName}>
            <input
              id={`${uid}-fn`}
              data-field="fullName"
              value={form.fullName}
              maxLength={LIMITS.fullNameMax}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder={t("register.fullNamePlaceholder")}
              autoComplete="organization"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? `${uid}-fn-err` : undefined}
              className={`${input} ${errors.fullName ? "border-adm-danger" : "border-adm-line"}`}
            />
          </Field>

          <Field id={`${uid}-sn`} labelText={t("register.shortName")} error={errors.shortName} hint={t("register.shortNameHint")}>
            <input
              id={`${uid}-sn`}
              data-field="shortName"
              value={form.shortName}
              maxLength={LIMITS.shortNameMax}
              onChange={(e) => set("shortName", e.target.value)}
              placeholder={t("register.shortNamePlaceholder")}
              aria-invalid={Boolean(errors.shortName)}
              aria-describedby={errors.shortName ? `${uid}-sn-err` : `${uid}-sn-hint`}
              className={`${input} ${errors.shortName ? "border-adm-danger" : "border-adm-line"}`}
            />
          </Field>

          <div data-field="zone" tabIndex={-1} className="outline-none">
            <ZonePicker value={form.zone} onChange={(z) => set("zone", z)} error={errors.zone} id={`${uid}-zone`} />
          </div>

          <Field id={`${uid}-ad`} labelText={t("register.address")} error={errors.address}>
            <textarea
              id={`${uid}-ad`}
              data-field="address"
              value={form.address}
              maxLength={LIMITS.addressMax}
              rows={3}
              onChange={(e) => set("address", e.target.value)}
              autoComplete="street-address"
              aria-invalid={Boolean(errors.address)}
              className={`w-full resize-none rounded-[14px] border bg-white px-4 py-3 text-[16px] text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green ${errors.address ? "border-adm-danger" : "border-adm-line"}`}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <span className={fieldLabel}>{t("register.logo")}</span>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onLogo(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={logoBusy}
              className="flex h-24 items-center gap-4 rounded-2xl border-[1.5px] border-dashed border-[#A9C2B5] bg-white px-[18px] text-left focus-visible:outline-2 focus-visible:outline-adm-green disabled:opacity-70"
            >
              {avatar(60)}
              <span className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">{logoBusy ? t("register.logoWorking") : logo ? t("register.logoChange") : t("register.logoAdd")}</span>
                <span className="text-[12px] leading-[1.4] text-adm-muted">{logo ? t("register.logoReady", { w: logo.width, h: logo.height }) : t("register.logoHint")}</span>
              </span>
            </button>
            {logo && (
              <button type="button" onClick={removeLogo} className="min-h-11 self-start text-[13px] font-bold text-adm-danger">
                {t("register.logoRemove")}
              </button>
            )}
            {logoError && <p role="alert" className="text-[13px] font-semibold text-adm-danger">{t(logoError)}</p>}
          </div>

          <Field id={`${uid}-ph`} labelText={t("register.phone")} error={errors.phone}>
            <input
              id={`${uid}-ph`}
              data-field="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              maxLength={LIMITS.phoneMax}
              onChange={(e) => set("phone", e.target.value)}
              placeholder={t("register.phonePlaceholder")}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${uid}-ph-err` : undefined}
              className={`${input} ${errors.phone ? "border-adm-danger" : "border-adm-line"}`}
            />
          </Field>

          {Object.values(errors).some(Boolean) && <p role="alert" className="text-[13px] font-semibold text-adm-danger">{t("register.err.fixAbove")}</p>}

          <button type="submit" className="mt-2 h-[54px] rounded-[14px] bg-adm-green text-[16px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green">
            {t("register.next")}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-1">
            <h2 className="text-[18px] font-extrabold">{t("register.reviewTitle")}</h2>
            <p className="text-[14px] leading-[1.5] text-adm-muted">{t("register.reviewIntro")}</p>
          </div>

          <div className={`${card} flex items-center gap-3.5 p-[18px]`}>
            {avatar(52)}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[16px] font-bold break-words">{form.fullName.trim()}</span>
              <span className="text-[13px] text-adm-muted">{t(`register.${form.kind}`)} · {form.shortName.trim()}</span>
            </div>
          </div>

          <dl className={`${card} flex flex-col divide-y divide-adm-hair px-[18px]`}>
            <ReviewRow term={t("register.zoneLabel")}>
              {form.zone && t("register.zoneLine", { zone: form.zone.zone, district: form.zone.district, state: form.zone.state })}
            </ReviewRow>
            <ReviewRow term={t("register.address")}>{form.address.trim() || t("register.none")}</ReviewRow>
            <ReviewRow term={t("register.phone")}>{form.phone.trim()}</ReviewRow>
            <ReviewRow term={t("register.logo")}>{logo ? t("register.logoReady", { w: logo.width, h: logo.height }) : t("register.monogram")}</ReviewRow>
          </dl>

          <button type="button" onClick={() => setStep(1)} className="min-h-11 self-start text-[14px] font-bold text-adm-green">
            {t("register.edit")}
          </button>

          {submitError && (
            <p role="alert" className="rounded-xl bg-[#FDECE8] px-3.5 py-3 text-[14px] leading-[1.45] text-adm-danger">
              {t(submitError)}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="h-[54px] rounded-[14px] bg-adm-green text-[16px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-70"
          >
            {submitting ? t("register.submitting") : t("register.submit")}
          </button>
        </div>
      )}
    </SimplePage>
  );
}

function ReviewRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3">
      <dt className="text-[12px] font-bold text-adm-muted">{term}</dt>
      <dd className="text-[15px] break-words">{children}</dd>
    </div>
  );
}