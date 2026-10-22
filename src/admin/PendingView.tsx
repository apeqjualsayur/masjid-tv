"use client";
// Menunggu kelulusan (designs/admin/Pending): each registration that is not active yet, setup tips, sign out.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "./i18n";
import { LOGO_FAILED_KEY } from "./register/RegisterView";
import { ROUTES, type Membership } from "./routing";
import { useAdmin } from "./session";
import { SimplePage } from "./SimplePage";
import { OrgAvatar } from "./shell/OrgAvatar";

const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)]";
const badge: Record<Membership["status"], string> = {
  pending: "bg-[#FFF1D6] text-[#8A5300]",
  rejected: "bg-[#FDECE8] text-adm-danger",
  suspended: "bg-[#FDECE8] text-adm-danger",
  active: "bg-adm-soft text-adm-green-dark",
};
const MAX_PENDING = 3;

function Illustration() {
  return (
    <svg aria-hidden="true" width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="60" fill="#E3F1EA" />
      <path d="M38 94V58a22 22 0 0 1 44 0v36Z" fill="#146C4A" />
      <circle cx="60" cy="64" r="13" fill="#FFFFFF" />
      <path d="M60 57v7l5 3" fill="none" stroke="#146C4A" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="60" cy="30" r="4" fill="#E3B04B" />
    </svg>
  );
}

export function PendingView() {
  const a = useAdmin();
  const { t } = useT();
  const router = useRouter();
  const [logoFailed, setLogoFailed] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const waiting = a.orgs.filter((o) => o.status !== "active");
  const pendingCount = waiting.filter((o) => o.status === "pending").length;

  useEffect(() => {
    if (a.orgs.some((o) => o.status === "active")) router.replace(ROUTES.home);
    else if (a.orgs.length === 0) router.replace(ROUTES.register);
  }, [a.orgs, router]);

  useEffect(() => {
    try {
      const id = sessionStorage.getItem(LOGO_FAILED_KEY);
      if (id) {
        setLogoFailed(id);
        sessionStorage.removeItem(LOGO_FAILED_KEY);
      }
    } catch {}
  }, []);

  const checkAgain = async () => {
    setChecking(true);
    await a.refresh();
    setChecking(false);
  };

  return (
    <SimplePage title={pendingCount > 0 ? t("pending.received") : t("pending.notApproved")}>
      <div className="flex flex-col items-center gap-4 text-center">
        <Illustration />
        {pendingCount > 0 && <p className="text-[15px] leading-[1.55] text-adm-muted">{t("pending.intro")}</p>}
      </div>

      {logoFailed && (
        <p role="status" className="rounded-xl bg-[#FFF4DF] px-3.5 py-3 text-[14px] leading-[1.45] text-[#6B4A12]">
          {t("pending.logoFailed")}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {waiting.map((o) => (
          <li key={o.orgId} className={`${card} flex flex-col gap-3 p-[18px]`}>
            <div className="flex items-center gap-3.5">
              <OrgAvatar org={o} size={52} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[16px] font-bold break-words">{o.fullName}</span>
                <span className="text-[13px] text-adm-muted">
                  {o.district}, {o.state} · {o.zone}
                </span>
              </div>
              <span className={`flex-none rounded-full px-2.5 py-1.5 text-[12px] font-extrabold ${badge[o.status]}`}>{t(`pending.badge.${o.status}`)}</span>
            </div>
            {o.status !== "pending" && (
              <div className="flex flex-col gap-1 border-t border-adm-hair pt-3 text-[14px]">
                <span>{o.status === "rejected" ? t("pending.rejected", { name: o.shortName }) : t("pending.suspended", { name: o.shortName })}</span>
                {o.statusReason && <span className="text-adm-muted">{t("pending.reason", { reason: o.statusReason })}</span>}
              </div>
            )}
          </li>
        ))}
      </ul>

      {pendingCount > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[14px] font-extrabold">{t("pending.tipsTitle")}</h2>
          <ol className="flex flex-col gap-3">
            {(["tip1", "tip2", "tip3"] as const).map((k, i) => (
              <li key={k} className="flex items-start gap-3 text-[14px] leading-[1.5] text-[#3A4E45]">
                <span aria-hidden="true" className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-adm-soft text-[13px] font-extrabold text-adm-green">
                  {i + 1}
                </span>
                {t(`pending.${k}`)}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={checkAgain}
          disabled={checking}
          className="h-[52px] rounded-[14px] bg-adm-green text-[15px] font-bold text-white hover:bg-adm-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green disabled:opacity-70"
        >
          {checking ? t("app.loading") : t("pending.checkAgain")}
        </button>
        {pendingCount < MAX_PENDING && (
          <Link href={ROUTES.register} className="flex min-h-11 items-center justify-center text-[14px] font-bold text-adm-green">
            {t("pending.registerAnother")}
          </Link>
        )}
      </div>
    </SimplePage>
  );
}