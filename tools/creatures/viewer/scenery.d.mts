import type { SceneryRay } from '../types';
export function paintSceneryRays(
  ctx: Pick<CanvasRenderingContext2D, 'save' | 'restore' | 'translate' | 'fillRect' | 'globalAlpha'> & { fillStyle: unknown },
  rays: SceneryRay[], originX?: number, originY?: number, actorX?: number, actorY?: number,
): void;
