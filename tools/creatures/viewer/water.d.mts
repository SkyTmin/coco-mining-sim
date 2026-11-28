import type { WaterContact } from '../types';
export const waterStyle: Readonly<{ paw: 0; body: 1; footfall: 2; coatReflection: 3; muzzleReflection: 4; submerged: 5; farFootfall: 6 }>;
export function paintWater(ctx: Pick<CanvasRenderingContext2D, 'fillRect'> & { fillStyle: unknown },
  rows: number[][], contacts: WaterContact[], front: boolean, ox?: number, oy?: number, shiftX?: number, shiftY?: number): void;
