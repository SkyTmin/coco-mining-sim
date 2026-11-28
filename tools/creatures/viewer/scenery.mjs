// Pixel lines from a moving performer to a fixed landmark. Both renderers use the
// same rasterizer so a desktop frame and a mobile atlas agree at the same anchor.
export function paintSceneryRays(ctx, rays, originX = 0, originY = 0, actorX = 0, actorY = 0) {
  if (!rays?.length) return;
  ctx.save();
  ctx.translate(originX, originY);
  for (const [fromX, fromY, toX, toY, color, alpha] of rays) {
    const x0 = Math.floor(fromX + actorX), y0 = Math.floor(fromY + actorY);
    const x1 = Math.floor(toX), y1 = Math.floor(toY);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const stepX = x0 < x1 ? 1 : -1, stepY = y0 < y1 ? 1 : -1;
    for (const shadow of [1, 0]) {
      ctx.fillStyle = shadow ? '#1d2130' : color;
      ctx.globalAlpha = alpha * (shadow ? 0.5 : 1);
      let x = x0, y = y0, error = dx + dy;
      for (let i = 0; i <= Math.max(dx, -dy); i++) {
        ctx.fillRect(x + shadow, y + shadow, 1, 1);
        if (x === x1 && y === y1) break;
        const doubled = 2 * error;
        if (doubled >= dy) { error += dy; x += stepX; }
        if (doubled <= dx) { error += dx; y += stepY; }
      }
    }
  }
  ctx.restore();
}
