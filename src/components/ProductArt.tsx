import Image from "next/image";
import type { Art, Pack } from "@/content/catalog";

// The "product photography": packaging drawn in SVG so every skill gets a shelf
// shot without any stock art. Colors come from the catalog. Shapes live here.

type PackProps = { tint: string; ink: string; label: string };

const STENCIL = "var(--font-sten), Impact, sans-serif";

/** Shrinks long labels to fit `width`. Stencil caps run about 0.5em wide. */
function fit(label: string, base: number, width: number) {
  return Math.min(base, width / (label.length * 0.52));
}

function Label({
  label,
  ink,
  x = 160,
  y,
  size,
  rotate = 0,
}: {
  label: string;
  ink: string;
  x?: number;
  y: number;
  size: number;
  rotate?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fill={ink}
      fontSize={size}
      textAnchor="middle"
      dominantBaseline="central"
      letterSpacing="0.04em"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
      style={{ fontFamily: STENCIL, fontWeight: 700 }}
    >
      {label}
    </text>
  );
}

function Cup({ tint, ink, label }: PackProps) {
  const body = "M106 50 L122 204 Q123.500 214 134 214 H186 Q196.500 214 198 204 L214 50 Z";
  return (
    <g>
      <path d={body} fill={tint} />
      <g fill="#fff" opacity="0.2">
        <rect x="118" y="55" width="30" height="24" rx="5" transform="rotate(-12 133 67)" />
        <rect x="160" y="57" width="34" height="26" rx="5" transform="rotate(14 177 70)" />
        <rect x="140" y="70" width="24" height="20" rx="5" transform="rotate(6 152 80)" />
      </g>
      <path d={body} fill="url(#art-sheen)" />
      <path d="M121 192 H199 M122 199 H198" stroke="#000" strokeOpacity="0.12" strokeWidth="1.500" />
      <path
        d="M101 42 Q160 32 219 42 L216 54 Q160 62 104 54 Z"
        fill="#fff"
        fillOpacity="0.82"
        stroke="#000"
        strokeOpacity="0.1"
      />
      <Label label={label} ink={ink} y={134} size={fit(label, 46, 74)} rotate={-5} />
    </g>
  );
}

function Can({ tint, ink, label }: PackProps) {
  const body = "M127 34 H193 L205 52 V198 L195 214 H125 L115 198 V52 Z";
  return (
    <g>
      <path d={body} fill={tint} />
      <path d="M127 34 H193 L205 52 H115 Z" fill="url(#art-metal)" />
      <path d="M115 198 H205 L195 214 H125 Z" fill="url(#art-metal)" />
      <ellipse cx="160" cy="34" rx="33" ry="4" fill="#d8d8dc" stroke="#000" strokeOpacity="0.12" />
      <path d={body} fill="url(#art-sheen)" />
      <Label label={label} ink={ink} y={125} size={fit(label, 58, 132)} rotate={-90} />
    </g>
  );
}

function Bag({ tint, ink, label }: PackProps) {
  return (
    <g>
      <path d="M104 62 H216 L222 206 Q222 214 214 214 H106 Q98 214 98 206 Z" fill={tint} />
      <path d="M104 62 L98 206 Q98 214 106 214 H116 L114 62 Z" fill="#000" opacity="0.07" />
      <path d="M216 62 L222 206 Q222 214 214 214 H204 L206 62 Z" fill="#000" opacity="0.1" />
      <path d="M110 36 H210 L216 64 H104 Z" fill={tint} />
      <path d="M110 36 H210 L216 64 H104 Z" fill="#000" opacity="0.14" />
      <rect x="100" y="60" width="120" height="6" rx="2" fill="#2b2b2b" opacity="0.65" />
      <rect x="116" y="88" width="88" height="96" rx="2" fill="#fbf9f1" />
      <rect x="121" y="93" width="78" height="86" rx="1" fill="none" stroke={ink} strokeOpacity="0.4" />
      <Label label={label} ink={ink} y={136} size={fit(label, 38, 72)} />
    </g>
  );
}

