"use client";
// Alam announcement templates, drawn on the light card. kuliah follows designs/A-Bottom;
// the rest use the same tag, title and icon tiles. Kematian: no green, no icons, no decoration.
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
import { Arabic, Icon, num, useArea } from "./parts";
import { A } from "./tokens";

type P<K extends keyof TemplateFields> = { s: DisplayState; fields: TemplateFields[K] };

const ICON = {
  calendar: "M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2",
  pin: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M4 21a8 8 0 0 1 16 0",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  people: "M9 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M3 20a6 6 0 0 1 12 0 M16 4a3 3 0 0 1 0 6 M18 20a6 6 0 0 0-3-5.2",
};

function Col({ children, gap = 28, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap, height: "100%", minHeight: 0, ...style }}>{children}</div>;
}

function Tag({ children, sober }: { children: ReactNode; sober?: boolean }) {
  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          padding: "10px 20px",
          borderRadius: 999,
          background: sober ? "transparent" : A.green,
          border: sober ? `2px solid ${A.cardLine}` : "none",
          color: sober ? A.cardMuted : A.white,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Title({ children, size }: { children: ReactNode; size?: number }) {
  const px = size ?? (useArea() === "wide" ? 84 : 72);
  return <div style={{ fontSize: px, fontWeight: 800, lineHeight: 1.02, letterSpacing: -px / 34 }}>{children}</div>;
}

function Body({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 32, fontWeight: 500, lineHeight: 1.45, color: A.cardMuted }}>{children}</div>;
}

const Divider = () => <div style={{ height: 2, background: A.cardLine, width: "100%", flex: "none" }} />;

/** Icon tile + caps label + value (A-Bottom). */
function Info({ icon, label, value }: { icon: keyof typeof ICON; label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", minWidth: 0 }}>
      <div style={{ width: 56, height: 56, flex: "none", borderRadius: 16, background: A.tile, display: "flex", alignItems: "center", justifyContent: "center", color: A.green }}>
        <Icon d={ICON[icon]} size={28} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.08em", color: A.cardMuted, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  );
}

function InfoGrid({ children, cols }: { children: ReactNode; cols?: number }) {
  const n = cols ?? (useArea() === "wide" ? 3 : 2);
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, gap: 28 }}>{children}</div>;
}

function Kuliah({ fields: f }: P<"kuliah">) {
  const wide = useArea() === "wide";
  const content = (
    <Col>
      <Tag>{f.series}</Tag>
      <Title>{f.topic}</Title>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 500, color: A.cardMuted }}>bersama</div>
        <div style={{ fontSize: 42, fontWeight: 700 }}>{f.speaker}</div>
      </div>
      <Divider />
      <InfoGrid>
        <Info icon="calendar" label="Tarikh" value={f.date} />
        <Info icon="clock" label="Masa" value={f.time} />
        <Info icon="pin" label="Tempat" value={f.venue} />
      </InfoGrid>
    </Col>
  );
  if (!f.speakerPhoto) return content;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `minmax(0, 1fr) ${wide ? 440 : 340}px`, gap: wide ? 72 : 48, height: "100%" }}>
      {content}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.speakerPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 28 }} />
    </div>
  );
}

function Pengumuman({ fields: f }: P<"pengumuman">) {
  return (
    <Col>
      <Tag>Pengumuman</Tag>
      <Title>{f.title}</Title>
      <Body>{f.body}</Body>
      <Divider />
      <InfoGrid cols={2}>
        <Info icon="people" label="Daripada" value={f.issuedBy} />
        <Info icon="calendar" label="Sehingga" value={f.validUntil} />
      </InfoGrid>
    </Col>
  );
}

