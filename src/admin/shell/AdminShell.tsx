"use client";
// Admin layout (PRD Phase 2 §5.1). One tree, CSS breakpoints:
//   < 1024 px: header (masjid + account button) + bottom nav; content max 640 px centred.
//   ≥ 1024 px: 248 px left sidebar (logo, masjid switcher, nav incl. Ahli, user, BM/EN, sign out).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useT, type Lang } from "../i18n";
import { ROUTES, type AdminRoute, type Membership } from "../routing";
import { useAdmin } from "../session";
import { Dialog } from "./Dialog";
import { ICON, Icon, LogoMark } from "./icons";
import { OrgAvatar } from "./OrgAvatar";

interface NavItem {
  key: "home" | "content" | "screens" | "settings" | "members" | "platform";
  route: AdminRoute;
  icon: string;
  /** shown in the phone bottom nav */
  phone: boolean;
}

function navItems(role: Membership["role"] | null, isPlatformAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { key: "home", route: ROUTES.home, icon: ICON.home, phone: true },
    { key: "content", route: ROUTES.content, icon: ICON.content, phone: true },
    { key: "screens", route: ROUTES.screens, icon: ICON.screens, phone: true },
  ];
  if (role) {
    items.push({ key: "settings", route: ROUTES.settings, icon: ICON.settings, phone: true });
    items.push({ key: "members", route: ROUTES.members, icon: ICON.members, phone: false });
  }
  if (isPlatformAdmin) items.push({ key: "platform", route: ROUTES.platform, icon: ICON.platform, phone: false });
  return items;
}

const isCurrent = (path: string | null, route: string) => (path ?? "").replace(/\/?$/, "/") === route;

export function LangToggle({ compact }: { compact?: boolean }) {
  const { lang, setLang, t } = useT();
  const btn = (l: Lang) => (
    <button
      key={l}
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      className={`${compact ? "h-9 px-3 text-[12px]" : "h-[38px] px-4 text-[13px]"} min-w-11 rounded-full font-bold focus-visible:outline-2 focus-visible:outline-adm-green ${lang === l ? "bg-white text-adm-ink shadow-sm" : "text-adm-muted"}`}
    >
      {t(`lang.${l}`)}
    </button>
  );
  return (
    <div role="group" aria-label={t("lang.label")} className="flex rounded-full bg-[#E3ECE7] p-[3px]">
      {btn("ms")}
      {btn("en")}
    </div>
  );
}

function OrgLine({ org }: { org: Membership }) {
  const { t } = useT();
  return (
    <span className="text-[13px] text-adm-muted">
      {t(`role.${org.role}`)} · {org.zone}
    </span>
  );
}

/** Phone/tablet account sheet: user, language, platform, sign out. */
function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const a = useAdmin();
  const { t } = useT();
  const router = useRouter();
  return (
    <Dialog open={open} onClose={onClose} title={t("account.menu")}>
      <div className="flex flex-col gap-5">
        <div className="text-[14px] font-bold">{a.displayName ?? a.email}</div>
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold">{t("lang.label")}</span>
          <LangToggle />
        </div>
        {a.isPlatformAdmin && (
          <Link href={ROUTES.platform} onClick={onClose} className="flex h-12 items-center rounded-[14px] border border-adm-line px-4 text-[15px] font-bold">
            {t("nav.platform")}
          </Link>
        )}
        <button
          type="button"
          onClick={async () => {
            onClose();
            await a.signOut();
            router.replace(ROUTES.signIn);
          }}
          className="h-12 rounded-[14px] border border-[#E8C9C1] text-[15px] font-bold text-adm-danger focus-visible:outline-2 focus-visible:outline-adm-green"
        >
          {t("account.signOut")}
        </button>
      </div>
    </Dialog>
  );
}

