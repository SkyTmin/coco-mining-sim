export interface BehaviorConfig {
  seed: number;
  previewSeconds: number;
  field: [number, number];
  stride: number;
  yaw: number;
  depthScale: number;
  stops: [number, number][];
  walkShare: [number, number];
  weights: Record<string, number>;
  attackInterval?: [number, number];
  attacks?: string[];
  /** Tricks of each form instead of attacks (TZ-B10): f1 at the stops, f2 after the phase. */
  tricks?: { f1: string[]; f2: string[] };
  /** Full attacks in each 30-second excursion, followed by phase, idle-f2 and the return to idle. */
  lifeAttacks?: string[];
  /** Eligible normalized anchor rectangle [left, top, right, bottom] for a technique. */
  attackBounds?: Record<string, [number, number, number, number]>;
  events: Record<string, string[]>;
}
export interface PetSample {
  anim: string;
  frame: number;
  at: [number, number];
  direction: 'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'nw';
  elapsed: number;
  tick: number;
}
type Clips = Record<string, { seconds: number; interrupt?: number[]; bearings?: number[] }>;
export const petFPS: number;
export const petDirections: string[];
export function validateBehavior(config: unknown, animations: Clips): string[];
export function turnFramesFor(bearings: number[], from: number, to: number): number[];
export function interruptFrames(frames: number, clip?: string): number[];
export function createPetBehavior(config: BehaviorConfig, animations: Clips, seed?: number): {
  sample(): PetSample;
  advance(seconds: number): PetSample;
  event(name: string): boolean;
};