function Program({ fields: f }: P<"program">) {
  return (
    <Col gap={24}>
      <Tag>Program</Tag>
      <Title>{f.title}</Title>
      <Body>{f.description}</Body>
      <Divider />
      <InfoGrid>
        <Info icon="calendar" label="Tarikh" value={f.date} />
        <Info icon="clock" label="Masa" value={f.time} />
        <Info icon="pin" label="Tempat" value={f.venue} />
        <Info icon="people" label="Penganjur" value={f.organiser} />
        <Info icon="phone" label="Hubungi" value={f.contact} />
      </InfoGrid>
    </Col>
  );
}

function Mesyuarat({ fields: f }: P<"mesyuarat">) {
  return (
    <Col>
      <Tag>Mesyuarat</Tag>
      <Title>{f.title}</Title>
      <Body>{f.invitation}</Body>
      <Divider />
      <InfoGrid>
        <Info icon="calendar" label="Tarikh" value={f.date} />
        <Info icon="clock" label="Masa" value={f.time} />
        <Info icon="pin" label="Tempat" value={f.venue} />
      </InfoGrid>
      <div style={{ fontSize: 24, fontWeight: 500, color: A.cardMuted }}>
        Daripada <b style={{ color: A.cardFg }}>{f.issuedBy}</b>
      </div>
    </Col>
  );
}

function Infaq({ fields: f }: P<"infaq">) {
  const progress = infaqProgress(f);
  return (
    <Col>
      <Tag>Infaq</Tag>
      <div style={{ display: "flex", gap: 48, alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          <Title>{f.fundName}</Title>
          <Body>{f.purpose}</Body>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 16 }}>
            <span style={{ ...num, fontSize: 64, fontWeight: 800, color: A.green, letterSpacing: -1.5 }}>{formatRinggit(f.collected)}</span>
            <span style={{ fontSize: 26, fontWeight: 600, color: A.cardMuted }}>
              daripada {formatRinggit(f.target)} · {Math.round(progress * 100)}%
            </span>
          </div>
          <div style={{ height: 16, borderRadius: 8, background: A.cardLine, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, borderRadius: 8, background: A.green }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 500, color: A.cardMuted }}>
            {f.accountName} · Dikemas kini {f.updatedAt}
          </div>
        </div>
        {f.qrImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.qrImage} alt="Kod QR" style={{ width: 260, height: 260, background: A.white, padding: 14, borderRadius: 20, border: `2px solid ${A.cardLine}` }} />
        )}
      </div>
    </Col>
  );
}

function ImamBilal({ s, fields: f }: P<"imam_bilal">) {
  const wide = useArea() === "wide";
  const cell: CSSProperties = { padding: wide ? "12px 0" : "18px 0", borderTop: `2px solid ${A.cardLine}`, fontSize: 30, fontWeight: 600 };
  const head: CSSProperties = { fontSize: 17, fontWeight: 700, letterSpacing: "0.08em", color: A.cardMuted, paddingBottom: 10 };
  return (
    <Col gap={wide ? 20 : 28}>
      <Tag>Jadual imam &amp; bilal</Tag>
      <div style={{ fontSize: wide ? 48 : 56, fontWeight: 800, letterSpacing: -1.5 }}>{f.weekRange}</div>
      <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr) minmax(0,1fr)" }}>
        <div style={head}>WAKTU</div>
        <div style={head}>IMAM</div>
        <div style={head}>BILAL</div>
        {f.table.map((r) => (
          <div key={r.waktu} style={{ display: "contents" }}>
            <div style={{ ...cell, color: A.green, fontWeight: 800 }}>{waktuName(r.waktu, s.isFriday).label}</div>
            <div style={cell}>{r.imam}</div>
            <div style={cell}>{r.bilal}</div>
          </div>
        ))}
      </div>
    </Col>
  );
}

