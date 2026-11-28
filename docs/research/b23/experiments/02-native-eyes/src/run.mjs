// Run in tools/creatures with the local dependencies and node --import tsx.
// One worker per painting bounds native canvas memory. All writes stay under the supplied output.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const file = fileURLToPath(import.meta.url);
const inputs = JSON.parse(readFileSync(new URL('./inputs.json', import.meta.url)));
const [output, id] = process.argv.slice(2);
if (!output) throw Error('Pass an output directory outside the product checkout');
const out = resolve(output);
const controlRevision = 'c1eaf999c09d53ff72385721ddb09eaff1949b62';
const frozen = spawnSync('git',['diff','--quiet',controlRevision,'--','.','../../assets/creatures']);
if(frozen.status!==0) throw Error('Control rendering source or tracked assets differ from '+controlRevision);
mkdirSync(out, {recursive: true});
const digest = data => createHash('sha256').update(data).digest('hex');
const moduleAt = name => import(pathToFileURL(resolve(name)).href);
function bodyRect(layer) {
  let x0=layer.w, y0=layer.h, x1=-1, y1=-1;
  for(let i=3;i<layer.data.length;i+=4) {
    if(layer.data[i]===0) continue;
    const n=(i-3)/4, x=n%layer.w, y=Math.floor(n/layer.w);
    x0=Math.min(x0,x); y0=Math.min(y0,y); x1=Math.max(x1,x); y1=Math.max(y1,y);
  }
  if(x1<0) return null;
  return [Math.max(0,x0-6),Math.max(0,y0-6),Math.min(layer.w-1,x1+6),Math.min(layer.h-1,y1+6)];
}
function diff(a,b,rect) {
  if(a.w!==b.w || a.h!==b.h) throw Error('Incomparable native rasters');
  let full=0,near=0;
  for(let i=0;i<a.data.length;i+=4) {
    if(a.data[i]===b.data[i] && a.data[i+1]===b.data[i+1] &&
        a.data[i+2]===b.data[i+2] && a.data[i+3]===b.data[i+3]) continue;
    full++;
    const n=i/4, x=n%a.w, y=Math.floor(n/a.w);
    if(rect && x>=rect[0] && y>=rect[1] && x<=rect[2] && y<=rect[3]) near++;
  }
  return {full,near,outside:full-near};
}
function strip(createCanvas, frames, ids, target, columns=3) {
  const first=frames.get(ids[0]), w=first.w, h=first.h;
  const canvas=createCanvas(columns*w,Math.ceil(ids.length/columns)*(h+17));
  const ctx=canvas.getContext('2d'); ctx.fillStyle='#171719'; ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const [i,n] of ids.entries()) {
    const p=frames.get(n), x=(i%columns)*w, y=Math.floor(i/columns)*(h+17);
    ctx.drawImage(p.canvas(),x,y+17); ctx.fillStyle='#eeeeee'; ctx.font='12px sans-serif';
    ctx.fillText(String(n),x+4,y+13);
  }
  writeFileSync(target,canvas.toBuffer('image/png'));
}
function writePlayback(pictures, indices, width, height, target) {
  const input=Buffer.concat(indices.map(n=>Buffer.from(pictures.get(n).data)));
  const encode=spawnSync('ffmpeg',['-v','error','-y','-f','rawvideo','-pix_fmt','rgba',
    '-s',width+'x'+height,'-framerate','24','-i','-','-c:v','ffv1','-threads','1','-pix_fmt','bgra',target],{input});
  if(encode.status!==0) throw Error('ffmpeg encode: '+(encode.stderr?.toString() || encode.error));
  const decode=spawnSync('ffmpeg',['-v','error','-i',target,'-f','rawvideo','-pix_fmt','rgba','-threads','1','-'],
    {maxBuffer:input.length+1048576});
  if(decode.status!==0 || !input.equals(decode.stdout)) throw Error('Native playback bytes differ '+target);
  return {start:indices[0],end:indices.at(-1),frames:indices.length,fps:24,width,height,
    rgbaSequenceSha256:digest(input),videoSha256:digest(readFileSync(target))};
}
async function subject(item) {
  const { loadPainting }=await moduleAt('render.ts');
  const { compose }=await moduleAt('engine.ts');
  const { createCanvas }=createRequire(resolve('package.json'))('@napi-rs/canvas');
  const {c,s,b}=await loadPainting(item.id);
  const count=Math.round(c.animations[item.anim].seconds*24);
  if(count!==item.total) throw Error(item.id+' frame count changed: '+count);
  const rawOnly={...c,props:undefined,effects:undefined};
  const get=(actor,n)=>compose(actor,s,b,item.anim,n/24,0,'normal');
  const union=new Set([...item.uniform,...item.phases]);
  const controlUniform=item.uniform.find(n=>n>0 && !item.phases.includes(n));
  const controlUnseen=Array.from({length:count-1},(_,i)=>i+1).find(n=>!union.has(n));
  const controls=[['authored neighbour',item.focus+1],['uniform only',controlUniform],['unseen',controlUnseen]];
  const wanted=new Set([...union,...controls.flatMap(([,n])=>[n,n-1])]);
  if(item.id==='astral_seer') for(const m of [24,57,77,96]) for(let n=m-1;n<=m+1;n++) wanted.add(n);
  if(item.id==='kettle_crab') for(const n of [58,59,60,61,62]) wanted.add(n);
  const from=item.id==='astral_seer'?0:Math.max(0,Math.min(count-24,item.focus-12));
  const duration=item.id==='astral_seer'?count:24;
  const playbackIndices=Array.from({length:duration},(_,i)=>from+i);
  for(const n of playbackIndices) wanted.add(n);
  const pictures=new Map(), rects=new Map(), effects=[];
  const begin=performance.now();
  for(const n of [...wanted].sort((a,b)=>a-b)) {
    const ref=get(c,n), img=ref.picture, near=bodyRect(ref.layers.body);
    if(img.w!==item.w || img.h!==item.h) throw Error(item.id+' native dimensions changed');
    pictures.set(n,img); rects.set(n,near);
    if(union.has(n)) {
      const ablated=get(rawOnly,n).picture;
      effects.push({frame:n,rect:near,roiArea:near?(near[2]-near[0]+1)*(near[3]-near[1]+1):0,
        ...diff(img,ablated,near),rgba:digest(img.data)});
    }
  }
  const same=diff(pictures.get(item.focus),get(c,item.focus).picture,rects.get(item.focus));
  if(same.full!==0) throw Error(item.id+' unchanged input differs');
  const mutations=controls.map(([kind,n])=>({kind,frame:n,
    pixelDelta:diff(pictures.get(n),pictures.get(n-1),rects.get(n)),
    uniform:item.uniform.includes(n),phase:item.phases.includes(n)}));
  const summarize=chosen=>{
    const rows=effects.filter(r=>chosen.includes(r.frame));
    return {frames:rows.length,withEffect:rows.filter(r=>r.full>0).length,
      full:rows.reduce((v,r)=>v+r.full,0),near:rows.reduce((v,r)=>v+r.near,0),
      outside:rows.reduce((v,r)=>v+r.outside,0),roiArea:rows.reduce((v,r)=>v+r.roiArea,0),
      canvasArea:rows.length*item.h*item.w,
      completelyMissed:rows.filter(r=>r.full>0 && r.near===0).map(r=>r.frame)};
  };
  const windows=item.id==='astral_seer'?[24,57,77,96]:[item.focus];
  const dynamics=windows.map(n=>({frame:n,
    before:diff(pictures.get(n-1),pictures.get(n),rects.get(n)),
    after:diff(pictures.get(n),pictures.get(n+1),rects.get(n+1))}));
  strip(createCanvas,pictures,item.uniform,join(out,item.id+'-uniform.png'));
  strip(createCanvas,pictures,item.phases,join(out,item.id+'-phases.png'));
  strip(createCanvas,pictures,windows.flatMap(n=>[n-1,n,n+1]),join(out,item.id+'-adjacent.png'));
  if(item.id==='kettle_crab') strip(createCanvas,pictures,[58,59,60,61,62],join(out,'negative-intended-exit.png'),5);
  const playback=writePlayback(pictures,playbackIndices,item.w,item.h,join(out,item.id+'-native.mkv'));
  const info={...item,effects,dynamics,mutations,negativeRepeated:same,playback,
    uniformArea:summarize(item.uniform),phaseArea:summarize(item.phases),
    renderedOriginalFrames:wanted.size+1,renderedAblations:union.size,
    computationMs:Math.round(performance.now()-begin),maxRssKiB:process.resourceUsage().maxRSS};
  writeFileSync(join(out,item.id+'.json'),JSON.stringify(info,null,2)+'\n');
}
if(id) {
  const item=inputs.find(row=>row.id===id); if(!item) throw Error('Unknown painting '+id);
  await subject(item);
} else {
  const start=performance.now();
  for(const {id:subjectId} of inputs) {
    const r=spawnSync(process.execPath,['--import','tsx',file,out,subjectId],{stdio:'inherit'});
    if(r.status!==0) throw Error(subjectId+' failed: '+(r.error?.message ?? r.signal ?? r.status));
  }
  const records=inputs.map(row=>JSON.parse(readFileSync(join(out,row.id+'.json'))));
  const summary={controlRevision,source:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),
    frozenManifest:digest(readFileSync(new URL('./inputs.json',import.meta.url))),
    node:process.version,elapsedMs:Math.round(performance.now()-start),records:records.map(r=>({
    id:r.id,clip:r.anim,uniform:r.uniformArea,phase:r.phaseArea,mutations:r.mutations,
    unchanged:r.negativeRepeated.full,playback:r.playback,renderedOriginalFrames:r.renderedOriginalFrames,
    renderedAblations:r.renderedAblations,ms:r.computationMs,maxRssKiB:r.maxRssKiB}))};
  writeFileSync(join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
}
