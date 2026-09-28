import { PHASE_LABEL, WEATHER_LABEL, type WeatherKind } from "@qalau/core";
import { useEffect, useRef } from "react";
import { useWeatherView, type WeatherView } from "../hooks/useWeatherSync";
import { reducedMotion } from "../lib/scene";
import { useWeather } from "../lib/weather";

/** "Дождь · +14° · вечер"; no temperature for weather picked by hand. */
export const weatherText = (w: WeatherView) =>
  [WEATHER_LABEL[w.kind], w.temp == null ? null : `${w.temp > 0 ? "+" : ""}${w.temp}°`, PHASE_LABEL[w.phase]]
    .filter(Boolean)
    .join(" · ");

/** Sky tint behind the building: time of day plus cloud cover. */
export function WeatherSky() {
  const w = useWeatherView();
  if (!w) return null;
  return <div className={`wx-sky ph-${w.phase} wx-${w.kind}`} aria-hidden="true" />;
}

/** Precipitation, fog and lightning in front of the building, plus the weather badge. */
export function WeatherFx() {
  const w = useWeatherView();
  if (!w) return <LocateButton className="wx-badge wx-locate" />;
  return (
    <>
      <Precipitation kind={w.kind} intensity={w.intensity} />
      {w.kind === "fog" && <div className="wx-mist" aria-hidden="true" />}
      {w.kind === "storm" && !reducedMotion && <div className="wx-flash" aria-hidden="true" />}
      <span className="wx-badge">{weatherText(w)}</span>
    </>
  );
}

/** Asks for the location (from a click, so the browser prompt is expected). */
export function LocateButton({ className }: { className: string }) {
  const status = useWeather(s => s.status);
  const locate = useWeather(s => s.locate);
  if (status === "denied") return <span className={className}>Нет доступа к геолокации</span>;
  const busy = status === "locating" || status === "loading";
  return (
    <button type="button" className={className} onClick={locate} disabled={busy}>
      {busy ? "Узнаём погоду…" : status === "error" ? "Погода недоступна — повторить" : "Погода по месту"}
    </button>
  );
}

interface Drop { x: number; y: number; v: number; len: number; r: number; sway: number }

/** Rain / snow drawn on a canvas; one static frame when motion is reduced. */
function Precipitation({ kind, intensity }: { kind: WeatherKind; intensity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const snow = kind === "snow";
  const rain = kind === "rain" || kind === "drizzle" || kind === "storm";

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx || (!snow && !rain)) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const resize = () => {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    const drizzle = kind === "drizzle";
    const count = Math.round((snow ? 50 : 70) + (snow ? 110 : 170) * intensity);
    const spawn = (anyY: boolean): Drop => ({
      x: Math.random() * (W + 40) - 20,
      y: anyY ? Math.random() * H : -20,
      v: snow ? 0.6 + Math.random() * 0.9 : (drizzle ? 7 : 11) + Math.random() * 5,
      len: drizzle ? 6 + Math.random() * 4 : 12 + Math.random() * 10,
      r: 1 + Math.random() * 1.8,
      sway: Math.random() * Math.PI * 2,
    });
    const drops = Array.from({ length: count }, () => spawn(true));

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      if (snow) {
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.beginPath();
        for (const d of drops) {
          const x = d.x + Math.sin(t / 900 + d.sway) * 6;
          ctx.moveTo(x + d.r, d.y);
          ctx.arc(x, d.y, d.r, 0, Math.PI * 2);
        }
        ctx.fill();
      } else {
        ctx.strokeStyle = drizzle ? "rgba(210,222,238,.45)" : "rgba(200,215,235,.6)";
        ctx.lineWidth = drizzle ? 1 : 1.3;
        ctx.beginPath();
        for (const d of drops) {
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * 0.18, d.y + d.len);
        }
        ctx.stroke();
      }
    };

    if (reducedMotion) {
      draw(0);
      return () => ro.disconnect();
    }

    let raf = 0, last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(3, (t - last) / 16.7);
      last = t;
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.y += d.v * dt;
        if (!snow) d.x -= d.v * 0.18 * dt;
        if (d.y > H + 20) drops[i] = spawn(false);
      }
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [kind, intensity, snow, rain]);

  if (!snow && !rain) return null;
  return <canvas ref={ref} className="wx-fx" aria-hidden="true" />;
}
