import { createCanvas, loadImage } from '@napi-rs/canvas'
import { readFileSync, writeFileSync } from 'node:fs'
import { references } from './spec.mjs'
const zoom = 3,
  cellW = 144,
  cellH = 142,
  header = 25,
  caption = 22
const out = createCanvas(
  5 * cellW * zoom,
  references.length * (cellH * zoom + header + caption),
)
const g = out.getContext('2d')
g.imageSmoothingEnabled = false
for (const [row, { id }] of references.entries()) {
  const s = JSON.parse(
    readFileSync(new URL(id + '.json', import.meta.url), 'utf8'),
  )
  const sheet = await loadImage(
    readFileSync(new URL(id + '-fx.png', import.meta.url)),
  )
  const top = row * (cellH * zoom + header + caption)
  g.fillStyle = '#181c26'
  g.fillRect(0, top, out.width, header)
  g.fillStyle = '#eff0de'
  g.font = 'bold 18px sans-serif'
  g.fillText(s.label, 9, top + 19)
  const selected = [0, s.windup, s.contact, s.follow, s.recovery]
  for (const [i, n] of selected.entries()) {
    const x = i * cellW * zoom,
      y = top + header
    g.fillStyle = '#2b2c35'
    g.fillRect(x, y, cellW * zoom, cellH * zoom)
    g.drawImage(
      sheet,
      (n % s.columns) * s.width + s.anchor[0] - 70,
      Math.floor(n / s.columns) * s.height + s.anchor[1] - 103,
      cellW,
      cellH,
      x,
      y,
      cellW * zoom,
      cellH * zoom,
    )
    g.fillStyle = '#141a23'
    g.fillRect(x, top + header + cellH * zoom, cellW * zoom, caption)
    g.fillStyle = n === s.contact ? '#ff9a89' : '#c7cdd4'
    g.font = '15px sans-serif'
    g.fillText(
      ['Покой', 'Замах', 'Контакт', 'Проводка', 'Возврат'][i] + ' · ' + n,
      x + 8,
      y + cellH * zoom + 16,
    )
    if (n === s.contact) {
      g.strokeStyle = '#f36454'
      g.lineWidth = 3
      g.strokeRect(x + 1.5, y + 1.5, cellW * zoom - 3, cellH * zoom - 3)
    }
  }
}
writeFileSync(
  new URL(
    '../../../../../docs/reports/creatures/pilot-3/reference/techniques.png',
    import.meta.url,
  ),
  out.toBuffer('image/png'),
)