function Jar({ tint, ink, label }: PackProps) {
  const glass = "M124 66 H196 Q216 72 216 96 V198 Q216 214 200 214 H120 Q104 214 104 198 V96 Q104 72 124 66 Z";
  return (
    <g>
      <path d={glass} fill="#fff" fillOpacity="0.6" />
      <path d="M108 88 H212 V198 Q212 210 198 210 H122 Q108 210 108 198 Z" fill={tint} />
      <path d={glass} fill="url(#art-sheen)" />
      <rect x="116" y="34" width="88" height="30" rx="5" fill="#26262a" />
      <path d="M116 44 H204 M116 52 H204" stroke="#fff" strokeOpacity="0.14" />
      <rect x="118" y="112" width="84" height="66" rx="3" fill="#fbf9f1" />
      <Label label={label} ink={ink} y={145} size={fit(label, 34, 70)} />
    </g>
  );
}

function Box({ tint, ink, label }: PackProps) {
  return (
    <g>
      <path d="M104 58 H194 V214 H104 Z" fill={tint} />
      <path d="M194 58 L222 42 V198 L194 214 Z" fill={tint} />
      <path d="M194 58 L222 42 V198 L194 214 Z" fill="#000" opacity="0.26" />
      <path d="M104 58 L132 42 H222 L194 58 Z" fill={tint} />
      <path d="M104 58 L132 42 H222 L194 58 Z" fill="#fff" opacity="0.28" />
      <path d="M104 74 H194 M104 198 H194" stroke={ink} strokeOpacity="0.4" strokeWidth="1.500" />
      <Label label={label} ink={ink} x={149} y={136} size={fit(label, 46, 74)} />
    </g>
  );
}

function Bottle({ tint, ink, label }: PackProps) {
  const body = "M146 44 H174 V68 Q174 84 192 98 Q202 106 202 122 V200 Q202 214 188 214 H132 Q118 214 118 200 V122 Q118 106 128 98 Q146 84 146 68 Z";
  return (
    <g>
      <path d={body} fill={tint} />
      <path d={body} fill="url(#art-sheen)" />
      <rect x="143" y="28" width="34" height="18" rx="3" fill="#26262a" />
      <rect x="118" y="124" width="84" height="62" fill="#fbf9f1" />
      <Label label={label} ink={ink} y={155} size={fit(label, 34, 68)} />
    </g>
  );
}

const contactShadow: Record<Pack, number> = { cup: 34, can: 36, bag: 58, jar: 52, box: 56, bottle: 40 };

const packs: Record<Pack, (props: PackProps) => React.ReactElement> = {
  cup: Cup,
  can: Can,
  bag: Bag,
  jar: Jar,
  box: Box,
  bottle: Bottle,
};

/** Gradients shared by every pack. Rendered once in the layout. */
export function ArtDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="art-shadow">
          <stop offset="0" stopColor="#1c1c2e" stopOpacity="0.3" />
          <stop offset="1" stopColor="#1c1c2e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="art-sheen" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.26" />
          <stop offset="0.16" stopColor="#fff" stopOpacity="0.26" />
          <stop offset="0.32" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="0.74" stopColor="#000" stopOpacity="0.03" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="art-metal" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#8f9095" />
          <stop offset="0.25" stopColor="#f2f2f4" />
          <stop offset="0.7" stopColor="#c6c7cb" />
          <stop offset="1" stopColor="#7f8085" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ProductArt({ art, sizes }: { art: Art; sizes?: string }) {
  if ("image" in art) {
    return (
      <Image
        src={art.image}
        alt={art.alt}
        fill
        sizes={sizes ?? "(min-width: 1024px) 20vw, 45vw"}
        className="object-cover object-top"
      />
    );
  }
  const Shape = packs[art.pack];
  return (
    <svg viewBox="20 18 280 210" className="absolute inset-0 size-full" role="presentation" aria-hidden="true">
      <ellipse cx="118" cy="212" rx="86" ry="15" fill="url(#art-shadow)" />
      <ellipse cx="160" cy="214" rx={contactShadow[art.pack]} ry="3.500" fill="#000" opacity="0.18" />
      <Shape tint={art.tint} ink={art.ink} label={art.label} />
    </svg>
  );
}
