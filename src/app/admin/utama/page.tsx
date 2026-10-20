"use client";
import { HomeView, DesktopActions, useTodayLine } from "@/admin/home/HomeView";
import { useClock } from "@/admin/home/useHomeData";
import { usePrayerToday } from "@/admin/home/usePrayerToday";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/session";
import { AdminShell, AdminStatus } from "@/admin/shell/AdminShell";
import { useGuard } from "@/admin/shell/guard";

export default function UtamaPage() {
  const ok = useGuard({ org: true });
  const { current } = useAdmin();
  const { t } = useT();
  const now = useClock(30_000);
  const { schedule, hijri, loading } = usePrayerToday(ok ? (current?.zone ?? null) : null, now);
  const subtitle = useTodayLine(hijri, now);
  if (!ok) return <AdminStatus />;
  return (
    <AdminShell title={t("home.title")} subtitle={subtitle} actions={<DesktopActions />}>
      <HomeView now={now} schedule={schedule} loading={loading} />
    </AdminShell>
  );
}