"use client";
// Serambi announcement templates. program follows designs/D-Bottom, ayat designs/D-Side;
// the rest use the same chip, gold caps labels and condensed numerals.
// Kematian: no gold, no decoration (the layout also drops the arch frame for it).
import { waktuName, type DisplayState } from "@/core";
import {
  APPROVED_TRANSLATION_SOURCES,
  OCCASION_LABEL,
  formatRinggit,
  infaqProgress,
  kewanganTotals,
  type TemplateFields,
} from "@/templates";
import type { CSSProperties, ReactNode } from "react";
import type { TemplateComponents } from "../types";
import { Amiri, Caps, GoldRule, numStyle, useArea } from "./parts";
import { C, F, archRadius } from "./tokens";

type P<K extends keyof TemplateFields> = { s: DisplayState; fields: TemplateFields[K] };

/** Content column; centred inside the tall arch, left-aligned in the wide panel. */
function Col({ children, gap = 28, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  const tall = useArea() === "tall";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: tall ? "center" : "stretch",
        textAlign: tall ? "center" : "left",
        gap,
        height: "100%",
        minHeight: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Outlined gold pill above the title ("PROGRAM"). */
function Tag({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex" }}>
      <div style={{ padding: "8px 18px", borderRadius: 999, border: `2px solid ${C.gold}`, color: C.gold, fontSize: 20, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        {children}
      </div>
    </div>
  );
}

function Title({ children, size }: { children: ReactNode; size?: number }) {
  const px = size ?? (useArea() === "wide" ? 92 : 64);
  return <div style={{ fontSize: px, fontWeight: 700, letterSpacing: -2, lineHeight: 1.02 }}>{children}</div>;
}

function Body({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 30, fontWeight: 400, lineHeight: 1.45, color: C.soft }}>{children}</div>;
}

/** Gold caps label over a value, in a grid with a divider above (D-Bottom details). */
function Details({ items, cols }: { items: [string, ReactNode][]; cols?: number }) {
  const tall = useArea() === "tall";
  const n = cols ?? (tall ? 2 : Math.min(items.length, 3));
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: tall ? 24 : 32, paddingTop: 28, borderTop: `1px solid ${C.divider}`, width: "100%" }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <Caps size={19} spacing={0.18} weight={700}>
            {k}
          </Caps>
          <div style={{ fontSize: 30, fontWeight: 500 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

/** Label / amount row with a hairline above. */
function Line({ left, right, color }: { left: ReactNode; right: ReactNode; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "16px 0", borderTop: `1px solid ${C.divider}`, fontSize: 28, fontWeight: 500, width: "100%" }}>
      <div style={{ textAlign: "left" }}>{left}</div>
      <div style={{ ...numStyle, fontSize: 36, fontWeight: 600, color }}>{right}</div>
    </div>
  );
}

function Program({ fields: f }: P<"program">) {
  const tall = useArea() === "tall";
  if (tall) {
    return (
      <Col>
        <Tag>Program</Tag>
        <Title>{f.title}</Title>
        <Body>{f.description}</Body>
        <Details items={[["Tarikh", f.date], ["Masa", f.time], ["Tempat", f.venue], ["Anjuran", f.organiser]]} />
        <div style={{ fontSize: 24, color: C.muted }}>
          Hubungi <span style={{ color: C.white, fontWeight: 600 }}>{f.contact}</span>
        </div>
      </Col>
    );
  }
  // Wide: date in a small gold arch on the left, details on the right (D-Bottom).
  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px minmax(0, 1fr)", gap: 100, alignItems: "center", height: "100%" }}>
      <div
        style={{
          height: 600,
          boxSizing: "border-box",
          border: `3px solid ${C.gold}`,
          borderRadius: archRadius(420, 24),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "120px 36px 40px",
          background: "rgba(0,0,0,0.12)",
          textAlign: "center",
        }}
      >
        <Caps size={28}>Tarikh</Caps>
        <div style={{ ...numStyle, fontSize: 84, fontWeight: 600, lineHeight: 1 }}>{f.date}</div>
        <GoldRule margin="20px 0 14px" />
        <div style={{ ...numStyle, fontSize: 48, fontWeight: 500 }}>{f.time}</div>
      </div>
      <Col>
        <Tag>Program</Tag>
        <Title>{f.title}</Title>
        <Body>{f.description}</Body>
        <Details items={[["Tempat", f.venue], ["Anjuran", f.organiser], ["Hubungi", f.contact]]} />
      </Col>
    </div>
  );
}

function Ayat({ fields: f }: P<"ayat">) {
  const tall = useArea() === "tall";
  return (
    <Col gap={30} style={{ alignItems: "center", textAlign: "center" }}>
      <Caps spacing={0.3}>Ayat hari ini</Caps>
      <Amiri style={{ fontSize: tall ? 60 : 56, lineHeight: 1.9 }}>{f.arabic}</Amiri>
      <GoldRule />
      <div style={{ fontSize: 32, fontWeight: 400, lineHeight: 1.5, color: "rgba(255,255,255,0.82)", maxWidth: 1300 }}>{f.translation}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: C.gold }}>{f.reference}</div>
      <div style={{ fontSize: 19, color: C.muted }}>{APPROVED_TRANSLATION_SOURCES[f.source]}</div>
    </Col>
  );
}

