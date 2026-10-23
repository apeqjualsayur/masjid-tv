// Sections 7 (Panel AJK) and 10 (Guna TV sedia ada): coded illustrations from the design, copy from
// the i18n json. No TV brands are named.
import { TOKENS as TENANG } from "@/themes/tenang/tokens";
import { LaptopFrame, PhoneFrame } from "./frames";
import { copy, type Lang } from "./i18n";
import { DEVICE_ICONS, LineIcon } from "./icons";
import { SectionHead, sectionPad } from "./sections";

/** Template tints in the phone picker (as in the design): Kuliah, Kematian, Program, Infaq, Mesyuarat, Imam & Bilal. */
const TPL_TINTS = ["var(--color-lb-soft)", "#ECECEC", "#E3F4F4", "#FFF1D6", "#F7EAE3", "#EEE8F7"];

function Laptop({ lang }: { lang: Lang }) {
  const c = copy(lang);
  const l = c.panel.laptop;
  return (
    <LaptopFrame label={c.a11y.laptopMock}>
      <div className="box-border flex w-[19%] flex-col gap-[1.2cqw] border-r border-lb-line bg-lb-ground px-[1.4cqw] py-[2cqw] text-[1.4cqw]">
        <div className="text-[1.6cqw] font-bold">{l.brand}</div>
        {l.nav.map((n, i) => (
          <div key={n} className={`rounded-[0.8cqw] px-[1cqw] py-[0.8cqw] font-semibold ${i === 1 ? "bg-lb-soft text-lb-brand" : "text-lb-muted"}`}>
            {n}
          </div>
        ))}
      </div>
      <div className="box-border grid flex-1 grid-cols-[1fr_1.3fr] gap-[2cqw] p-[2.2cqw]">
        <div className="flex flex-col gap-[1.2cqw] text-[1.3cqw]">
          <div className="text-[2cqw] font-bold">{l.template}</div>
          {l.fields.map((f) => (
            <div key={f.l} className="flex flex-col gap-[0.4cqw]">
              <div className="font-semibold text-lb-muted">{f.l}</div>
              <div className="rounded-[0.8cqw] border border-lb-line px-[1cqw] py-[0.9cqw]">{f.v}</div>
            </div>
          ))}
          <div className="mt-auto rounded-[0.8cqw] bg-lb-deep p-[1cqw] text-center font-bold text-white">{l.publish}</div>
        </div>
        <div className="flex flex-col gap-[1cqw]">
          <div className="text-[1.3cqw] font-bold text-lb-muted">{l.preview}</div>
          <div className="box-border aspect-video rounded-[1cqw] border-[0.5cqw] border-lb-bezel p-[1.4cqw]" style={{ background: TENANG.zohor.bg }}>
            <div className="box-border h-full rounded-[0.8cqw] bg-white p-[1.4cqw]">
              <div className="text-[1cqw] font-extrabold text-lb-deep">{l.previewEyebrow}</div>
              <div className="text-[2.2cqw] font-extrabold" style={{ color: TENANG.zohor.fg }}>
                {l.previewTitle}
              </div>
            </div>
          </div>
          <div className="text-[1.2cqw] text-lb-muted">{l.showOn}</div>
        </div>
      </div>
    </LaptopFrame>
  );
}

function Phone({ lang }: { lang: Lang }) {
  const c = copy(lang);
  const p = c.panel.phone;
  return (
    <PhoneFrame size="md" label={c.a11y.phoneMock}>
      <div className="text-[13px] font-bold">{p.title}</div>
      <div className="grid grid-cols-2 gap-2">
        {p.templates.map((n, i) => (
          <div key={n} className="flex flex-col gap-1.5 rounded-[10px] bg-white p-2">
            <div className="h-[26px] rounded-md" style={{ background: TPL_TINTS[i] }} />
            <div className="text-[9px] font-bold">{n}</div>
          </div>
        ))}
      </div>
      <div className="mt-auto flex h-9 items-center justify-center rounded-xl border border-dashed border-lb-primary/60 bg-white text-[10px] font-bold text-lb-deep">{p.upload}</div>
    </PhoneFrame>
  );
}