function Kewangan({ fields: f }: P<"kewangan">) {
  const wide = useArea() === "wide";
  const totals = kewanganTotals(f);
  const lines = [
    ...f.income.map((x) => ({ label: x.label, value: formatRinggit(x.amount) })),
    ...f.expense.map((x) => ({ label: x.label, value: `− ${formatRinggit(x.amount)}` })),
  ].slice(0, 4);
  const stat = (label: string, value: string, strong?: boolean) => (
    <div style={{ borderRadius: 20, padding: "18px 22px", background: strong ? A.green : A.tile, color: strong ? A.white : A.cardFg, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.08em", opacity: strong ? 0.9 : 1, color: strong ? A.white : A.cardMuted }}>{label}</div>
      <div style={{ ...num, fontSize: wide ? 44 : 38, fontWeight: 800, letterSpacing: -1, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
  const summary = (
    <div style={{ display: "grid", gridTemplateColumns: wide ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 16 }}>
      {stat("KUTIPAN", formatRinggit(totals.income))}
      {stat("PERBELANJAAN", formatRinggit(totals.expense))}
      {stat("BAKI SEMASA", formatRinggit(f.balance), true)}
    </div>
  );
  const list = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: `2px solid ${A.cardLine}`, fontSize: 28, fontWeight: 600 }}>
          <span>{l.label}</span>
          <span style={{ ...num, fontWeight: 800 }}>{l.value}</span>
        </div>
      ))}
    </div>
  );
  return (
    <Col gap={wide ? 20 : 28}>
      <Tag>Penyata kewangan mingguan</Tag>
      <div style={{ fontSize: wide ? 48 : 56, fontWeight: 800, letterSpacing: -1.5 }}>{f.weekRange}</div>
      {wide ? (
        <div style={{ display: "grid", gridTemplateColumns: "440px minmax(0, 1fr)", gap: 56, alignItems: "start" }}>
          {summary}
          {list}
        </div>
      ) : (
        <>
          {summary}
          {list}
        </>
      )}
    </Col>
  );
}

function Ayat({ fields: f }: P<"ayat">) {
  return (
    <Col gap={32} style={{ alignItems: "center", textAlign: "center" }}>
      <Tag>Ayat hari ini</Tag>
      <Arabic style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.7 }}>{f.arabic}</Arabic>
      <div style={{ width: 80, height: 3, borderRadius: 2, background: A.green }} />
      <div style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.5, color: A.cardMuted, maxWidth: 1300 }}>{f.translation}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: A.green }}>{f.reference}</div>
      <div style={{ fontSize: 19, fontWeight: 500, color: A.cardMuted }}>{APPROVED_TRANSLATION_SOURCES[f.source]}</div>
    </Col>
  );
}

function Ucapan({ fields: f }: P<"ucapan">) {
  return (
    <Col gap={32} style={{ alignItems: "center", textAlign: "center" }}>
      <Tag>{OCCASION_LABEL[f.occasion]}</Tag>
      <Title size={100}>{f.message}</Title>
      <div style={{ fontSize: 30, fontWeight: 600, color: A.cardMuted }}>{f.from}</div>
    </Col>
  );
}

function Kematian({ s, fields: f }: P<"kematian">) {
  const row = (k: string, v: ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "18px 0", borderTop: `2px solid ${A.cardLine}`, fontSize: 30, fontWeight: 600 }}>
      <span style={{ color: A.cardMuted, fontWeight: 500 }}>{k}</span>
      <span style={{ textAlign: "right" }}>{v}</span>
    </div>
  );
  return (
    <Col gap={22}>
      <Tag sober>Makluman kematian</Tag>
      {s.showArabic && <Arabic style={{ fontSize: 44, color: A.cardMuted, lineHeight: 1.6 }}>إِنَّا لِلَّٰهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ</Arabic>}
      <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08 }}>{f.name}</div>
      <div style={{ fontSize: 30, fontWeight: 500, color: A.cardMuted }}>
        {f.age !== undefined && <>Umur {f.age} tahun · </>}
        {f.address}
      </div>
      <div style={{ marginTop: 8 }}>
        {row("Solat jenazah", `${f.solatJenazah.time}, ${f.solatJenazah.place}`)}
        {row("Dikebumikan di", f.burialPlace)}
      </div>
    </Col>
  );
}

export const alamTemplates: TemplateComponents = {
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