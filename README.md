```markdown
# Qalau

A gamified goal tracker where every completed task adds a brick to your 3D house.

Set daily goals, focus with timers, and watch your home take shape as you make progress. Switch between day and night modes to suit your mood.

Built as a Telegram Mini App with Three.js.
```

## Structure

```
packages/
  core/    goals, tasks, timer, progress, storage — pure TypeScript, no UI
  scene/   three.js building site (house, builder, lighting) + SVG fallback
apps/
  web/     React + Zustand app (web / Telegram Mini App)
```

Planned next: `apps/desktop` (Tauri), `apps/mobile` (Capacitor), `server` (Go).

## Develop

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # apps/web/dist
```