function Pengumuman({ fields: f }: P<"pengumuman">) {
  return (
    <Col>
      <Tag>Pengumuman</Tag>
      <Title>{f.title}</Title>
      <Body>{f.body}</Body>
      <Details items={[["Daripada", f.issuedBy], ["Sehingga", f.validUntil]]} cols={2} />
    </Col>
  );
}

function Kuliah({ fields: f }: P<"kuliah">) {
  const tall = useArea() === "tall";
  return (
    <Col>
      <Tag>{f.series}</Tag>
      <Title>{f.topic}</Title>
      <div style={{ display: "flex", alignItems: "center", gap: 20, justifyContent: tall ? "center" : "flex-start" }}>
        {f.speakerPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.speakerPhoto} alt="" style={{ width: 96, height: 96, borderRadius: 999, objectFit: "cover", border: `2px solid ${C.gold}` }} />
        )}
        <div style={{ fontSize: 36, fontWeight: 500 }}>
          <span style={{ color: C.muted }}>Bersama </span>
          {f.speaker}
        </div>
      </div>
      <Details items={[["Tarikh", f.date], ["Masa", f.time], ["Tempat", f.venue]]} />
    </Col>
  );
}

function Kematian({ s, fields: f }: P<"kematian">) {
  const tall = useArea() === "tall";
  const row = (k: string, v: ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "18px 0", borderTop: `1px solid ${C.divider}`, fontSize: 30, width: "100%", textAlign: "left" }}>
      <span style={{ color: C.muted }}>{k}</span>
      <span style={{ textAlign: "right" }}>{v}</span>
    </div>
  );
  return (
    <Col gap={22}>
      <Caps color={C.muted} spacing={0.24}>
        Makluman kematian
      </Caps>
      {s.showArabic && <Amiri style={{ fontSize: 44, color: C.soft, lineHeight: 1.5 }}>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</Amiri>}
      <div style={{ fontSize: tall ? 60 : 76, fontWeight: 600, letterSpacing: -1, lineHeight: 1.1 }}>{f.name}</div>
      <div style={{ fontSize: 30, color: C.muted }}>
        {f.age !== undefined && <>Umur {f.age} tahun · </>}
        {f.address}
      </div>
      <div style={{ width: "100%", marginTop: 12 }}>
        {row("Solat jenazah", `${f.solatJenazah.time}, ${f.solatJenazah.place}`)}
        {row("Dikebumikan di", f.burialPlace)}
      </div>
    </Col>
  );
}

function Infaq({ fields: f }: P<"infaq">) {
  const tall = useArea() === "tall";
  const progress = infaqProgress(f);
  return (
    <Col>
      <Tag>Infaq</Tag>
      <Title>{f.fundName}</Title>
      <Body>{f.purpose}</Body>
      <div style={{ display: "flex", gap: 40, alignItems: "flex-end", width: "100%" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: tall ? "center" : "space-between", flexWrap: "wrap", columnGap: 24, alignItems: "baseline" }}>
            <span style={{ ...numStyle, fontSize: 72, fontWeight: 600, color: C.gold }}>{formatRinggit(f.collected)}</span>
            <span style={{ fontSize: 26, color: C.muted }}>
              daripada {formatRinggit(f.target)} · {Math.round(progress * 100)}%
            </span>
          </div>
          <div style={{ height: 14, borderRadius: 7, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: C.gold, borderRadius: 7 }} />
          </div>
          <div style={{ fontSize: 22, color: C.muted }}>
            {f.accountName} · Dikemas kini {f.updatedAt}
          </div>
        </div>
        {f.qrImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.qrImage} alt="Kod QR" style={{ width: 240, height: 240, background: "#FFFFFF", padding: 14, borderRadius: 18 }} />
        )}
      </div>
    </Col>
  );
}

