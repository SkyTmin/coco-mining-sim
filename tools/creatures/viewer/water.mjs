// The shore stays in field coordinates. Contact samples travel with the actor in live mode.
export const waterStyle = { paw: 0, body: 1, footfall: 2, coatReflection: 3, muzzleReflection: 4, submerged: 5, farFootfall: 6 };

export function paintWater(ctx, rows, contacts, front, ox = 0, oy = 0, shiftX = 0, shiftY = 0) {
  if (!rows || !contacts?.length) return;
  function wet(x, y) {
    const spans = rows[y];
    if (!spans) return false;
    for (let i = 0; i < spans.length; i += 2)
      if (x >= spans[i] && x < spans[i + 1]) return true;
    return false;
  }
  function dash(x, y, width, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < width; i++)
      if (wet(x + i, y)) ctx.fillRect(ox + x + i, oy + y, 1, 1);
  }
  for (const [cx, cy, kind, tick, size] of contacts) {
    const x = cx + shiftX, y = cy + shiftY;
    if (!wet(x, y)) continue;
    const age = tick / 24;
    if (kind === waterStyle.coatReflection || kind === waterStyle.muzzleReflection) {
      if (front) continue;
      const height = Math.max(2, Math.round(size * 0.53));
      for (let j = -height; j <= height; j++) {
        if ((y + j) % 3 === 0 || (j + (tick >> 3)) % 7 === 0) continue;
        const half = Math.round(size * Math.sqrt(1 - (j / height) ** 2));
        const wave = Math.round(2 * Math.sin((y + j) * 1.4 + age * Math.PI * 2));
        const tint = kind === waterStyle.muzzleReflection ? '#96b4aa' : j % 3 ? '#698f91' : '#57818a';
        const split = Math.round(half * (0.8 + 0.52 * Math.sin(j * 1.9 + age * Math.PI * 2)));
        dash(x - half + wave, y + j, split, tint);
        dash(x - half + wave + split + 3, y + j, 2 * half - split - 4, tint);
      }
    } else if (kind === waterStyle.footfall || kind === waterStyle.farFootfall) {
      if (front) {
        if (kind === waterStyle.farFootfall) continue;
        // Front rim remains visible beyond the toes; the far rim passes behind the body.
        const radius = 4 + Math.round(size * Math.sqrt(age));
        const rise = Math.round(radius * 0.27);
        if (tick > 2 && tick < 20) {
          dash(x - radius + 1, y + rise - 1, 3, '#91c9cd');
          dash(x - radius + 4, y + rise, 3 + (tick >> 3), '#c1e4dc');
          dash(x + radius - 5, y + rise - 1, 4, '#b5dcd7');
        }
        if (tick < 7) {
          const up = Math.round(5 * Math.sin(Math.PI * (tick + 1) / 8));
          dash(x - 6 - (tick >> 1), y - 3 - up, 2, '#cee7dc');
          dash(x + 7 + (tick >> 1), y - 2 - up, 1, '#e0eddb');
        }
        continue;
      }
      const rx = 3 + Math.round(size * Math.sqrt(age)), ry = 1 + Math.round(rx * 0.27);
      // A dark trough and a broken sunlit rim diverge at the planted footprint.
      for (let j = -rx; j <= rx; j++) {
        if ((Math.abs(j) + tick) % (tick > 16 ? 6 : 12) < (tick > 16 ? 3 : 2)) continue;
        const h = Math.round(ry * Math.sqrt(1 - (j / rx) ** 2));
        dash(x + j, y - h, 1, tick < 14 ? '#397e91' : '#67a2ae');
        dash(x + j, y + h, 1, tick < 12 ? '#c6e4dd' : '#91c6c9');
      }
      if (tick < 7) {
        const rise = Math.round(4 * Math.sin(Math.PI * (tick + 1) / 8));
        dash(x - 5 - (tick >> 1), y - 3 - rise, 2, '#d5ece0');
        dash(x + 5 + (tick >> 1), y - 2 - rise, 2, '#b5dbd9');
      }
    } else if (front) {
      if (kind === waterStyle.submerged) continue;
      // Cover the lowest toes with the advancing sheet of water and leave its lip above them.
      const width = size + (tick < 12 ? 1 : 0), surface = y - (kind === waterStyle.paw ? 4 : 2);
      dash(x - width - 2, surface + 1, 4, '#97c9cd');
      dash(x - width, surface, 3, '#b4dad6');
      dash(x - width + 2, surface - 1, width - 1, '#cbe5db');
      dash(x + 3, surface, width - 2, '#a8d5d3');
      dash(x - width + 1, surface + 1, width * 2 - 1, '#609fae');
      dash(x - width, surface + 2, width * 2 + 1, '#6da8b3');
      dash(x - width + 2, surface + 3, width * 2 - 3, '#73adb8');
      dash(x - width + 4, surface + 4, width, '#80b9c1');
    } else {
      dash(x - size - 2, y - 2, size + 1, '#427f90');
      dash(x + 2, y - 2, size, '#5895a7');
    }
  }
}
