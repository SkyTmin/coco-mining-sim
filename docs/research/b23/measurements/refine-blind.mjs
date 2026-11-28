// Targeted follow-up to a blind first pass. Pass the output directory from blind-sheets.mjs.
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
const out=resolve(process.argv[2]), map=JSON.parse(readFileSync(join(out,'identity.json'),'utf8'));
const local=path=>import(pathToFileURL(resolve(path)).href);
const {compose}=await local('engine.ts'),{loadPainting}=await local('render.ts');
const {createCanvas}=createRequire(resolve('package.json'))('@napi-rs/canvas');
const requested={C:[[31,35],[228,232]],E:[[100,106],[170,174]],F:[[129,131]],D:[[58,62]]};
for(const [code,ranges] of Object.entries(requested)){
  const {id,anim,total}=map.find(p=>p.key===code);
  const {c,s,b}=await loadPainting(id);
  for(const [lo,hi] of ranges){
    if (hi>=total) throw Error('Frame outside clip '+code+' '+hi+'/'+total);
    const indices=Array.from({length:hi-lo+1},(_,j)=>lo+j);
    const frames=indices.map(n=>compose(c,s,b,anim,n/24,0,'normal').picture);
    const {w,h}=frames[0], cols=3, sheet=createCanvas((w+4)*cols,(h+17)*Math.ceil(frames.length/cols));
    const ctx=sheet.getContext('2d');ctx.fillStyle='#19242b';ctx.fillRect(0,0,sheet.width,sheet.height);
    frames.forEach((p,j)=>{const x=j%cols*(w+4),y=Math.floor(j/cols)*(h+17);
      ctx.drawImage(p.canvas(),x,y);ctx.font='12px sans-serif';ctx.fillStyle='#e4e2da';ctx.fillText(String(indices[j]),x+3,y+h+13);});
    writeFileSync(join(out,'viewers',code+'-'+lo+'-'+hi+'.png'),sheet.toBuffer('image/png'));
  }
}
const {id: transitionId} = map.find(p => p.key === 'F');
const {c: actor, s: scene, b: border} = await loadPainting(transitionId);
const {createPetBehavior} = await local('viewer/behavior.mjs');
const {savePNG} = await local('render-io.ts');
const config = JSON.parse(readFileSync(resolve('../../assets/creatures', transitionId, 'behavior.json'),'utf8'));
const machine = createPetBehavior(config,actor.animations);
machine.event('double_tap');
const before = machine.advance(131/24), after=machine.advance(1/24);
if (before.anim !== 'trick' || before.frame !== 131) throw Error('Unexpected phase before transition');
savePNG(join(out,'viewers','F-132.png'),compose(actor,scene,border,after.anim,after.frame/24,0,'normal').picture);
