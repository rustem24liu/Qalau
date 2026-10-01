# Qalau

A gamified goal tracker where every completed task adds a brick to your 3D house.

Set daily goals, focus with timers, and watch your home take shape as you make progress. Switch between day and night modes to suit your mood.

Built as a Telegram Mini App with Three.js.

## Structure

```
frontend/              npm workspaces (TypeScript)
  packages/core/       goals, tasks, timer, progress, storage — pure TypeScript, no UI
  packages/scene/      three.js building site (house, builder, lighting) + SVG fallback
  apps/web/            React + Zustand app (web / Telegram Mini App)
backend/               Go API: sync between devices (in progress)
```

Planned next: `frontend/apps/desktop` (Tauri), `frontend/apps/mobile` (Capacitor).

## Frontend

Requires Node 20+.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm test           # Vitest: core logic + scene geometry
npm run build      # apps/web/dist
```

## Backend

Requires Go 1.25+. See [backend/README.md](backend/README.md).

```bash
cd backend
go test ./...
```
