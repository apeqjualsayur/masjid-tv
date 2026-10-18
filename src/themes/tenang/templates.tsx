"use client";
// Tenang announcement templates. pengumuman follows designs/F-Bottom, kewangan designs/F-Side;
// the rest use the same type scale and tokens. Kematian: no accent colour, no decoration.
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
import { Arabic, Eyebrow, tokensOf, useArea } from "./parts";
import type { TenangTokens } from "./tokens";

type P<K extends keyof TemplateFields> = { s: DisplayState; fields: TemplateFields[K] };

const Col = ({ children, gap = 32, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) => (
  <div style={{ display: "flex", flexDirection: "column", gap, height: "100%", minHeight: 0, ...style }}>{children}</div>
);

function Title({ children, size }: { children: ReactNode; size?: number }) {
  const area = useArea();
  const px = size ?? (area === "wide" ? 92 : 72);
  return <div style={{ fontSize: px, fontWeight: 600, letterSpacing: -px / 30, lineHeight: 1.04 }}>{children}</div>;
}

function Body({ t, children }: { t: TenangTokens; children: ReactNode }) {
  return <div style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.5, color: t.muted, maxWidth: 1300 }}>{children}</div>;
}

/** Footer row: "Daripada [AJK]   Sehingga [Tarikh]". */
function Meta({ t, items }: { t: TenangTokens; items: [string, ReactNode][] }) {
  return (
    <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", columnGap: 64, rowGap: 12, fontSize: 24, fontWeight: 500, color: t.muted }}>
      {items.map(([k, v]) => (
        <div key={k}>
          {k} <span style={{ color: t.fg, fontWeight: 600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Label above value, for detail grids. */
function Field({ t, label, value, accent }: { t: TenangTokens; label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: accent ? 600 : 500, color: accent ? t.accent : t.muted }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: accent ? 600 : 500, letterSpacing: -1, color: accent ? t.accent : t.fg }}>{value}</div>
    </div>
  );
}

function Row({ t, left, right, size = 28 }: { t: TenangTokens; left: ReactNode; right: ReactNode; size?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "22px 0", borderTop: `1px solid ${t.rule}`, fontSize: size, fontWeight: 500 }}>
      <div>{left}</div>
      <div style={{ fontVariantNumeric: "tabular-nums" }}>{right}</div>
    </div>
  );
}

function Pengumuman({ s, fields: f }: P<"pengumuman">) {
  const t = tokensOf(s);
  return (
    <Col>
      <Eyebrow t={t}>Pengumuman</Eyebrow>
      <Title>{f.title}</Title>
      <Body t={t}>{f.body}</Body>
      <Meta t={t} items={[["Daripada", f.issuedBy], ["Sehingga", f.validUntil]]} />
    </Col>
  );
}

function Kewangan({ s, fields: f }: P<"kewangan">) {
  const t = tokensOf(s);
  const wide = useArea() === "wide";
  const totals = kewanganTotals(f);
  const lines = [
    ...f.income.map((x) => ({ label: x.label, value: formatRinggit(x.amount) })),
    ...f.expense.map((x) => ({ label: x.label, value: `− ${formatRinggit(x.amount)}` })),
  ].slice(0, wide ? 4 : 6);
  const summary = (
    <div style={{ display: "grid", gridTemplateColumns: wide ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: wide ? 28 : 40 }}>
      <Field t={t} label="Kutipan" value={formatRinggit(totals.income)} />
      <Field t={t} label="Perbelanjaan" value={formatRinggit(totals.expense)} />
      <Field t={t} label="Baki semasa" value={formatRinggit(f.balance)} accent />
    </div>
  );
  const list = (
    <div style={{ display: "flex", flexDirection: "column", marginTop: wide ? 0 : "auto" }}>
      {lines.map((l, i) => (
        <Row key={i} t={t} left={l.label} right={l.value} />
      ))}
    </div>
  );
  return (
    <Col gap={0}>
      <Eyebrow t={t}>Penyata kewangan mingguan</Eyebrow>
      <div style={{ fontSize: wide ? 56 : 64, fontWeight: 600, letterSpacing: -2, marginTop: 18 }}>{f.weekRange}</div>
      {wide ? (
        <div style={{ display: "grid", gridTemplateColumns: "460px minmax(0, 1fr)", gap: 80, marginTop: 48, alignItems: "start" }}>
          {summary}
          {list}
        </div>
      ) : (
        <>
          <div style={{ marginTop: 64 }}>{summary}</div>
          {list}
        </>
      )}
    </Col>
  );
}

function Kuliah({ s, fields: f }: P<"kuliah">) {
  const t = tokensOf(s);
  return (
    <Col>
      <Eyebrow t={t}>{f.series}</Eyebrow>
      <Title>{f.topic}</Title>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {f.speakerPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.speakerPhoto} alt="" style={{ width: 96, height: 96, borderRadius: 999, objectFit: "cover" }} />
        )}
        <div style={{ fontSize: 40, fontWeight: 500 }}>
          <span style={{ color: t.muted }}>Bersama </span>
          {f.speaker}
        </div>
      </div>
      <Meta t={t} items={[["Tarikh", f.date], ["Masa", f.time], ["Tempat", f.venue]]} />
    </Col>
  );
}

function Kematian({ s, fields: f }: P<"kematian">) {
  const t = tokensOf(s);
  const plain = { fontSize: 32, fontWeight: 500, color: t.muted } as const;
  return (
    <Col gap={28}>
      <Eyebrow t={t} sober>
        Makluman kematian
      </Eyebrow>
      {s.showArabic && <Arabic style={{ fontSize: 40, color: t.muted }}>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</Arabic>}
      <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2, lineHeight: 1.1 }}>{f.name}</div>
      <div style={plain}>
        {f.age !== undefined && <>Umur {f.age} tahun · </>}
        {f.address}
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
        <Row t={t} left="Solat jenazah" right={`${f.solatJenazah.time}, ${f.solatJenazah.place}`} size={30} />
        <Row t={t} left="Dikebumikan di" right={f.burialPlace} size={30} />
      </div>
    </Col>
  );
}

