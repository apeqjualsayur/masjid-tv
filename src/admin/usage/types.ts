// Shape of public.platform_usage() / usage_report() (migration 0008, _specs/30-PRD-usage.md §5).
// The REPORT constant in designs/admin/D-Usage.html (= tests/fixtures/usage-report.json) is a full sample.
// Sizes are decimal bytes (1 GB = 1e9). Dates are 'YYYY-MM-DD' (Malaysian days); timestamps are ISO strings.

export type SupabasePlan = "free" | "pro";
export type ComputeSize = "nano" | "micro" | "small" | "medium" | "large";
export type ResendPlan = "free" | "pro";

export interface PlanLimits {
  db_bytes: number;
  storage_bytes: number;
  egress_bytes: number;
  cached_egress_bytes: number;
  mau: number;
  rps: number;
}

export interface ResendLimits {
  emails_month: number;
  /** null = no daily cap (Resend Pro). */
  emails_day: number | null;
}

export interface UsagePrices {
  supabase_pro_usd: number;
  compute_credit_usd: number;
  egress_usd_per_gb: number;
  cached_egress_usd_per_gb: number;
  storage_usd_per_gb: number;
  db_usd_per_gb: number;
  resend_pro_usd: number;
  /** Monthly price and guide requests/second per compute size. */
  compute: Record<ComputeSize, { usd: number; rps: number }>;
}

export interface UsageSettings {
  cycle_day: number;
  plan: SupabasePlan;
  compute: ComputeSize;
  resend_plan: ResendPlan;
  poll_seconds: number;
  http_overhead_bytes: number;
  admin_bytes_per_month?: number;
  fx_rm_per_usd: number;
  domain_rm_per_year: number;
  backup_upgrade_at: number;
  alert_warn_pct: number;
  alert_crit_pct: number;
  limits: { free: PlanLimits; pro: PlanLimits; resend_free: ResendLimits; resend_pro: ResendLimits };
  prices: UsagePrices;
  prices_checked_on: string;
  updated_at?: string;
}

export interface UsageCycle {
  start: string;
  /** Exclusive. */
  end: string;
  today: string;
  days_elapsed: number;
  days_total: number;
}

export interface UsageLive {
  db_bytes: number;
  storage_bytes: number;
  storage_objects: number;
  mau_30d: number;
  screens_total: number;
  screens_online: number;
  orgs: { pending: number; active: number; suspended: number; rejected: number };
  orgs_seen_24h: number;
}

export interface UsageCycleToDate {
  pings: number;
  full_bundles: number;
  screens_seen: number;
  orgs_seen: number;
  peak_screens_day: number;
  bundle_bytes: number;
  admin_est_bytes: number;
  egress_est_bytes: number;
  cached_est_bytes: number;
  emails_sent: number;
  emails_peak_day: number;
  emails_today: number;
  emails_synced_at: string | null;
}

export interface UsageCalibration {
  measured_on: string;
  cycle_start: string;
  egress_gb: number;
  cached_egress_gb: number | null;
  factor_egress: number | null;
  factor_cached: number | null;
}

/** One row of usage_daily (hourly snapshot), oldest first, up to 84 days. */
export interface UsageDay {
  day: string;
  db_bytes: number;
  storage_bytes: number;
  storage_objects: number;
  orgs_active: number;
  orgs_seen: number;
  screens_total: number;
  screens_seen: number;
  pings: number;
  full_bundles: number;
  bundle_bytes: number;
  mau_30d: number;
  emails: number;
}

export interface UsageReport {
  generated_at: string;
  snapshot_at: string | null;
  settings: UsageSettings;
  cycle: UsageCycle;
  live: UsageLive;
  cycle_to_date: UsageCycleToDate;
  calibration: UsageCalibration | null;
  history: UsageDay[];
  alerts_sent: { metric: string; level: "warn" | "crit"; sent_at: string }[];
}
