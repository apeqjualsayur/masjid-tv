"use client";
// Garis Masa announcement templates on the cream card (designs/I-Bottom "Pengumuman am", I-Side "Penyata
// kewangan"), same structure as Falak with Garis tokens: dark pill label, Fraunces headings, Manrope body.
// Kematian: no accent colour, no decoration.
import { waktuName, type DisplayState } from "@/core";
import { APPROVED_TRANSLATION_SOURCES, OCCASION_LABEL, formatRinggit, infaqProgress, kewanganTotals, type TemplateFields } from "@/templates";
import type { CSSProperties, ReactNode } from "react";
import type { TemplateArea, TemplateComponents } from "../types";
import { Arabic, serif, useArea } from "./parts";
import { G } from "./tokens";

type P<K extends keyof TemplateFields> = { s: DisplayState; fields: TemplateFields[K]; area: TemplateArea };

const Col = ({ children, gap = 30, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) => (
  <div style={{ display: "flex", flexDirection: "column", gap, height: "100%", minHeight: 0, color: G.cardInk, ...style }}>{children}</div>
);

/** Dark pill label ("PENGUMUMAN AM"); sober = outline only, no fill (Kematian). */
function Label({ children, sober }: { children: ReactNode; sober?: boolean }) {
  return (
    <div
      style={{
        alignSelf: "flex-start",
        padding: "12px 24px",
        borderRadius: 999,
        fontSize: 21,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        background: sober ? "transparent" : G.cardInk,
        color: sober ? G.cardMuted : G.card,
        border: sober ? `2px solid ${G.cardLine}` : "none",
      }}
    >
      {children}
    </div>
  );
}

function Title({ children, size }: { children: ReactNode; size?: number }) {
  const area = useArea();
  const px = size ?? (area === "wide" ? 96 : 78);
  return <div style={{ ...serif, fontSize: px, fontWeight: 600, lineHeight: 1.05 }}>{children}</div>;
}

const Body = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.45, color: G.cardBody, maxWidth: 1400 }}>{children}</div>;

