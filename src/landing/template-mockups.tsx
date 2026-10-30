// Section 10 "Templat": one small, readable mockup per announcement template, with sample content
// and a graphic (PRD §4 row 10). Plain HTML at thumbnail size (not a scaled 1920×1080 stage), so it
// shows at once without loading a theme, and the text stays legible. Colours are the Tenang theme's
// soft tints; Kematian is grey only (theme contract rule 7: no accent, no decoration).
import type { ReactNode } from "react";
import { waktuName } from "@/core";
import {
  OCCASION_LABEL,
  formatRinggit,
  infaqProgress,
  kewanganTotals,
  type TemplateKey,
} from "@/templates";
import { LANDING_SAMPLES as S, MOCK_TEXT as M } from "./template-samples";

const INK = "#14303D";
const MUTED = "#56707E";

/** The mockup box: a tinted card, 190 px tall on a phone (one column), 4:3 from the sm breakpoint with the template's accent for labels. */
function Box({
  tint,
  ink = INK,
  children,
  className = "",
}: {
  tint: string;
  ink?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`box-border flex h-[190px] flex-col sm:h-auto sm:aspect-[4/3] gap-1.5 overflow-hidden border-b border-lb-hair p-3.5 ${className}`}
      style={{ background: tint, color: ink }}
    >
      {children}
    </div>
  );
}
const Label = ({ color, children }: { color: string; children: ReactNode }) => (
  <span
    className="text-[9.5px] font-bold tracking-[0.12em] uppercase"
    style={{ color }}
  >
    {children}
  </span>
);
const Title = ({
  children,
  size = 15,
}: {
  children: ReactNode;
  size?: number;
}) => (
  <span className="leading-[1.2] font-bold" style={{ fontSize: size }}>
    {children}
  </span>
);
const Small = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={`text-[11px] leading-[1.4] ${className}`}
    style={{ color: MUTED }}
  >
    {children}
  </span>
);
/** A round badge holding a line icon (24-unit path). */
function Badge({
  d,
  bg,
  fg,
  size = 34,
}: {
  d: string;
  bg: string;
  fg: string;
  size?: number;
}) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full"
      style={{ width: size, height: size, background: bg, color: fg }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={d} />
      </svg>
    </span>
  );
}
const Bar = ({
  w,
  h = 6,
  color,
  className = "",
}: {
  w: string;
  h?: number;
  color: string;
  className?: string;
}) => (
  <span
    className={`block rounded-full ${className}`}
    style={{ width: w, height: h, background: color }}
  />
);

