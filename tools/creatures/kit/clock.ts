// Clip clock. Every motion driven by time (breathing, a churning mane, hover, a spinning hoop) must make whole cycles
// over the clip: then a loop closes on itself and a one-shot clip ends exactly where idle frame 0 begins. A free
// `Math.sin(t * k)` leaves the last frame off the rest pose; the pet gate then reports endpoint IoU < 0.9 at the very
// end of the work [Раскат 21.11: the second-form tricks ended at 0.877 until mane and hover were put on this clock].
const TAU = Math.PI * 2;

export interface ClipClock {
  /** Clip length in seconds. */
  readonly D: number;
  /** Whole cycles closest to `perSecond` over the clip, at least one. */
  cycles(perSecond: number): number;
  /** Phase angle of a whole-cycle rotation: 0 at t = 0, a multiple of 2π at t = D. */
  turn(perSecond: number): number;
  /** Whole-cycle oscillation that starts and ends at 0 whatever the phase. */
  osc(perSecond: number, phase?: number): number;
  /**
   * Angle of an object with `folds`-fold symmetry (8 drums, 5 petals) turning at about `perSecond` turns a second:
   * it advances by whole 1/folds steps, so it looks exactly like the rest pose when it stops. It stops at `until`
   * (default the clip end), e.g. earlier to hold the last 0.7 s of a show still.
   */
  spin(perSecond: number, folds: number, until?: number): number;
}

export function clipClock(D: number, t: number): ClipClock {
  const cycles = (perSecond: number) => Math.max(1, Math.round(D * perSecond));
  return {
    D,
    cycles,
    turn: (perSecond) => (TAU * cycles(perSecond) * t) / D,
    osc: (perSecond, phase = 0) => Math.sin((TAU * cycles(perSecond) * t) / D + phase) - Math.sin(phase),
    spin: (perSecond, folds, until = D) =>
      ((TAU / folds) * Math.max(1, Math.round(D * perSecond * folds)) * Math.min(t, until)) / until,
  };
}