function Sidebar({ items, path }: { items: NavItem[]; path: string | null }) {
  const a = useAdmin();
  const { t } = useT();
  const router = useRouter();
  const org = a.current;
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[248px] flex-col gap-[22px] border-r border-[#DCE6E1] bg-white px-4 py-6 lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <LogoMark size={34} />
        <span className="text-[18px] font-extrabold">{t("app.name")}</span>
      </div>
      {org && (
        <div aria-label={t("account.currentOrg")} className="flex items-center gap-2.5 rounded-[14px] border border-[#DCE6E1] bg-[#F7FAF8] p-2.5">
          <OrgAvatar org={org} size={36} />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[14px] font-extrabold">{org.fullName}</span>
            <span className="truncate text-[12px] text-adm-muted">
              {t(`role.${org.role}`)} · {org.zone}
            </span>
          </span>
        </div>
      )}
      <nav aria-label={t("nav.main")} className="flex flex-col gap-1">
        {items.map((n) => {
          const cur = isCurrent(path, n.route);
          return (
            <Link
              key={n.key}
              href={n.route}
              aria-current={cur ? "page" : undefined}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] focus-visible:outline-2 focus-visible:outline-adm-green ${cur ? "bg-adm-soft font-extrabold text-adm-green-dark" : "font-semibold text-[#3A4E45] hover:bg-adm-ground"}`}
            >
              <Icon d={n.icon} size={20} />
              {t(`nav.${n.key}`)}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2.5 border-t border-adm-hair p-3">
        <div className="truncate text-[13px] font-bold">{a.displayName ?? a.email}</div>
        <div className="flex items-center justify-between gap-2">
          <LangToggle compact />
          <button
            type="button"
            onClick={async () => {
              await a.signOut();
              router.replace(ROUTES.signIn);
            }}
            className="h-11 px-1 text-[13px] font-bold text-adm-danger focus-visible:outline-2 focus-visible:outline-adm-green"
          >
            {t("account.signOut")}
          </button>
        </div>
      </div>
    </aside>
  );
}

function PhoneHeader({ onAccount }: { onAccount: () => void }) {
  const a = useAdmin();
  const { t } = useT();
  const org = a.current;
  return (
    <header className="mx-auto flex w-full max-w-[640px] items-center gap-3 px-5 pt-[18px] lg:hidden">
      {org ? <OrgAvatar org={org} size={46} /> : <LogoMark size={46} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[17px] font-extrabold">{org?.fullName ?? t("app.name")}</span>
        {org && <OrgLine org={org} />}
      </div>
      <button
        type="button"
        onClick={onAccount}
        aria-label={t("account.menu")}
        aria-haspopup="dialog"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white text-adm-ink shadow-[0_1px_3px_rgba(18,38,30,0.12)] focus-visible:outline-2 focus-visible:outline-adm-green"
      >
        <Icon d={ICON.user} size={22} />
      </button>
    </header>
  );
}

function BottomNav({ items, path }: { items: NavItem[]; path: string | null }) {
  const { t } = useT();
  const phoneItems = items.filter((n) => n.phone);
  return (
    <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DCE6E1] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto grid h-[78px] max-w-[640px]" style={{ gridTemplateColumns: `repeat(${phoneItems.length}, minmax(0, 1fr))` }}>
        {phoneItems.map((n) => {
          const cur = isCurrent(path, n.route);
          return (
            <Link
              key={n.key}
              href={n.route}
              aria-current={cur ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[12px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-adm-green ${cur ? "font-extrabold text-adm-green" : "font-semibold text-adm-muted"}`}
            >
              <Icon d={n.icon} size={24} />
              {t(`nav.${n.key}`)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Page frame. `title`/`subtitle`/`actions` form the computer header row; phone shows them inline. */
export function AdminShell({ children, title, subtitle, actions }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode }) {
  const a = useAdmin();
  const path = usePathname();
  const [account, setAccount] = useState(false);
  const items = navItems(a.role, a.isPlatformAdmin);
  return (
    <div className="min-h-full">
      <Sidebar items={items} path={path} />
      <div className="lg:pl-[248px]">
        <PhoneHeader onAccount={() => setAccount(true)} />
        <main className="mx-auto flex w-full max-w-[640px] flex-col gap-5 px-5 pt-5 pb-[110px] lg:max-w-none lg:gap-6 lg:px-10 lg:py-8">
          {(title || actions) && (
            <div className="hidden items-center justify-between gap-4 lg:flex">
              <div className="flex flex-col gap-0.5">
                {title && <h1 className="text-[28px] font-extrabold tracking-[-0.4px]">{title}</h1>}
                {subtitle && <p className="text-[14px] text-adm-muted">{subtitle}</p>}
              </div>
              {actions && <div className="flex gap-2.5">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
      <BottomNav items={items} path={path} />
      <AccountSheet open={account} onClose={() => setAccount(false)} />
    </div>
  );
}

/** Full-page message while loading, or when the app is not configured / failed. */
export function AdminStatus() {
  const a = useAdmin();
  const { t } = useT();
  const msg = a.status === "notConfigured" ? t("app.notConfigured") : a.status === "error" ? t("home.loadError", { message: a.error ?? "" }) : t("app.loading");
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <LogoMark size={56} />
      <p role={a.status === "error" ? "alert" : "status"} className="max-w-[320px] text-[15px] text-adm-muted">
        {msg}
      </p>
    </div>
  );
}