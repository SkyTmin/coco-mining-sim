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
  attackInterval: [number, number];
  attacks: string[];
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