function Meta({ items }: { items: [string, ReactNode][] }) {
  return (
    <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", columnGap: 60, rowGap: 12, fontSize: 28, fontWeight: 500, color: G.cardMuted }}>
      {items.map(([k, v]) => (
        <div key={k}>
          {k} <span style={{ color: G.cardInk, fontWeight: 700 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Label over value in a box; `dark` = the highlighted box (Baki semasa in designs/G-Side). */
function Field({ label, value, dark }: { label: string; value: ReactNode; dark?: boolean }) {
  return (
    <div style={{ padding: "26px 26px", borderRadius: 27, border: dark ? "none" : `3px solid ${G.cardLine}`, background: dark ? G.cardInk : "transparent", color: dark ? G.card : G.cardInk, minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: dark ? G.boxLabel : G.cardMuted }}>{label}</div>
      <div style={{ fontSize: 40, fontWeight: dark ? 700 : 500, marginTop: 8, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function Row({ left, right, size = 32 }: { left: ReactNode; right: ReactNode; size?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "18px 0", borderTop: `1.5px solid ${G.cardLine}`, fontSize: size, fontWeight: 500, color: G.cardBody }}>
      <div>{left}</div>
      <div style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{right}</div>
    </div>
  );
}

function Pengumuman({ fields: f }: P<"pengumuman">) {
  return (
    <Col>
      <Label>Pengumuman</Label>
      <Title>{f.title}</Title>
      <Body>{f.body}</Body>
      <Meta items={[["Daripada", f.issuedBy], ["Sehingga", f.validUntil]]} />
    </Col>
  );
}

function Kewangan({ fields: f }: P<"kewangan">) {
  const wide = useArea() === "wide";
  const totals = kewanganTotals(f);
  const lines = [
    ...f.income.map((x) => ({ label: x.label, value: formatRinggit(x.amount) })),
    ...f.expense.map((x) => ({ label: x.label, value: `− ${formatRinggit(x.amount)}` })),
  ].slice(0, wide ? 3 : 5);
  return (
    <Col gap={wide ? 24 : 30}>
      <Label>Penyata kewangan</Label>
      <div style={{ ...serif, fontSize: wide ? 64 : 72, fontWeight: 600, lineHeight: 1.05 }}>{f.weekRange}</div>
      <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(3, minmax(0, 1fr)) minmax(0, 1.3fr)" : "repeat(3, minmax(0, 1fr))", gap: 24, alignItems: "start" }}>
        <Field label="Kutipan" value={formatRinggit(totals.income)} />
        <Field label="Perbelanjaan" value={formatRinggit(totals.expense)} />
        <Field label="Baki semasa" value={formatRinggit(f.balance)} dark />
        {wide && (
          <div>
            {lines.map((l, i) => (
              <Row key={i} left={l.label} right={l.value} size={28} />
            ))}
          </div>
        )}
      </div>
      {!wide && (
        <div style={{ marginTop: "auto" }}>
          {lines.map((l, i) => (
            <Row key={i} left={l.label} right={l.value} />
          ))}
        </div>
      )}
    </Col>
  );
}

function Kuliah({ fields: f }: P<"kuliah">) {
  return (
    <Col>
      <Label>{f.series}</Label>
      <Title>{f.topic}</Title>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {f.speakerPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.speakerPhoto} alt="" style={{ width: 104, height: 104, borderRadius: 999, objectFit: "cover" }} />
        )}
        <div style={{ fontSize: 40, fontWeight: 500, color: G.cardBody }}>
          Bersama <span style={{ color: G.cardInk, fontWeight: 700 }}>{f.speaker}</span>
        </div>
      </div>
      <Meta items={[["Tarikh", f.date], ["Masa", f.time], ["Tempat", f.venue]]} />
    </Col>
  );
}

function Kematian({ s, fields: f }: P<"kematian">) {
  return (
    <Col gap={26}>
      <Label sober>Makluman kematian</Label>
      {s.showArabic && <Arabic style={{ fontSize: 44, color: G.cardMuted }}>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</Arabic>}
      <div style={{ ...serif, fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>{f.name}</div>
      <div style={{ fontSize: 32, fontWeight: 500, color: G.cardMuted }}>
        {f.age !== undefined && <>Umur {f.age} tahun · </>}
        {f.address}
      </div>
      <div style={{ marginTop: "auto" }}>
        <Row left="Solat jenazah" right={`${f.solatJenazah.time}, ${f.solatJenazah.place}`} />
        <Row left="Dikebumikan di" right={f.burialPlace} />
      </div>
    </Col>
  );
}

function Program({ fields: f }: P<"program">) {
  const wide = useArea() === "wide";
  const item = (k: string, v: ReactNode) => (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: G.cardMuted }}>{k}</div>
      <div style={{ fontSize: 38, fontWeight: 600, marginTop: 6 }}>{v}</div>
    </div>
  );
  return (
    <Col>
      <Label>Program</Label>
      <Title>{f.title}</Title>
      <Body>{f.description}</Body>
      <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: `repeat(${wide ? 4 : 2}, minmax(0, 1fr))`, gap: 30 }}>
        {item("Tarikh", f.date)}
        {item("Masa", f.time)}
        {item("Tempat", f.venue)}
        {item("Penganjur", f.organiser)}
      </div>
      <div style={{ fontSize: 28, fontWeight: 500, color: G.cardMuted }}>
        Hubungi <span style={{ color: G.cardInk, fontWeight: 700 }}>{f.contact}</span>
      </div>
    </Col>
  );
}

function Infaq({ fields: f }: P<"infaq">) {
  const progress = infaqProgress(f);
  return (
    <Col>
      <Label>Infaq</Label>
      <div style={{ display: "flex", gap: 56, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, flex: 1, minWidth: 0 }}>
          <Title>{f.fundName}</Title>
          <Body>{f.purpose}</Body>
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontVariantNumeric: "tabular-nums" }}>
              <span style={{ fontSize: 52, fontWeight: 700, color: G.cardAccent }}>{formatRinggit(f.collected)}</span>
              <span style={{ fontSize: 28, fontWeight: 500, color: G.cardMuted }}>
                daripada {formatRinggit(f.target)} · {Math.round(progress * 100)}%
              </span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: G.cardLine, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress * 100}%`, background: G.cardInk }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 500, color: G.cardMuted }}>
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

function Mesyuarat({ fields: f }: P<"mesyuarat">) {
  return (
    <Col>
      <Label>Mesyuarat</Label>
      <Title>{f.title}</Title>
      <Body>{f.invitation}</Body>
      <Meta items={[["Tarikh", f.date], ["Masa", f.time], ["Tempat", f.venue], ["Daripada", f.issuedBy]]} />
    </Col>
  );
}

function ImamBilal({ s, fields: f }: P<"imam_bilal">) {
  const wide = useArea() === "wide";
  const cell: CSSProperties = { padding: wide ? "12px 0" : "20px 0", borderTop: `1.5px solid ${G.cardLine}` };
  return (
    <Col gap={0}>
      <Label>Jadual imam &amp; bilal</Label>
      <div style={{ ...serif, fontSize: wide ? 56 : 68, fontWeight: 600, marginTop: 20 }}>{f.weekRange}</div>
      <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr) minmax(0,1fr)", marginTop: "auto", fontSize: wide ? 28 : 32, fontWeight: 500 }}>
        {["Waktu", "Imam", "Bilal"].map((h) => (
          <div key={h} style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: G.cardMuted, paddingBottom: 12 }}>
            {h}
          </div>
        ))}
        {f.table.map((r) => (
          <div key={r.waktu} style={{ display: "contents" }}>
            <div style={{ ...cell, color: G.cardMuted }}>{waktuName(r.waktu, s.isFriday).label}</div>
            <div style={cell}>{r.imam}</div>
            <div style={cell}>{r.bilal}</div>
          </div>
        ))}
      </div>
    </Col>
  );
}

/** The verse itself is the content, so it shows even with showArabic off (as in the other themes). */
function Ayat({ fields: f }: P<"ayat">) {
  return (
    <Col style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }} gap={36}>
      <Arabic style={{ fontSize: 66, lineHeight: 1.7, fontWeight: 500 }}>{f.arabic}</Arabic>
      <div style={{ ...serif, fontSize: 40, fontWeight: 500, lineHeight: 1.45, color: G.cardBody, maxWidth: 1250 }}>“{f.translation}”</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: G.cardAccent }}>{f.reference}</div>
        <div style={{ fontSize: 22, fontWeight: 500, color: G.cardMuted }}>{APPROVED_TRANSLATION_SOURCES[f.source]}</div>
      </div>
    </Col>
  );
}

function Ucapan({ fields: f }: P<"ucapan">) {
  return (
    <Col style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }} gap={34}>
      <Label>{OCCASION_LABEL[f.occasion]}</Label>
      <Title size={96}>{f.message}</Title>
      <div style={{ fontSize: 32, fontWeight: 500, color: G.cardMuted }}>{f.from}</div>
    </Col>
  );
}

export const garisTemplates: TemplateComponents = {
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
