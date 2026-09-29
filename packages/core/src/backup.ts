import { normalize, rollDaily } from "./goals";
import type { AppState } from "./types";

export const BACKUP_FORMAT = "qalau-backup";
export const BACKUP_VERSION = 1;

interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** Epoch ms. */
  exportedAt: number;
  state: AppState;
}

/** The whole app state as a downloadable JSON file body. */
export function exportBackup(s: AppState, now = Date.now()): string {
  const state = structuredClone(s);
  delete state.example;
  const backup: Backup = { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now, state };
  return JSON.stringify(backup, null, 1);
}

export const backupFileName = (now = new Date()) =>
  `qalau-backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.json`;

export type ImportResult =
  | { ok: true; state: AppState; exportedAt: number | null }
  | { ok: false; error: string };

/**
 * Reads a backup file. Also accepts a raw state (e.g. copied from localStorage).
 * The result is repaired like freshly loaded data, so old or partial files still work.
 */
export function parseBackup(text: string): ImportResult {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "Это не JSON-файл." }; }
  if (!data || typeof data !== "object") return { ok: false, error: "В файле нет данных Qalau." };
  const d = data as Partial<Backup> & Partial<AppState>;
  if (d.format === BACKUP_FORMAT && typeof d.version === "number" && d.version > BACKUP_VERSION) {
    return { ok: false, error: "Файл сделан более новой версией приложения. Обновите страницу и попробуйте снова." };
  }
  const state = (d.format === BACKUP_FORMAT ? d.state : d) as AppState | undefined;
  if (!state || !Array.isArray(state.goals)) return { ok: false, error: "В файле нет целей Qalau." };
  delete state.example;
  normalize(state);
  rollDaily(state);
  return { ok: true, state, exportedAt: d.format === BACKUP_FORMAT && typeof d.exportedAt === "number" ? d.exportedAt : null };
}
