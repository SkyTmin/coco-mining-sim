// Run against Vite serving the unmodified upstream snapshot. Only HTTP responses are instrumented.
import { writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { references } from './spec.mjs'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {},
)
const stand = process.env.STAND_URL || 'http://127.0.0.1:5201'
const dir = new URL('./', import.meta.url)
const bareInk = new Map()
const transform = `(x,y,fr)=>{const a=fr.rot||0,u=x*(fr.sx??1),v=y*(fr.sy??1);return [(fr.dx||0)+u*Math.cos(a)-v*Math.sin(a),2+(fr.dy||0)+u*Math.sin(a)+v*Math.cos(a)]}`
function observe(source, floor, clean) {
  let code = source.split('//# sourceMappingURL=')[0]
  function replace(needle, replacement) {
    if (code.split(needle).length !== 2)
      throw Error(`Unexpected painter signature ${floor}: ${needle}`)
    code = code.replace(needle, replacement)
  }
  if (floor === 11) {
    // Same bony pivot and offset as gFxOf('slam'). Keep it on the cached frame.
    replace(
      'gPts.set(fr, {',
      `fr.refFists=s.hand.map((hand,i)=>{const hc=vadd(hand,vmul(vnorm(vsub(hand,s.el[i])),1.2));const [px,py]=gproj(gcam(q.yb*YAW_STEP),hc);if(i===0){const [gx,gy]=gproj(gcam(q.yb*YAW_STEP),[hc[0],0,hc[2]]);fr.refFloor=[gx-GOX,gy-GOY]}return [px-GOX,py-GOY]});gPts.set(fr, {`,
    )
    code += `\nexport function referenceSocket(m,fr){const p=gMem.get(m).fr.refFists;return {tip:(${transform})(...p[0],fr),paths:p.map(x=>(${transform})(...x,fr)),floor:(${transform})(...gMem.get(m).fr.refFloor,fr),birth:(${transform})(p[0][0],p[0][1]+2,fr)}}`
    if (clean) {
      replace('if (fx.smear) for', 'if (false) for')
    }
  } else if (floor === 12) {
    // Read the native sole primitive from the scaled model. Its locating indices and
    // plane are exactly the values used for the hoof in mammothBuild, before skin thickness.
    replace(
      'drum: px(drum),',
      `ends: T.tip.map(px), ...(()=>{ const p=mammothBuild('normal',o).parts.find(p=>p.id===24&&p.rx>4*MAM_SC&&p.rz<2*MAM_SC);if(!p)throw Error('hoof missing');const x=p.x/MAM_SC-.5,y=p.y/MAM_SC;return {sole:px([x,y,p.z/MAM_SC-1.2]),floor:px([x,y,0])} })(), drum: px(drum),`,
    )
    code += `\nexport function referenceSocket(m,fr,mode){const p=MAM_PTS.get(m.id);return mode==='f12b_stomp'?{tip:p.sole,floor:p.floor,paths:[p.sole],birth:[0,-2]}:{tip:p.tusk,paths:p.ends,birth:[Math.cos(m.face)*2.9*16*.75,Math.sin(m.face)*2.9*16*.75-4]}}`
    if (clean) replace('if (o.trail && o.trail.length > 1)', 'if (false)')
  } else if (floor === 13) {
    replace(
      'vx: cx - x0,',
      'tip: proj(vg.tip).slice(0,2).map((v,i)=>v-(i?y0:x0)), vx: cx - x0,',
    )
    replace(
      'const lx = (c.vx - c.fr.ax) * sx;',
      `fr.refTip=[c.tip[0]-c.fr.ax,c.tip[1]-c.fr.ay];const lx = (c.vx - c.fr.ax) * sx;`,
    )
    code += `\nexport function referenceSocket(m,fr){const p=(${transform})(...fr.refTip,fr);const a=m.face-2.1/2;return {tip:p,paths:[p],birth:[Math.cos(a)*2.2*16,-4+Math.sin(a)*2.2*16]}}`
    if (clean) replace('const sm = d.smear;', 'const sm = null;')
    // Puppet's native ribbon is in lit only; never included in the body layer.
  } else if (floor === 14) {
    code += `\nexport function referenceSocket(m){const p=lordPointPx(m,'hourTip');return {tip:p,paths:[p,lordPointPx(m,'minTip')],birth:p}}`
    if (clean) replace('const sm = lSmearOf(q, t);', 'const sm = null;')
  }
  return code
}
try {
  for (const clean of [true, false]) {
    const page = await browser.newPage()
    await page.route(
      /\/dungeon-floors\/f1[1-4]-art\.ts(?:\?.*)?$/,
      async (route) => {
        const response = await route.fetch()
        const floor = Number(
          new URL(route.request().url()).pathname.match(/f(\d+)-art/)[1],
        )
        await route.fulfill({
          response,
          contentType: 'application/javascript',
          body: observe(await response.text(), floor, clean),
        })
      },
    )
    await page.goto(`${stand}/capture-tech.html`, { waitUntil: 'commit' })
    for (const s of references) {
      const result = await page.evaluate(
        async ({ s, clean }) => {
          const modules = await Promise.all([
            import('/src/lib/dungeon-render.ts'),
            import('/src/lib/dungeon-paint.ts'),
            import('/src/lib/dungeon.ts'),
            import(`/src/lib/dungeon-floors/f${s.kind.slice(1, 3)}-art.ts`),
            import('/src/lib/dungeon-floors/f13-brains.ts'),
          ])
          const [{ DungeonRenderer }, P, D, A, { F13_FX }] = modules
          const w = 192,
            h = 176,
            anchor = [90, 108],
            cols = 8,
            count = s.recovery + 1
          function surface(w, h) {
            const c = document.createElement('canvas')
            c.width = w
            c.height = h
            return c
          }
          const grid = surface(w * cols, h * Math.ceil(count / cols)),
            idle = surface(w, h),
            cell = surface(w, h)
          const rr = new DungeonRenderer(surface(1, 1)),
            painter = P.MOB_PAINTERS.get(s.kind)
          const face = Math.PI / 4,
            def = D.MOBS[s.kind]
          const m = {
            id: 7,
            kind: s.kind,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            kx: 0,
            ky: 0,
            r: def.radius,
            hp: 100,
            maxHp: 100,
            mode: s.idle,
            t: 0,
            face,
            dir: face,
            flash: 0,
            elite: false,
            albino: false,
            affixes: [],
            data: s.data,
            tele: null,
            danger: 0,
          }
          if (A.F14_LORD_DEV) A.F14_LORD_DEV.pipe = false
          const sim = {
            time: 0,
            mobs: [m],
            zones: [],
            strikes: [],
            shots: [],
            events: [],
            hero: { x: 0.7, y: 0.7, r: 0.3 },
            world: { objs: [] },
          }
          if (s.kind === 'f14boss') P.setPaintSim(sim)
          if (s.kind === 'f13boss') {
            F13_FX.mobs = [m]
            F13_FX.act = 4
          }
          function body(ctx, fr, light = !clean) {
            ctx.save()
            ctx.imageSmoothingEnabled = false
            ctx.translate(
              anchor[0] + (fr.dx || 0),
              anchor[1] + 2 + (fr.dy || 0),
            )
            ctx.rotate(fr.rot || 0)
            ctx.scale(fr.sx ?? 1, fr.sy ?? 1)
            ctx.globalAlpha = fr.alpha ?? 1
            ctx.drawImage(fr.img, -fr.ax, -fr.ay)
            if (light && fr.lit) ctx.drawImage(fr.lit, -fr.ax, -fr.ay)
            ctx.restore()
          }
          function drawFx(ctx, frame, sec) {
            const thrust = s.secondHit !== undefined && frame >= s.secondHit
            const age = Math.max(0, sec - (thrust ? s.secondHit / 24 : s.event))
            if (frame < s.contact || age > s.life) return
            const fx = {
              id: 715,
              from: m.id,
              mob: m.id,
              art: s.effect,
              x: 0,
              y: 0,
              r: s.radius,
              ang: face,
              arc: s.kind === 'f14boss' ? 1.9 : 2.1,
              dur: face,
              t: age,
              life: s.life,
              seed: 1,
            }
            ctx.save()
            if (s.kind === 'f11boss') {
              fx.x = sim.hero.x
              fx.y = sim.hero.y
              P.IMPACT_PAINTERS.get(s.effect).paint(
                ctx,
                fx,
                anchor[0] + fx.x * 16,
                anchor[1] + fx.y * 16,
                16,
                age,
                sec,
              )
            } else {
              if (thrust) {
                fx.r = 1
                fx.len = 4
                fx.art = 'f13_v_thrust'
              }
              P.ZONE_PAINTERS.get(fx.art)(ctx, fx, ...anchor, 16, sec)
            }
            ctx.restore()
          }
          body(idle.getContext('2d'), painter(m, rr.mobPose(m)))
          const tips = [],
            edges = []
          let birth,
            floorPoint = null
          const local = surface(w * cols, h * Math.ceil(count / cols))
          for (let half = 0; half <= s.recovery * 2; half++) {
            const sec = half / 48,
              frame = half / 2
            const [start, mode] = s.segments.filter(([f]) => f <= frame).at(-1)
            m.t = (half - start * 2) / 48
            m.mode = mode
            rr.time = sec
            sim.time = sec
            F13_FX.time = sec
            const fr = painter(m, rr.mobPose(m))
            const sample = A.referenceSocket(m, fr, s.mode),
              tip = sample.tip
            if (!tip || !tip.every(Number.isFinite))
              throw Error(`Missing socket ${s.id} @${half}`)
            const world = (p) => p.map((v, i) => v + anchor[i])
            tips.push(world(tip))
            edges.push(sample.paths.map(world))
            if (frame === s.contact) {
              birth = world(sample.birth)
              if (sample.floor) floorPoint = world(sample.floor)
            }
            if (half % 2) continue
            const ctx = cell.getContext('2d')
            ctx.clearRect(0, 0, w, h)
            body(ctx, fr, true)
            local
              .getContext('2d')
              .drawImage(cell, (frame % cols) * w, Math.floor(frame / cols) * h)
            ctx.clearRect(0, 0, w, h)
            if (!clean && s.kind !== 'f13boss' && s.kind !== 'f14boss')
              drawFx(ctx, frame, sec)
            body(ctx, fr)
            if (!clean && (s.kind === 'f13boss' || s.kind === 'f14boss'))
              drawFx(ctx, frame, sec)
            grid
              .getContext('2d')
              .drawImage(cell, (frame % cols) * w, Math.floor(frame / cols) * h)
          }
          P.setPaintSim(null)
          return {
            width: w,
            height: h,
            anchor,
            columns: cols,
            frames: count,
            tips,
            edges,
            birth,
            floorPoint,
            ink: local.toDataURL(),
            grid: grid.toDataURL(),
            idle: idle.toDataURL(),
          }
        },
        { s, clean },
      )
      const png = async (name, url) =>
        writeFile(new URL(name, dir), Buffer.from(url.split(',')[1], 'base64'))
      const { grid, idle, tips, edges, birth, ink, ...format } = result
      const rendered = PNG.sync.read(Buffer.from(ink.split(',')[1], 'base64'))
      if (clean) bareInk.set(s.id, rendered)
      else {
        const bare = bareInk.get(s.id)
        const trail = new PNG({
          width: rendered.width,
          height: rendered.height,
        })
        for (let i = 0; i < rendered.data.length; i += 4) {
          if (
            !bare.data
              .subarray(i, i + 4)
              .equals(rendered.data.subarray(i, i + 4))
          )
            trail.data.fill(255, i, i + 4)
        }
        await writeFile(
          new URL(`${s.id}-trail.png`, dir),
          PNG.sync.write(trail),
        )
      }
      await png(`${s.id}${clean ? '' : '-fx'}.png`, grid)
      if (clean) {
        await png(`${s.id}-idle.png`, idle)
        await writeFile(
          new URL(`${s.id}.json`, dir),
          JSON.stringify(
            { ...s, ...format, tipSampleHz: 48, tips, edges, birth },
            null,
            2,
          ) + '\n',
        )
      }
      console.log(s.id, clean ? 'body' : 'composite', result.frames)
    }
    await page.close()
  }
} finally {
  await browser.close()
}
