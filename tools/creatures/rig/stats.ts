// Counters for the studio (ws review, ws profile): what one run really computed [research 23.11, R01 / VIII.6.1].
// compose — whole frames; history — earlier/later poses built only to answer pointAt (effect trails, flights);
// raster — renderRig calls and their pixels; wasted — rasters made inside a points-only build, where nobody looks at
// the picture (a skin's own front/wide renders that ignore the mode); skipped — rasters the points-only mode avoided.
// Pure counting: no pixel depends on it.
export const rigStats = { compose: 0, history: 0, raster: 0, rasterPixels: 0, wasted: 0, skipped: 0 };
export const rigMode = { pointsOnly: false };
export function resetRigStats() {
  for (const k of Object.keys(rigStats) as (keyof typeof rigStats)[]) rigStats[k] = 0;
}

/** What the effects reveal while a frame is composed, for the studio [research 23.11, stage 3 / 4]. `socket`: one socket
 * read — `frame` being composed, `when` the pose time asked (seconds; fractional times stay as they are), whether that
 * pose had the socket; reads through `pointAt` and misses of `points[name]` are reported. `prop`: an effect drew a
 * carried object off the body (Murlen's hat on the floor) at `at`, field pixels. Set a sink to listen; with no sink
 * nothing is recorded and no pixel depends on it either way. */
export interface SocketRead {
  frame: number;
  when: number;
  name: string;
  ok: boolean;
}
export interface PropMark {
  frame: number;
  prop: string;
  at: [number, number];
}
export const fxJournal: {
  socket?: (read: SocketRead) => void;
  prop?: (mark: PropMark) => void;
  /** The current pose's sockets in field pixels, once per composed frame that runs effects. */
  pose?: (frame: number, points: Record<string, [number, number]>) => void;
} = {};