export function PanelSection({ lang }: { lang: Lang }) {
  const k = copy(lang).panel;
  return (
    <section id="panel" aria-labelledby="panel-title" className={`overflow-x-clip ${sectionPad}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5">
        <SectionHead id="panel-title" eyebrow={k.eyebrow} title={k.title} body={k.body} />
        <div className="flex flex-wrap items-end justify-center gap-8">
          <figure className="m-0 max-w-[760px] min-w-0 flex-[2_1_520px]">
            <Laptop lang={lang} />
            <figcaption className="mt-3.5 text-center text-[15px] font-semibold">{k.laptop.caption}</figcaption>
          </figure>
          <figure className="m-0 flex flex-[0_0_210px] flex-col items-center">
            <Phone lang={lang} />
            <figcaption className="mt-3.5 text-center text-[15px] font-semibold">{k.phone.caption}</figcaption>
          </figure>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-3.5">
          {k.benefits.map((b) => (
            <li key={b.t} className="flex flex-col gap-1.5 rounded-2xl border border-lb-hair bg-lb-card p-[18px]">
              <h3 className="m-0 text-[16px] font-bold">{b.t}</h3>
              <p className="m-0 text-[14px] leading-[1.55] text-lb-muted">{b.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const LOCK = "M4 10h16v10H4Z M8 10V7a4 4 0 0 1 8 0v3";

export function DevicesSection({ lang }: { lang: Lang }) {
  const k = copy(lang).devices;
  return (
    <section id="peranti" aria-labelledby="peranti-title" className={`bg-lb-ground ${sectionPad}`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-9 px-5">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <SectionHead id="peranti-title" eyebrow={k.eyebrow} title={k.title} />
          <p className="m-0 inline-flex items-center gap-2.5 rounded-full border border-lb-line bg-white px-[18px] py-2.5 text-[17px] font-semibold">
            <LineIcon d={LOCK} size={16} strokeWidth={2.2} className="text-lb-primary" />
            {k.url}
          </p>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-4">
          {k.items.map((d, i) => (
            <li key={d.t} className="flex flex-col gap-3 rounded-[20px] border border-lb-line bg-white px-[22px] py-[26px]">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-lb-soft text-lb-deep">
                <LineIcon d={DEVICE_ICONS[i]} size={26} strokeWidth={1.8} />
              </span>
              <h3 className="m-0 text-[18px] font-bold">{d.t}</h3>
              <p className="m-0 text-[14px] leading-[1.6] text-lb-muted">{d.d}</p>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] items-center gap-5 rounded-[22px] border border-lb-line bg-white p-[26px]">
          <div className="flex items-center gap-[18px]">
            <div aria-hidden="true" className="w-[150px] flex-none rounded-lg bg-lb-bezel p-[5px] [container-type:inline-size]">
              <div className="flex aspect-video flex-col items-center justify-center gap-[3cqw] rounded-[2px] bg-white">
                <img src="/brand/mv-mark.svg" alt="" width={17} height={17} className="h-[12cqw] w-auto" />
                <div className="text-[7cqw] text-lb-muted">{k.pairCode}</div>
                <div className="font-manrope text-[17cqw] leading-none font-extrabold tracking-[2cqw] text-lb-ink">482 913</div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="m-0 text-[17px] font-bold">{k.pairTitle}</h3>
              <p className="m-0 text-[14px] leading-[1.55] text-lb-muted">{k.pairBody}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-l-2 border-lb-line pl-5">
            <h3 className="m-0 text-[17px] font-bold">{k.offlineTitle}</h3>
            <p className="m-0 text-[14px] leading-[1.55] text-lb-muted">{k.offlineBody}</p>
          </div>
        </div>
      </div>
    </section>
  );
}