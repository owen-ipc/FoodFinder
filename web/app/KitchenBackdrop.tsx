// Purely decorative — the scattered kitchen props and steaming pot behind
// the receipt. No state, no props: safe to render as a server component.

import type { CSSProperties } from "react";

const PROPS: { top: string; side: "left" | "right"; offset: string; rot: number; dur: string; delay: string; svg: string }[] = [
  {
    top: "4%", side: "left", offset: "6%", rot: -12, dur: "4.2s", delay: "0s",
    svg: '<svg width="46" height="46" viewBox="0 0 64 64"><path d="M32 14c10 0 18 10 18 22 0 10-8 18-18 18s-18-8-18-18c0-12 8-22 18-22z" fill="#f2ead8"/></svg>',
  },
  {
    top: "14%", side: "right", offset: "7%", rot: 15, dur: "5s", delay: "0.4s",
    svg: '<svg width="50" height="50" viewBox="0 0 64 64"><path d="M32 12c11 2 18 12 18 24 0 10-8 18-18 18s-18-8-18-18c0-12 7-22 18-24z" fill="#d98fc4"/></svg>',
  },
  {
    top: "26%", side: "left", offset: "3%", rot: 8, dur: "4.6s", delay: "0.8s",
    svg: '<svg width="48" height="48" viewBox="0 0 64 64"><circle cx="32" cy="34" r="22" fill="#e83e5c"/></svg>',
  },
  {
    top: "38%", side: "right", offset: "4%", rot: -10, dur: "5.4s", delay: "1.1s",
    svg: '<svg width="56" height="66" viewBox="0 0 64 74"><path d="M32 70V30" stroke="#8a5a2c" stroke-width="3"/><path d="M32 40c-10-4-16-14-14-24 10 2 18 12 14 24zM32 40c10-4 16-14 14-24-10 2-18 12-14 24z" fill="#3f7d5b"/></svg>',
  },
  {
    top: "50%", side: "left", offset: "8%", rot: 18, dur: "4.8s", delay: "0.3s",
    svg: '<svg width="100" height="26" viewBox="0 0 120 34"><rect x="16" y="8" width="88" height="18" rx="9" fill="#e8c99a"/><rect x="0" y="12" width="18" height="10" rx="5" fill="#c9a24a"/><rect x="102" y="12" width="18" height="10" rx="5" fill="#c9a24a"/></svg>',
  },
  {
    top: "60%", side: "right", offset: "9%", rot: -6, dur: "5.1s", delay: "0.9s",
    svg: '<svg width="66" height="46" viewBox="0 0 80 55"><path d="M6 20h68a34 18 0 0 1-68 0z" fill="#f2ead8"/></svg>',
  },
  {
    top: "70%", side: "left", offset: "5%", rot: 22, dur: "4.4s", delay: "1.4s",
    svg: '<svg width="24" height="42" viewBox="0 0 26 46"><rect x="2" y="10" width="22" height="34" rx="4" fill="#f2ead8"/></svg>',
  },
  {
    top: "72%", side: "right", offset: "13%", rot: -18, dur: "4.9s", delay: "0.5s",
    svg: '<svg width="24" height="42" viewBox="0 0 26 46"><rect x="2" y="10" width="22" height="34" rx="4" fill="#3a332a"/></svg>',
  },
  {
    top: "84%", side: "left", offset: "10%", rot: 10, dur: "5.3s", delay: "0.2s",
    svg: '<svg width="44" height="44" viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="26" ry="20" fill="#e3bd3f"/></svg>',
  },
  {
    top: "90%", side: "right", offset: "5%", rot: -14, dur: "4.6s", delay: "1s",
    svg: '<svg width="46" height="46" viewBox="0 0 64 64"><path d="M28 14c-2-4-6-6-8-3M30 12c8 0 16 8 16 22 0 12-8 20-16 20s-16-8-16-20c0-8 4-14 8-18" fill="#37d99b"/></svg>',
  },
];

const POT_SVG = `<svg width="90" height="70" viewBox="0 0 90 70">
  <path d="M14 30h62l-6 30a6 6 0 0 1-6 5H26a6 6 0 0 1-6-5z" fill="#5c5c5c"/>
  <ellipse cx="45" cy="30" rx="31" ry="6" fill="#3a3a3a"/>
  <rect x="2" y="26" width="14" height="6" rx="3" fill="#5c5c5c"/>
  <rect x="74" y="26" width="14" height="6" rx="3" fill="#5c5c5c"/>
</svg>`;

export default function KitchenBackdrop() {
  return (
    <div aria-hidden="true" className="backdrop">
      {PROPS.map((p, i) => (
        <div
          key={i}
          className="deco prop"
          style={{
            top: p.top,
            [p.side]: p.offset,
            "--r": `${p.rot}deg`,
            animationDuration: p.dur,
            animationDelay: p.delay,
          } as CSSProperties}
          dangerouslySetInnerHTML={{ __html: p.svg }}
        />
      ))}
      <div className="deco pot" style={{ top: "2%", left: "2%" }}>
        <div dangerouslySetInnerHTML={{ __html: POT_SVG }} />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="steamLine"
            style={{ left: `${28 + i * 10}px`, animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </div>
    </div>
  );
}
