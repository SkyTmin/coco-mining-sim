import type { Rig, V3 } from './rig/f15-rig';
import type { Px } from './rig/px';
import type { Pen } from './fx/pen';
import type { JointPose, TechniqueBook } from './technique';
import type { TechniqueTrace } from './technique-fx';
export type XY = [number, number];
export type Variant = 'normal' | 'gold';
export type Rarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'secret';
export interface Animation {
  /** A separately selectable performance by a second character in this painting. */
  companion?: boolean;
  bearings?: number[]; // world bearing in radians of each authored turntable frame
  interrupt?: number[]; // interruptible 24 Hz local frame indices
  /** Physical ground displacement in field pixels, sampled independently of flight or camera shake. */
  groundOffset?: (t: number, side: number) => XY;
  seconds: number;
  hits?: number[]; // contact times in seconds, chronological
  shake?: number; // strength (0..1)
  stop?: number; // seconds to hold the contact pose
  loop?: boolean;
}
export interface BodyFrame {
  px: Px;
  lit?: Px | null;
  anchor: XY; // ground point in the local sprite
  eye: XY | null;
  points: Record<string, XY>; // named projected sockets, local sprite pixels
  primitives: number;
  /** Projected figure's actual rig and world-space anatomical sockets for studio diagnostics. */
  rig?: Rig;
  joints?: Record<string, V3>;
  groundShadow?: { radius: number; opacity: number };
  planted?: string[]; // sockets on the floor throughout the current stance
  // Post-raster effects, anchored about the feet. Translation is in picture pixels.
  dx?: number;
  dy?: number;
  sx?: number;
  sy?: number;
  rot?: number;
  ghost?: { dx: number; dy: number; alpha: number };
  flash?: number; // 0..1
  over?: Px; // isolated foreground limb in local sprite coordinates
}
export interface FxInput {
  under: Pen;
  above: Pen;
  anim: string;
  t: number;
  duration: number;
  hits: number[];
  w: number;
  h: number;
  feet: XY;
  points: Record<string, XY>;
  // Historical transformed socket in field coordinates for arcs and released missiles.
  pointAt: (time: number, name: string) => XY;
  variant: Variant;
  techniqueTrace?: TechniqueTrace;
}
export interface Creature {
  id: string;
  rarity: Rarity;
  theme: string;
  /** Standing position in field pixels for standalone clips and showreel chapters. */
  portraitOrigin?: XY;
  animations: Record<string, Animation>;
  frame: (
    anim: string,
    t: number,
    side: number,
    variant: Variant,
    motion?: { headSide: number; gaitPhase: number; techniquePose?: JointPose },
  ) => BodyFrame; // side 0..15; default 0 = artist's 3/4
  props?: (input: FxInput) => void; // physical targets shown during both held keys and playback
  effects?: (input: FxInput) => void;
  motion?: MotionPlan;
  behavior?: import('./viewer/behavior.mjs').BehaviorConfig;
  techniques?: TechniqueBook;
}
export interface MotionBeat {
  seconds: number;
  at: XY;
  anim: string;
  side?: number;
  lift?: number;
}
export interface MotionPlan {
  stride: number;
  yaw: number;
  fly?: boolean;
  beats: MotionBeat[];
}
export interface ForegroundProp {
  id: string;
  depth: number;
  paint: (p: Px) => void;
}
export type Scene = ((p: Px, t: number) => void) & { front?: ForegroundProp[] }; // opaque field bitmap; 3 s loop
export interface Border {
  wood: [string, string, string, string]; // profile, dark to light; hex strings
  accent: string;
  // decorate on top of common profile; opening starts at (b,b), transparent within
  decorate?: (p: Px, b: number, t: number) => void;
}
export const sizes: Record<Rarity, [number, number, number, number]> = {
  common: [160, 128, 96, 8],
  uncommon: [160, 128, 96, 10],
  rare: [208, 160, 128, 12],
  epic: [208, 160, 128, 14],
  legendary: [256, 208, 160, 16],
  mythic: [256, 208, 160, 18],
  secret: [256, 208, 160, 18],
};
