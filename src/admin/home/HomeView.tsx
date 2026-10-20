"use client";
// Utama (designs/admin/Home = phone, D-Home = computer). Same components; CSS decides the layout.
import Link from "next/link";
import { formatHijri, formatTime, type ScheduleState } from "@/core";
import { slideTitle, type TemplateKey } from "@/templates";
import { useT } from "../i18n";
import { ROUTES } from "../routing";
import { useAdmin } from "../session";
import { ICON, Icon } from "../shell/icons";
import { durationParts, isOnline, liveSlides, offlineFor, targetCount, type ScreenRow, type SlideRow } from "./logic";
import { useHomeData } from "./useHomeData";


const card = "rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)] lg:rounded-[20px]";

function useDuration() {
  const { t } = useT();
  /** coarse: whole hours or days only once over an hour ("Luar talian · 3 jam"). */
  return (ms: number, coarse = false) => {
    const { d, h, m } = durationParts(ms);
    if (d > 0) return t("duration.d", { d });
    if (coarse && h > 0) return t("duration.h", { h });
    if (h > 0 && m > 0) return t("duration.hm", { h, m: String(m).padStart(2, "0") });
    if (h > 0) return t("duration.h", { h });
    return t("duration.m", { m });
  };
}

function NextPrayerCard({ schedule, loading }: { schedule: ScheduleState | null; loading: boolean }) {
  const { t } = useT();
  const dur = useDuration();
  if (!schedule) {
    return <div className={`${card} p-5 text-[14px] text-adm-muted`}>{loading ? t("app.loading") : t("home.noTimes")}</div>;
  }
  const next = schedule.next;
  const nextTime = Number.isFinite(next.time) ? formatTime(next.time) : "–";
  return (
    <section aria-label={t("home.next")} className="flex flex-col gap-[18px] rounded-[20px] bg-adm-green px-5 py-[18px] text-white lg:px-[26px] lg:py-6">
      <div className="flex items-center justify-between gap-4 lg:items-end">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold opacity-85">{t("home.next")}</span>
          <span className="text-[26px] font-extrabold tracking-[-0.3px] lg:text-[34px] lg:tracking-[-0.5px]">
            {next.label} {nextTime}
          </span>
          {schedule.countdownText && <span className="text-[13px] font-semibold text-adm-gold-soft lg:hidden">{t("home.in", { duration: dur(schedule.msToNext) })}</span>}
        </div>
        <span className="text-adm-gold-soft lg:hidden">
          <Icon d={ICON.sun} size={56} strokeWidth={1.4} />
        </span>
        {schedule.countdownText && <span className="hidden text-[15px] font-bold text-adm-gold-soft lg:block">{t("home.in", { duration: dur(schedule.msToNext) })}</span>}
      </div>
      <ol className="hidden grid-cols-7 gap-2 lg:grid">
        {schedule.waktu.map((w) => {
          const cur = w.state === "current";
          return (
            <li key={w.key} className={`flex flex-col gap-0.5 rounded-xl px-3 py-2.5 ${cur ? "bg-white text-adm-green-dark" : "bg-white/10"}`}>
              <span className="text-[12px] font-bold opacity-85">{w.label}</span>
              <span className="text-[20px] font-extrabold">{Number.isFinite(w.time) ? formatTime(w.time) : "–"}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function QuickActions() {
  const { t } = useT();
  const tile = `${card} flex h-[92px] flex-col justify-center gap-2 px-4 text-adm-ink focus-visible:outline-2 focus-visible:outline-adm-green`;
  return (
    <div className="grid grid-cols-2 gap-3 lg:hidden">
      <Link href={ROUTES.picker} className={tile}>
        <span className="text-adm-green">
          <Icon d={ICON.announcement} size={26} />
        </span>
        <span className="text-[15px] font-bold">{t("home.newAnnouncement")}</span>
      </Link>
      <Link href={ROUTES.poster} className={tile}>
        <span className="text-adm-green">
          <Icon d={ICON.poster} size={26} />
        </span>
        <span className="text-[15px] font-bold">{t("home.uploadPoster")}</span>
      </Link>
    </div>
  );
}

export function DesktopActions() {
  const { t } = useT();
  return (
    <>
      <Link href={ROUTES.poster} className="flex h-11 items-center rounded-xl border-[1.5px] border-adm-green px-[18px] text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green">
        {t("home.uploadPoster")}
      </Link>
      <Link href={ROUTES.picker} className="flex h-11 items-center rounded-xl bg-adm-green px-[18px] text-[14px] font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-adm-green">
        {t("home.newAnnouncementShort")}
      </Link>
    </>
  );
}

const THUMB: Record<ScreenRow["theme"], string> = {
  alam: "linear-gradient(180deg,#F7CF6A,#E58A27)",
  serambi: "linear-gradient(180deg,#0B1114 55%,#2F7FC6 55%,#E9B36A 100%)",
  tenang: "#EAF3F8",
};

function ScreensCard({ screens, now }: { screens: ScreenRow[]; now: number }) {
  const { t } = useT();
  const { role } = useAdmin();
  const dur = useDuration();
  return (
    <section className="flex flex-col gap-2.5 lg:gap-3.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-extrabold lg:text-[17px]">{t("home.screens")}</h2>
        <Link href={ROUTES.screens} className="flex min-h-11 items-center text-[14px] font-bold text-adm-green">
          <span className="lg:hidden">{t("home.manage")}</span>
          <span className="hidden lg:inline">{role === "pentadbir" ? t("home.addScreen") : t("home.manage")}</span>
        </Link>
      </div>
      <ul className="rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)] lg:flex lg:flex-col lg:gap-3 lg:rounded-none lg:bg-transparent lg:shadow-none">
        {screens.length === 0 && <li className="p-4 text-[14px] text-adm-muted">{t("home.noScreens")}</li>}
        {screens.map((s, i) => {
          const on = isOnline(s.last_seen_at, now);
          const off = offlineFor(s.last_seen_at, now);
          const status = on ? t("home.online") : off === null ? t("home.neverSeen") : t("home.offlineFor", { duration: dur(off, true) });
          const cfg = `${t(`theme.${s.theme}`)} · ${t(`layout.${s.layout}`)}`;
          return (
            <li key={s.id} className={`flex items-center gap-3 px-4 py-3.5 lg:gap-3.5 lg:rounded-[14px] lg:bg-[#F7FAF8] lg:p-3 ${i > 0 ? "border-t border-adm-hair lg:border-t-0" : ""}`}>
              <span aria-hidden="true" className="hidden h-[68px] w-[120px] flex-none rounded-lg border-[3px] border-[#1B1B1B] lg:block" style={{ background: THUMB[s.theme] }} />
              <span aria-hidden="true" className={`h-2.5 w-2.5 flex-none rounded-full lg:hidden ${on ? "bg-[#1E9E62]" : "bg-[#C2410C]"}`} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold lg:font-extrabold">{s.name}</span>
                <span className={`hidden items-center gap-1.5 text-[13px] font-bold lg:flex ${on ? "text-adm-ok" : "text-adm-bad"}`}>
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${on ? "bg-[#1E9E62]" : "bg-[#C2410C]"}`} />
                  {status}
                </span>
                <span className="text-[13px] text-adm-muted lg:text-[12px]">{cfg}</span>
              </span>
              <span className={`text-right text-[13px] font-bold lg:hidden ${on ? "text-adm-ok" : "text-adm-bad"}`}>{status}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const CHIP: Partial<Record<TemplateKey | "poster", { code: string; bg: string; fg: string }>> = {
  kuliah: { code: "KUL", bg: "#E3F1EA", fg: "#146C4A" },
  kematian: { code: "KEM", bg: "#ECECEC", fg: "#3A3A3A" },
  infaq: { code: "INF", bg: "#FFF1D6", fg: "#8A5300" },
  poster: { code: "IMG", bg: "#E6EEF8", fg: "#1F4E8A" },
  pengumuman: { code: "PNG", bg: "#E3F1EA", fg: "#146C4A" },
  program: { code: "PRG", bg: "#E6EEF8", fg: "#1F4E8A" },
  mesyuarat: { code: "MSY", bg: "#EEE9F8", fg: "#4B3A8A" },
  imam_bilal: { code: "IMB", bg: "#E3F1EA", fg: "#146C4A" },
  kewangan: { code: "KEW", bg: "#FFF1D6", fg: "#8A5300" },
  ayat: { code: "AYT", bg: "#E3F1EA", fg: "#146C4A" },
  ucapan: { code: "UCP", bg: "#FCE8EE", fg: "#8A2347" },
};

function LiveCard({ slides, screens, now }: { slides: SlideRow[]; screens: ScreenRow[]; now: number }) {
  const { t, locale } = useT();
  const live = liveSlides(slides, now);
  const fmtDate = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
  return (
    <section className="flex flex-col gap-2.5 lg:min-h-0 lg:flex-1 lg:gap-1.5 lg:rounded-[20px] lg:bg-adm-card lg:px-[22px] lg:py-5 lg:shadow-[0_1px_3px_rgba(18,38,30,0.08)]">
      <div className="flex items-baseline justify-between lg:mb-1.5">
        <h2 className="text-[16px] font-extrabold lg:text-[17px]">{t("home.live")}</h2>
        <Link href={ROUTES.content} className="flex min-h-11 items-center text-[14px] font-bold text-adm-green">
          <span className="lg:hidden">{t("home.all")}</span>
          <span className="hidden lg:inline">{t("home.manageContent")}</span>
        </Link>
      </div>
      <ul className="rounded-[18px] bg-adm-card shadow-[0_1px_3px_rgba(18,38,30,0.08)] lg:rounded-none lg:bg-transparent lg:shadow-none">
        {live.length === 0 && <li className="p-4 text-[14px] text-adm-muted lg:px-0">{t("home.noLive")}</li>}
        {live.map((s, i) => {
          const key = (s.type === "poster" ? "poster" : s.template_key) as TemplateKey | "poster";
          const chip = CHIP[key] ?? { code: key.slice(0, 3).toUpperCase(), bg: "#E3F1EA", fg: "#146C4A" };
          const title = slideTitle(key, s.fields) || t(`template.${key}`);
          const until = s.ends_at ? t("home.until", { date: fmtDate.format(new Date(s.ends_at)) }) : t("home.ongoing");
          const extra = [s.priority ? t("home.priority") : null, t("home.seconds", { n: s.duration_s })].filter(Boolean).join(" · ");
          const target = targetCount(s, screens);
          return (
            <li key={s.id} className={`flex items-center gap-3 px-4 py-3 lg:gap-3.5 lg:px-0 ${i > 0 ? "border-t border-adm-hair" : ""} lg:border-t lg:border-[#EEF3F0]`}>
              <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-[12px] font-extrabold lg:h-10 lg:w-10 lg:rounded-[10px] lg:text-[11px]" style={{ background: chip.bg, color: chip.fg }}>
                {chip.code}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold">{title}</span>
                <span className="text-[13px] text-adm-muted">
                  {until}
                  <span className="hidden lg:inline"> · {extra}</span>
                </span>
              </span>
              <span className="hidden text-[13px] font-bold text-adm-muted lg:block">{target === "all" ? t("home.allScreens") : target === 1 ? t("home.oneScreen") : t("home.nScreens", { n: target })}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HomeView({ now, schedule, loading }: { now: number; schedule: ScheduleState | null; loading: boolean }) {
  const { current } = useAdmin();
  const { t } = useT();
  const { screens, slides, error } = useHomeData(current?.orgId ?? null);
  return (
    <>
      {error && (
        <p role="alert" className="rounded-[14px] bg-[#FDECE8] px-4 py-3 text-[14px] text-adm-danger">
          {t("home.loadError", { message: error })}
        </p>
      )}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-5 lg:gap-6">
          <NextPrayerCard schedule={schedule} loading={loading} />
          <QuickActions />
          <div className="lg:hidden">
            <ScreensCard screens={screens} now={now} />
          </div>
          <LiveCard slides={slides} screens={screens} now={now} />
        </div>
        <div className="hidden rounded-[20px] bg-adm-card px-[22px] py-5 shadow-[0_1px_3px_rgba(18,38,30,0.08)] lg:block">
          <ScreensCard screens={screens} now={now} />
        </div>
      </div>
    </>
  );
}

/** "Isnin, 19 Oktober 2026 · 7 Jamadilawal 1448H" for the computer header. */
export function useTodayLine(hijriRaw: string | null, now: number): string {
  const { locale } = useT();
  const greg = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(now));
  const hijri = hijriRaw ? formatHijri(hijriRaw) : "";
  return hijri ? `${greg} · ${hijri}` : greg;
}