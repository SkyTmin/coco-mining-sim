// Run from tools/creatures with tsx, passing two read-only tools/creatures directories and an output directory.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

if (process.argv.length !== 5) throw Error('Pass baseline tools/creatures, revised tools/creatures and output directory');
const [beforePath, afterPath, output] = process.argv.slice(2).map(p => resolve(p));
mkdirSync(output, {recursive:true});
const {createCanvas}=createRequire(join(beforePath,'package.json'))('@napi-rs/canvas');
async function revision(path) {
  const load = name => import(pathToFileURL(join(path,name)).href);
  const {loadPainting} = await load('render.ts');
  const {compose, frameCount} = await load('engine.ts');
  const {c,s,b} = await loadPainting('pocket_magnet');
  return {
    sha: execFileSync('git',['-C',path,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    length: clip => frameCount(c.animations[clip].seconds),
    picture: (clip, index) => compose(c,s,b,clip,index/24,0,'normal').picture,
  };
}
function changedPixels(a,b) {
  if (a.w !== b.w || a.h !== b.h) throw Error('Dimensions differ');
  let count=0;
  for (let j=0;j<a.data.length;j+=4) {
    if (a.data[j] !== b.data[j] || a.data[j+1] !== b.data[j+1] ||
        a.data[j+2] !== b.data[j+2] || a.data[j+3] !== b.data[j+3]) count++;
  }
  return count;
}
const before = await revision(beforePath), after = await revision(afterPath);
const hash = buf => createHash('sha256').update(buf).digest('hex');
const result={before:before.sha,after:after.sha,subject:'pocket_magnet',variant:'normal',side:0,fps:24,clips:[]};
const chosen = {idle:[0],trick:[43,44,45,130,131,134],trick_b:[110,111,112,113,114,118]};
for (const [clip, examples] of Object.entries(chosen)) {
  const lengths=[before.length(clip),after.length(clip)];
  const pairs=[];
  const singles=[];
  let sheet,ctx,w,h;
  for (let i=0;i<Math.max(...lengths);i++) {
    const a=i<lengths[0] ? before.picture(clip,i) : null;
    const b=i<lengths[1] ? after.picture(clip,i) : null;
    if (a===null || b===null) {
      const p=a??b;
      singles.push({frame:i,side:a?'before':'after',rgba_sha256:hash(p.data)});
      continue;
    }
    const diff=changedPixels(a,b);
    pairs.push(diff);
    const col=examples.indexOf(i);
    if (col<0) continue;
    if (!sheet) {
      w=a.w;h=a.h;
      sheet=createCanvas((w+4)*examples.length,2*(h+20));ctx=sheet.getContext('2d');
      ctx.fillStyle='#172026';ctx.fillRect(0,0,sheet.width,sheet.height);
    }
    for (const [row,p] of [a,b].entries()) {
      const y=row*(h+20),x=col*(w+4);
      ctx.drawImage(p.canvas(),x,y);ctx.fillStyle='#fff';ctx.font='12px sans-serif';
      ctx.fillText((row?after.sha:before.sha).slice(0,7)+' · '+clip+' '+i,x+2,y+h+14);
    }
  }
  const file='b23-f0-pockets-'+clip+'.png';
  const png=sheet.toBuffer('image/png');writeFileSync(join(output,file),png);
  result.clips.push({clip,lengths,examined_pairs:pairs.length,different_pairs:pairs.filter(n=>n>0).length,
    max_different_pixels:Math.max(...pairs),different_pixels_per_display_frame:pairs,unpaired:singles,
    sheet:{file,sha256:hash(png),frames:examples,frame_width:w,frame_height:h}});
}
writeFileSync(join(output,'pocket-delta.json'),JSON.stringify(result,null,2)+'\n');
