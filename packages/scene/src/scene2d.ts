import type { SceneApi } from "./types";

interface Part {
  stage: number;
  /** Paint order. */
  z: number;
  svg: string;
}

/** SVG fallback when WebGL is unavailable — one house for all goal sizes. Styled by scene2d.css. */
export function createScene2D(): SceneApi {
  const P: Part[] = [];
  const add = (stage: number, z: number, svg: string) => P.push({ stage, z, svg });

  add(0, 1, `<rect class="found" x="78" y="258" width="244" height="14" rx="1"/>`);

  const top = 258, bh = 13, x0 = 92, W = 216, n = 6, bw = W / n;
  const br = (x: number, y: number, w: number, alt?: boolean) =>
    `<rect class="brick${alt ? " b2" : ""}" x="${(x + 0.8).toFixed(1)}" y="${(y + 0.8).toFixed(1)}" width="${(w - 1.6).toFixed(1)}" height="${bh - 1.6}" rx="1.5"/>`;
  for (let r = 0; r < 8; r++) {
    const y = top - (r + 1) * bh;
    if (r % 2 === 0) for (let i = 0; i < n; i++) add(1, 1, br(x0 + i * bw, y, bw, (i + r) % 3 === 0));
    else {
      add(1, 1, br(x0, y, bw / 2));
      for (let i = 0; i < n - 1; i++) add(1, 1, br(x0 + bw / 2 + i * bw, y, bw, (i + r) % 3 === 1));
      add(1, 1, br(x0 + W - bw / 2, y, bw / 2, true));
    }
  }

  const win = (x: number) =>
    `<g><rect class="win" x="${x}" y="178" width="38" height="36" rx="2"/><line class="mun" x1="${x + 19}" y1="178" x2="${x + 19}" y2="214"/><line class="mun" x1="${x}" y1="196" x2="${x + 38}" y2="196"/></g>`;
  add(2, 2, win(108));
  add(2, 2, win(254));
  add(2, 2, `<g><rect class="door" x="184" y="200" width="32" height="58" rx="2"/><circle class="knob" cx="209" cy="231" r="2.2"/></g>`);

  const yb = 154, ya = 70, xl = 66, xr = 334, cxm = 200;
  const L = (y: number) => xl + ((yb - y) / (yb - ya)) * (cxm - xl);
  const R = (y: number) => xr - ((yb - y) / (yb - ya)) * (xr - cxm);
  const bands = [154, 133, 112, 91, 70];
  for (let i = 0; i < 4; i++) {
    const y1 = bands[i], y2 = bands[i + 1];
    const pts = i < 3 ? `${L(y1)},${y1} ${R(y1)},${y1} ${R(y2)},${y2} ${L(y2)},${y2}` : `${L(y1)},${y1} ${R(y1)},${y1} ${cxm},${ya}`;
    add(3, 3, `<polygon class="roof${i % 2 ? " r2" : ""}" points="${pts}"/>`);
  }

  add(4, 2.5, `<rect class="chim" x="262" y="84" width="20" height="40"/><rect class="chim" x="259" y="80" width="26" height="6"/>`);
  add(4, 4, `<g><circle class="smoke" cx="272" cy="68" r="6"/><circle class="smoke" cx="279" cy="56" r="8"/><circle class="smoke" cx="289" cy="42" r="10"/></g>`);
  add(5, 4, `<g><rect class="trunk" x="352" y="226" width="8" height="40"/><circle class="leaf" cx="356" cy="214" r="20"/><circle class="leaf" cx="344" cy="226" r="13"/><circle class="leaf" cx="368" cy="226" r="13"/></g>`);
  add(5, 4, `<g><circle class="leaf" cx="44" cy="262" r="11"/><circle class="leaf" cx="58" cy="264" r="9"/><circle class="leaf" cx="32" cy="265" r="8"/></g>`);
  add(6, 5, `<g><rect class="lit" x="109.5" y="179.5" width="35" height="33" rx="1"/><rect class="lit" x="255.5" y="179.5" width="35" height="33" rx="1"/></g>`);

  const N = P.length;
  const blueprint = `<g class="bp"><rect x="78" y="258" width="244" height="14"/><rect x="92" y="154" width="216" height="104"/><polygon points="66,154 334,154 200,70"/></g>`;
  const ground = `<rect class="grass" x="0" y="270" width="400" height="30"/><rect class="grass2" x="0" y="270" width="400" height="4"/>`;

  /** Pieces with index >= prev get the drop-in animation. */
  const svg = (k: number, prev: number, anim: boolean) => {
    const body = P.map((p, i) => ({ ...p, i }))
      .filter(p => p.i < k)
      .sort((a, b) => a.z - b.z || a.i - b.i)
      .map(p => (anim && p.i >= prev ? `<g class="pc-new" style="animation-delay:${Math.min(1.2, (p.i - prev) * 0.035).toFixed(3)}s">${p.svg}</g>` : p.svg))
      .join("");
    return `<svg class="scene2d" viewBox="0 0 400 300" role="img" aria-label="Дом">${ground}${blueprint}${body}</svg>`;
  };

  let host: HTMLElement | null = null, curGoal: string | null = null, lastK = 0;
  return {
    is3D: false,
    pieceCount: () => N,
    stageOf: (_t, i) => P[i]?.stage ?? 6,
    stages: () => [0, 1, 2, 3, 4, 5, 6],
    mount(el) {
      host = el;
      return () => { el.innerHTML = ""; host = null; };
    },
    show(goalId, _type, k) {
      const anim = goalId === curGoal && k > lastK;
      if (host) host.innerHTML = svg(k, anim ? lastK : k, anim);
      curGoal = goalId;
      lastK = k;
    },
    thumb: (_t, k) => ({ kind: "svg", markup: svg(k, k, false) }),
    setNight() {},
    setWorking() {},
  };
}
