import { readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import {
  maskIoU,
  maskMetrics,
  maskOf,
  pathLength,
  pointPathDistance,
} from '../../../tech-metrics'
import type { XY } from '../../../types'
import { references } from './spec.mjs'
const read = (file: string) => readFileSync(new URL(file, import.meta.url))
const rows: Record<string, object> = {}
const contacts = new Map<string, ReturnType<typeof maskOf>>()
for (const { id } of references) {
  const s = JSON.parse(read(id + '.json').toString())
  const sheet = PNG.sync.read(read(id + '.png')),
    idle = PNG.sync.read(read(id + '-idle.png'))
  function cell(n: number) {
    const data = new Uint8ClampedArray(s.width * s.height * 4)
    const left = (n % s.columns) * s.width,
      top = Math.floor(n / s.columns) * s.height
    for (let y = 0; y < s.height; y++) {
      const start = 4 * ((top + y) * sheet.width + left)
      data.set(sheet.data.subarray(start, start + 4 * s.width), y * s.width * 4)
    }
    return maskOf({ w: s.width, h: s.height, data })
  }
  const prep = cell(s.windup),
    hit = cell(s.contact)
  const bodyHeight = maskOf({
    w: idle.width,
    h: idle.height,
    data: new Uint8ClampedArray(idle.data),
  }).height
  const tips: XY[] = s.tips.slice(s.windup * 2, s.contact * 2 + 1)
  const tipPath = pathLength(tips)
  const measure = maskMetrics(prep, hit, bodyHeight)
  contacts.set(id, hit)
  const delta = PNG.sync.read(read(id + '-trail.png'))
  let trailPixels = 0,
    trailMax = 0,
    worstTrailFrame: number | null = null
  for (let f = s.windup; f <= (s.comparisonEnd ?? s.recovery); f++) {
    const edges: XY[][] = s.edges.slice(Math.max(0, f * 2 - 8), f * 2 + 1)
    const paths = edges[0].map((_, j) => edges.map((e) => e[j]))
    const x0 = (f % s.columns) * s.width,
      y0 = Math.floor(f / s.columns) * s.height
    for (let y = 0; y < s.height; y++)
      for (let x = 0; x < s.width; x++) {
        if (!delta.data[4 * ((y0 + y) * delta.width + x0 + x) + 3]) continue
        const dist = Math.min(
          ...paths.map((path) => pointPathDistance([x, y], path)),
        )
        trailPixels++
        if (dist > trailMax) {
          trailMax = dist
          worstTrailFrame = f
        }
      }
  }
  const end = s.tips[s.contact * 2],
    birthError = Math.hypot(end[0] - s.birth[0], end[1] - s.birth[1])
  rows[id] = {
    label: s.label,
    socket: s.socket,
    prepFrame: s.windup,
    hitFrame: s.contact,
    followFrame: s.follow,
    returnFrame: s.recovery,
    strikeFrame: s.windup,
    prepFraction: s.windup / ((s.comparisonEnd ?? s.recovery) + 1),
    attackFrames: s.contact - s.windup,
    damageSeconds: s.event,
    bodyHeight,
    prepCentre: prep.centre,
    hitCentre: hit.centre,
    prepBounds: prep.bounds,
    hitBounds: hit.bounds,
    ...measure,
    tipPath,
    tipRatio: tipPath / bodyHeight,
    contact: end,
    birth: s.birth,
    birthError,
    floor: s.floorPoint,
    floorError: s.floorPoint ? Math.abs(end[1] - s.floorPoint[1]) : null,
    trailPixels,
    trailMax: trailPixels ? trailMax : null,
    worstTrailFrame,
    fx: s.effect,
  }
  console.log(
    id,
    `H=${bodyHeight} COM=${measure.comRatio.toFixed(4)} IoU=${measure.iou.toFixed(4)} tip/H=${(tipPath / bodyHeight).toFixed(4)}`,
  )
}
const results = {
  source: 'SkyTmin/coco-instruments@523bae1fdc0e06052648a3c3d09e9f1642ca615d',
  fps: 24,
  tipSampleHz: 48,
  alphaAbove: 200,
  origin:
    'same fixed world origin for all poses, camera and camera shake omitted, native body transform retained',
  references: rows,
  contactPairs: {
    'mammoth-tusks/mammoth-stomp': maskIoU(
      contacts.get('mammoth-tusks')!,
      contacts.get('mammoth-stomp')!,
    ),
  },
}
writeFileSync(
  new URL(
    '../../../../../docs/reports/creatures/pilot-3/reference/tech-metrics.json',
    import.meta.url,
  ),
  JSON.stringify(results, null, 2) + '\n',
)
