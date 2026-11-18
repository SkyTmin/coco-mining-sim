import type { Px } from './rig/px';
import type { Pen } from './fx/pen';
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
}
export interface Creature {
  id: string;
  rarity: Rarity;
  theme: string;
  animations: Record<string, Animation>;
  frame: (
    anim: string,
    t: number,
    side: number,
    variant: Variant,
    motion?: { headSide: number; gaitPhase: number },
  ) => BodyFrame; // side 0..15; default 0 = artist's 3/4
  effects?: (input: FxInput) => void;
  motion?: MotionPlan;
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