function Mesyuarat({ fields: f }: P<"mesyuarat">) {
  return (
    <Col>
      <Tag>Mesyuarat</Tag>
      <Title>{f.title}</Title>
      <Body>{f.invitation}</Body>
      <Details items={[["Tarikh", f.date], ["Masa", f.time], ["Tempat", f.venue]]} />
      <div style={{ fontSize: 24, color: C.muted }}>
        Daripada <span style={{ color: C.white, fontWeight: 600 }}>{f.issuedBy}</span>
      </div>
    </Col>
  );
}

function ImamBilal({ s, fields: f }: P<"imam_bilal">) {
  const tall = useArea() === "tall";
  const head: CSSProperties = { paddingBottom: 10 };
  const cell: CSSProperties = { padding: tall ? "16px 0" : "12px 0", borderTop: `1px solid ${C.divider}`, textAlign: "left" };
  return (
    <Col gap={tall ? 22 : 18}>
      <Tag>Jadual imam &amp; bilal</Tag>
      <div style={{ ...numStyle, fontSize: tall ? 56 : 52, fontWeight: 600 }}>{f.weekRange}</div>
      <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr) minmax(0,1fr)", width: "100%", fontSize: 30, fontWeight: 500 }}>
        <div style={head}><Caps size={19} spacing={0.18} weight={700}>Waktu</Caps></div>
        <div style={head}><Caps size={19} spacing={0.18} weight={700}>Imam</Caps></div>
        <div style={head}><Caps size={19} spacing={0.18} weight={700}>Bilal</Caps></div>
        {f.table.map((r) => (
          <div key={r.waktu} style={{ display: "contents" }}>
            <div style={{ ...cell, color: C.muted }}>{waktuName(r.waktu, s.isFriday).label}</div>
            <div style={cell}>{r.imam}</div>
            <div style={cell}>{r.bilal}</div>
          </div>
        ))}
      </div>
    </Col>
  );
}

function Kewangan({ fields: f }: P<"kewangan">) {
  const tall = useArea() === "tall";
  const totals = kewanganTotals(f);
  const lines = [
    ...f.income.map((x) => ({ label: x.label, value: formatRinggit(x.amount) })),
    ...f.expense.map((x) => ({ label: x.label, value: `− ${formatRinggit(x.amount)}` })),
  ].slice(0, 4);
  const total = (label: string, value: string, gold?: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <Caps size={19} spacing={0.18} weight={700} color={gold ? C.gold : C.muted}>
        {label}
      </Caps>
      <div style={{ ...numStyle, fontSize: tall ? 40 : 52, fontWeight: 600, whiteSpace: "nowrap", color: gold ? C.gold : C.white }}>{value}</div>
    </div>
  );
  const summary = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24, width: "100%" }}>
      {total("Kutipan", formatRinggit(totals.income))}
      {total("Belanja", formatRinggit(totals.expense))}
      {total("Baki", formatRinggit(f.balance), true)}
    </div>
  );
  return (
    <Col gap={tall ? 22 : 20}>
      <Tag>Penyata kewangan mingguan</Tag>
      <div style={{ ...numStyle, fontSize: 52, fontWeight: 600 }}>{f.weekRange}</div>
      {summary}
      <div style={{ width: "100%" }}>
        {lines.map((l, i) => (
          <Line key={i} left={l.label} right={l.value} />
        ))}
      </div>
    </Col>
  );
}

function Ucapan({ fields: f }: P<"ucapan">) {
  return (
    <Col gap={30} style={{ alignItems: "center", textAlign: "center" }}>
      <Caps spacing={0.3}>{OCCASION_LABEL[f.occasion]}</Caps>
      <GoldRule />
      <div style={{ fontFamily: F.body, fontSize: 88, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>{f.message}</div>
      <div style={{ fontSize: 30, color: C.soft }}>{f.from}</div>
    </Col>
  );
}

export const serambiTemplates: TemplateComponents = {
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