function Program({ s, fields: f }: P<"program">) {
  const t = tokensOf(s);
  const wide = useArea() === "wide";
  return (
    <Col>
      <Eyebrow t={t}>Program</Eyebrow>
      <Title>{f.title}</Title>
      <Body t={t}>{f.description}</Body>
      <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: `repeat(${wide ? 4 : 2}, minmax(0, 1fr))`, gap: 32 }}>
        <Field t={t} label="Tarikh" value={f.date} />
        <Field t={t} label="Masa" value={f.time} />
        <Field t={t} label="Tempat" value={f.venue} />
        <Field t={t} label="Penganjur" value={f.organiser} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color: t.muted }}>
        Hubungi <span style={{ color: t.fg, fontWeight: 600 }}>{f.contact}</span>
      </div>
    </Col>
  );
}

function Infaq({ s, fields: f }: P<"infaq">) {
  const t = tokensOf(s);
  const progress = infaqProgress(f);
  return (
    <Col>
      <Eyebrow t={t}>Infaq</Eyebrow>
      <div style={{ display: "flex", gap: 56, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1, minWidth: 0 }}>
          <Title>{f.fundName}</Title>
          <Body t={t}>{f.purpose}</Body>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontVariantNumeric: "tabular-nums" }}>
              <span style={{ fontSize: 48, fontWeight: 600, color: t.accent }}>{formatRinggit(f.collected)}</span>
              <span style={{ fontSize: 26, fontWeight: 500, color: t.muted }}>
                daripada {formatRinggit(f.target)} · {Math.round(progress * 100)}%
              </span>
            </div>
            <div style={{ position: "relative", height: 4, borderRadius: 2, background: t.rule }}>
              <div style={{ position: "absolute", left: 0, top: -2, height: 8, borderRadius: 4, width: `${progress * 100}%`, background: t.accent }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color: t.muted }}>
              {f.accountName} · Dikemas kini {f.updatedAt}
            </div>
          </div>
        </div>
        {f.qrImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.qrImage} alt="Kod QR" style={{ width: 300, height: 300, alignSelf: "flex-end", background: "#FFFFFF", padding: 16, borderRadius: 24 }} />
        )}
      </div>
    </Col>
  );
}

function Mesyuarat({ s, fields: f }: P<"mesyuarat">) {
  const t = tokensOf(s);
  return (
    <Col>
      <Eyebrow t={t}>Mesyuarat</Eyebrow>
      <Title>{f.title}</Title>
      <Body t={t}>{f.invitation}</Body>
      <Meta t={t} items={[["Tarikh", f.date], ["Masa", f.time], ["Tempat", f.venue], ["Daripada", f.issuedBy]]} />
    </Col>
  );
}

function ImamBilal({ s, fields: f }: P<"imam_bilal">) {
  const t = tokensOf(s);
  const wide = useArea() === "wide";
  const cell: CSSProperties = { padding: wide ? "14px 0" : "22px 0", borderTop: `1px solid ${t.rule}` };
  return (
    <Col gap={0}>
      <Eyebrow t={t}>Jadual imam &amp; bilal</Eyebrow>
      <div style={{ fontSize: wide ? 48 : 64, fontWeight: 600, letterSpacing: -2, marginTop: 18 }}>{f.weekRange}</div>
      <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr) minmax(0,1fr)", marginTop: "auto", fontSize: wide ? 28 : 32, fontWeight: 500 }}>
        <div style={{ fontSize: 22, color: t.muted, paddingBottom: 12 }}>Waktu</div>
        <div style={{ fontSize: 22, color: t.muted, paddingBottom: 12 }}>Imam</div>
        <div style={{ fontSize: 22, color: t.muted, paddingBottom: 12 }}>Bilal</div>
        {f.table.map((r) => (
          <div key={r.waktu} style={{ display: "contents" }}>
            <div style={{ ...cell, color: t.muted }}>{waktuName(r.waktu, s.isFriday).label}</div>
            <div style={cell}>{r.imam}</div>
            <div style={cell}>{r.bilal}</div>
          </div>
        ))}
      </div>
    </Col>
  );
}

function Ayat({ s, fields: f }: P<"ayat">) {
  const t = tokensOf(s);
  return (
    <Col style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }} gap={40}>
      <Arabic style={{ fontSize: 64, lineHeight: 1.7, fontWeight: 500 }}>{f.arabic}</Arabic>
      <div style={{ fontSize: 38, fontWeight: 500, lineHeight: 1.5, color: t.muted, maxWidth: 1200 }}>“{f.translation}”</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <Eyebrow t={t}>{f.reference}</Eyebrow>
        <div style={{ fontSize: 20, fontWeight: 500, color: t.muted }}>{APPROVED_TRANSLATION_SOURCES[f.source]}</div>
      </div>
    </Col>
  );
}

function Ucapan({ s, fields: f }: P<"ucapan">) {
  const t = tokensOf(s);
  return (
    <Col style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }} gap={36}>
      <Eyebrow t={t}>{OCCASION_LABEL[f.occasion]}</Eyebrow>
      <Title size={96}>{f.message}</Title>
      <div style={{ fontSize: 30, fontWeight: 500, color: t.muted }}>{f.from}</div>
    </Col>
  );
}

export const tenangTemplates: TemplateComponents = {
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