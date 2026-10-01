let actx: AudioContext | null = null;

/** Must be called from a user gesture so the chime can play later. */
export function ensureAudio(): void {
  try {
    actx = actx || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
  } catch {
    actx = null;
  }
}

/** Rising C-major arpeggio when a task is finished by timer. */
export function chime(): void {
  if (!actx) return;
  try {
    const t0 = actx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = actx!.createOscillator(), gn = actx!.createGain(), t = t0 + i * 0.13;
      o.type = "triangle";
      o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(gn);
      gn.connect(actx!.destination);
      o.start(t);
      o.stop(t + 0.6);
    });
  } catch {}
}