/** A QR-like square (decoration, not a real code): three finder squares and a fixed dot pattern. */
const QR_N = 21;
const QR_CELLS = (() => {
  const finder = (x: number, y: number) =>
    [
      [0, 0],
      [QR_N - 7, 0],
      [0, QR_N - 7],
    ].some(([fx, fy]) => {
      const dx = x - fx,
        dy = y - fy;
      if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false;
      return (
        dx === 0 ||
        dy === 0 ||
        dx === 6 ||
        dy === 6 ||
        (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
      );
    });
  const near = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > QR_N - 9 && y < 8) || (x < 8 && y > QR_N - 9);
  const cells: [number, number][] = [];
  for (let y = 0; y < QR_N; y++)
    for (let x = 0; x < QR_N; x++)
      if (near(x, y) ? finder(x, y) : (x * 7 + y * 13 + x * y) % 5 < 2)
        cells.push([x, y]);
  return cells;
})();
function Qr({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-1 -1 ${QR_N + 2} ${QR_N + 2}`}
      className="flex-none rounded-[5px] bg-white"
      shapeRendering="crispEdges"
    >
      {QR_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={INK} />
      ))}
    </svg>
  );
}

function Pengumuman() {
  const f = S.pengumuman;
  return (
    <Box tint="#EAF3F8">
      <div className="flex items-center gap-2.5">
        <Badge
          d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z M15 9a3 3 0 0 1 0 6 M18 6a7 7 0 0 1 0 12"
          bg="#23709A"
          fg="#FFFFFF"
        />
        <Label color="#23709A">Pengumuman</Label>
      </div>
      <Title>{f.title}</Title>
      <Small className="line-clamp-2">{f.body}</Small>
      <Small className="mt-auto font-semibold">
        {f.issuedBy} · {f.validUntil}
      </Small>
    </Box>
  );
}

function Kuliah() {
  const f = S.kuliah;
  return (
    <Box tint="#EEF0FA">
      <Label color="#4F58AE">{f.series}</Label>
      <Title>{f.topic}</Title>
      <div className="flex items-center gap-2">
        <Badge
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 21a8 8 0 0 1 16 0"
          bg="#D9DCF2"
          fg="#4F58AE"
          size={30}
        />
        <Small>
          {M.bersama} <b style={{ color: INK }}>{f.speaker}</b>
        </Small>
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {[f.date, f.time].map((x) => (
          <span
            key={x}
            className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold"
            style={{ color: "#4F58AE" }}
          >
            {x}
          </span>
        ))}
      </div>
    </Box>
  );
}

/** Sober: grey only, no name (bars), no decoration. */
function Kematian() {
  return (
    <Box tint="#F1F1F1" ink="#2A2A2A" className="items-start">
      <span className="rounded-full border border-[#C9C9C9] px-2 py-0.5 text-[9.5px] font-bold tracking-[0.12em] text-[#555] uppercase">
        {M.kematian}
      </span>
      <span
        lang="ar"
        dir="rtl"
        className="self-stretch text-right font-[family-name:var(--font-noto-naskh-arabic)] text-[14px] text-[#555]"
      >
        {M.istirja}
      </span>
      <Bar w="70%" h={9} color="#3A3A3A" />
      <Bar w="45%" color="#B5B5B5" />
      <span className="mt-auto text-[11px] font-semibold text-[#3A3A3A]">
        {M.jenazah}
      </span>
    </Box>
  );
}

function Program() {
  const f = S.program;
  return (
    <Box tint="#FFF4E5">
      <div className="flex items-start gap-2.5">
        <span className="flex w-[38px] flex-none flex-col overflow-hidden rounded-[7px] bg-white text-center shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          <span className="bg-[#A9612A] py-[1px] text-[9px] font-bold text-white uppercase">
            {f.date.split(" ")[0]}
          </span>
          <span className="py-0.5 text-[13px] font-bold">
            {f.time.split(" ")[0]}
          </span>
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <Label color="#A9612A">Program</Label>
          <Title size={14}>{f.title}</Title>
        </div>
      </div>
      <Small className="line-clamp-2">{f.description}</Small>
      <Small className="mt-auto font-semibold">
        {f.venue} · {f.organiser}
      </Small>
    </Box>
  );
}

function Infaq() {
  const f = S.infaq;
  const p = infaqProgress(f);
  return (
    <Box tint="#EAF6EF">
      <Label color="#1F7A55">Infaq</Label>
      <div className="flex flex-1 gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Title size={14}>{f.fundName}</Title>
          <span className="mt-auto text-[16px] font-bold text-[#1F7A55]">
            {formatRinggit(f.collected)}
          </span>
          <span className="block h-[7px] overflow-hidden rounded-full bg-white">
            <span
              className="block h-full rounded-full bg-[#1F7A55]"
              style={{ width: `${Math.round(p * 100)}%` }}
            />
          </span>
          <Small>
            {M.daripada} {formatRinggit(f.target)} · {Math.round(p * 100)}%
          </Small>
        </div>
        <Qr />
      </div>
    </Box>
  );
}

function Mesyuarat() {
  const f = S.mesyuarat;
  return (
    <Box tint="#F3EEFA">
      <div className="flex items-center gap-2.5">
        <Badge
          d="M7 3h7l5 5v13H7Z M14 3v5h5 M10 13h6 M10 17h4"
          bg="#6B4FA0"
          fg="#FFFFFF"
        />
        <Label color="#6B4FA0">Mesyuarat</Label>
      </div>
      <Title>{f.title}</Title>
      <Small>{f.invitation}</Small>
      <Small className="mt-auto font-semibold">
        {f.date} · {f.time} · {f.venue}
      </Small>
    </Box>
  );
}

function ImamBilal() {
  const f = S.imam_bilal;
  const cell = "border-t border-[#D5E3EA] py-[2px]";
  return (
    <Box tint="#EAF3F8" className="gap-1">
      <Label color="#23709A">Imam &amp; Bilal</Label>
      <div className="grid grid-cols-[1fr_1fr_1fr] text-[10.5px]">
        {[M.waktu, M.imam, M.bilal].map((h) => (
          <span
            key={h}
            className="pb-0.5 text-[9px] font-bold tracking-[0.08em] uppercase"
            style={{ color: MUTED }}
          >
            {h}
          </span>
        ))}
        {f.table.map((r) => (
          <span key={r.waktu} className="contents">
            <span className={`${cell} font-semibold`}>
              {waktuName(r.waktu, false).label}
            </span>
            <span className={cell}>{r.imam}</span>
            <span className={cell}>{r.bilal}</span>
          </span>
        ))}
      </div>
    </Box>
  );
}

function Kewangan() {
  const f = S.kewangan;
  const t = kewanganTotals(f);
  const boxes: [string, number, boolean][] = [
    [M.kutipan, t.income, false],
    [M.belanja, t.expense, false],
    [M.baki, f.balance, true],
  ];
  const bars = [0.55, 0.8, 0.45, 0.95, 0.7, 0.6, 0.85];
  return (
    <Box tint="#F8EFE6">
      <Label color="#A9612A">Penyata kewangan</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {boxes.map(([k, v, dark]) => (
          <span
            key={k}
            className="flex flex-col rounded-[7px] px-1.5 py-1"
            style={{
              background: dark ? "#3B2A1E" : "#FFFFFF",
              color: dark ? "#FFFFFF" : INK,
            }}
          >
            <span className="text-[8.5px] font-bold tracking-[0.06em] uppercase opacity-80">
              {k}
            </span>
            <span className="text-[11px] font-bold whitespace-nowrap">
              {formatRinggit(v).replace(/\.\d\d$/, "")}
            </span>
          </span>
        ))}
      </div>
      <div className="mt-auto flex h-[34px] items-end gap-[5px]">
        {bars.map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-t-[3px]"
            style={{
              height: `${h * 100}%`,
              background: i === bars.length - 1 ? "#A9612A" : "#E3CDB6",
            }}
          />
        ))}
      </div>
    </Box>
  );
}

/** The layout of a verse card, without verse text (the list awaits review). */
function Ayat() {
  return (
    <Box tint="#F3EEDF" className="items-center">
      <Badge
        d="M2 5a2 2 0 0 1 2-1h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H2Z M22 5a2 2 0 0 0-2-1h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h8Z"
        bg="#E7DDC2"
        fg="#6E5A1E"
        size={30}
      />
      <Bar w="72%" h={8} color="#6E5A1E" />
      <Bar w="56%" h={8} color="#6E5A1E" className="opacity-70" />
      <Bar w="80%" h={5} color="#C9BB92" className="mt-1" />
      <Bar w="64%" h={5} color="#C9BB92" />
      <span className="mt-auto text-[10px] font-bold tracking-[0.1em] text-[#6E5A1E] uppercase">
        {M.ayatRef}
      </span>
    </Box>
  );
}

function Ucapan() {
  const f = S.ucapan;
  return (
    <Box tint="#E9F5EC" className="items-center justify-center text-center">
      <svg aria-hidden="true" width="40" height="40" viewBox="0 0 40 40">
        <path d="M26 6a14 14 0 1 0 8 25A12 12 0 0 1 26 6Z" fill="#E3B04B" />
        <path
          d="M31 10l1.2 2.6 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4Z"
          fill="#E3B04B"
        />
      </svg>
      <Label color="#1F7A55">{OCCASION_LABEL[f.occasion]}</Label>
      <Title size={17}>{f.message}</Title>
      <Small>{f.from}</Small>
    </Box>
  );
}

const MOCKUPS: Record<TemplateKey, () => ReactNode> = {
  pengumuman: Pengumuman,
  kuliah: Kuliah,
  kematian: Kematian,
  program: Program,
  infaq: Infaq,
  mesyuarat: Mesyuarat,
  imam_bilal: ImamBilal,
  kewangan: Kewangan,
  ayat: Ayat,
  ucapan: Ucapan,
};

export function TemplateMockup({ k }: { k: TemplateKey }) {
  const M = MOCKUPS[k];
  return <M />;
}
