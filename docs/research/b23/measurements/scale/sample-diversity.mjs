// Run from tools/creatures with its installed tsx, node and pngjs.
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [out, id] = process.argv.slice(2);
if (!out) throw Error("Supply a temporary output directory");
const root = process.cwd();
const ids = readdirSync(path.join(root, "golden")).filter(f => f.endsWith(".json")).sort();
if (!id) {
  for (const file of ids) {
    const child = spawnSync(process.execPath, ['--import','tsx',fileURLToPath(import.meta.url),out,file.slice(0,-5)], {stdio:"inherit"});
    if (child.status !== 0) throw Error("Failed to sample " + file);
  }
} else {
  const load = file => import(pathToFileURL(path.join(root,file)));
  const {loadForHash} = await load("studio/snap.ts");
  const {compose} = await load("engine.ts");
  const {PNG} = createRequire(path.join(root,"package.json"))("pngjs");
  const {c,s,b} = await loadForHash(id);
  const reference = JSON.parse(readFileSync(path.join(root,"golden",id+".json"),"utf8"));
  const dir = path.join(out,id);
  mkdirSync(dir,{recursive:true});
  const rows = [];
  for (const [anim, phases] of [['idle',[0,0.25,0.5,0.75]],['walk',[0,1/3,2/3]]]) {
    for (const phase of phases) {
      const index = Math.floor(reference[anim].length * phase);
      const rendered = compose(c,s,b,anim,index/24);
      const hash = createHash('sha1').update(rendered.picture.data).digest('hex').slice(0,10);
      if (hash !== reference[anim][index] && !process.env.B25_RECORD_MISMATCH) throw Error([id,anim,index,hash,reference[anim][index]].join('/'));
      const layers = { body: rendered.layers.body };
      if (anim === 'idle' && index === 0) layers.scene = rendered.layers.bg;
      for (const [name,px] of Object.entries(layers)) {
        writeFileSync(path.join(dir,anim+"-"+index+"-"+name+".png"), PNG.sync.write({
          width:px.w, height:px.h, data:Buffer.from(px.data)
        }));
      }
      rows.push({clip:anim,frame:index,phase,hash,expected:reference[anim][index],feet:rendered.feet});
    }
  }
  writeFileSync(path.join(dir,'frames.json'),JSON.stringify(rows));
  console.log(id,rows.length);
}
