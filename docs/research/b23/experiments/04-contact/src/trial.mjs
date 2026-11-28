// Run from tools/creatures: node --import tsx /path/to/trial.mjs /temporary/output
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {continuousPairs,baseline,reportable,referenceDepth} from './detector.mjs';

const [out,subject]=process.argv.slice(2);
if(!out)throw Error('Supply a temporary output directory');
mkdirSync(out,{recursive:true});
const known=JSON.parse(readFileSync(new URL('known.json',import.meta.url),'utf8'));
const baseline8=['astral_seer','pocket_magnet','eclipse_drake','ember_panda','bun_panda','crater_titan','kettle_crab','moon_magician'];
const knownIds=known.map(x=>x.id);
const load=path=>import(pathToFileURL(join(process.cwd(),path)));
const native=await load('studio/clip.ts');
const {Rig,F3}=await load('rig/f15-rig.ts');
const limits=[native.CLIP_DEPTH,native.CLIP_DROP];
const exactPairs=rig=>continuousPairs(rig,native.primitivesOf);
const exactBase=rig=>baseline(rig,exactPairs(rig));
const same=(a,b)=>a?.cap===b?.cap && a?.ell===b?.ell;
const stamp=()=>Number(process.hrtime.bigint())/1e6;
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const material={T:[[30,36,44,255],[51,58,64,255],[65,87,110,255],[98,112,127,255]]};

function synthetic(){
    let seed=420261128;
    const rng=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32};
    const norm=x=>Math.hypot(...x);
    const unit=v=>{const m=norm(v);return v.map(x=>x/m)};
    function geometry(spec,offset){
        const f=F3.yaw(spec.angle,[11,-12,25]),r=new Rig();
        r.tag='torso';r.ell(f,[0,0,0],spec.radii,material);
        const p=t=>{
            const q=spec.dir.map((v,i)=>v*spec.length*(t-spec.at)+spec.perp[i]*offset);
            return f.p(...q.map((x,i)=>x*spec.radii[i]));
        };
        r.tag='leaf';r.cap(p(0),p(1),spec.rod,spec.rod,material);
        const {ells,caps}=native.primitivesOf(r), e=ells[0],c=caps[0];
        if(e.radii.reduce((a,b)=>a*b,1)<3*c.r*c.r*(c.len+c.r))throw Error('volume precondition');
        return r;
    }
    const matrix={sampled:{tp:0,fn:0,fp:0,tn:0},continuous:{tp:0,fn:0,fp:0,tn:0}};
    let maxAbsError=0,maxSampleError=0;
    const controls=[];
    for(let i=0;i<1200;i++){
        const dir=unit([2*rng()-1,2*rng()-1,2*rng()-1]);
        const perp=unit(Math.abs(dir[2])<0.9?[dir[1],-dir[0],0]:[dir[2],0,-dir[0]]);
        const radii=[2+8*rng(),2+14*rng(),2+18*rng()];
        const spec={radii,dir,perp,length:8+32*rng(),at:.06+.88*rng(),angle:rng()*Math.PI*2,rod:Math.min(...radii)*(.025+.025*rng())};
        const off=i%2===0 ? .5*rng() : .61+1.1*rng();
        const r=geometry(spec,off), rest=geometry(spec,4), truth=off<limits[0];
        const nativeRest=native.baselineOf(rest), exactRest=exactBase(rest);
        const nativeHit=native.worstClip(r,nativeRest), exactList=exactPairs(r);
        const exactHit=reportable(r,exactList,[exactRest],[],...limits)[0];
        for(const [key,hit] of [['sampled',nativeHit],['continuous',exactHit]])matrix[key][truth?(hit?'tp':'fn'):(hit?'fp':'tn')]++;
        if(off<1){
            const geometric=exactList[0];
            if(!geometric)throw Error('exact intersection missing at '+i);
            maxAbsError=Math.max(maxAbsError,Math.abs(geometric.depth-off));
            const sparse=native.clipPairs(r)[0];
            if(sparse)maxSampleError=Math.max(maxSampleError,Math.abs(sparse.depth-off));
        }
        if(i===0){
            function control(name,pose,original,allow,should){
                const a=!!native.worstClip(pose,native.baselineOf(original),allow);
                const b=!!reportable(pose,exactPairs(pose),[exactBase(original)],allow,...limits).length;
                controls.push({name,expected:should,sampled:a,continuous:b});
                if(a!==should || b!==should)throw Error('failed intentional control '+name);
            }
            const anchor={...spec,at:0.5,length:12};
            const inPose=geometry(anchor,0),outPose=geometry(anchor,4);
            control('designed-in-rest',inPose,inPose,[],false);
            control('permitted-prop-vs-torso',inPose,outPose,[{a:'leaf',b:'torso'}],false);
            control('deep-visible-geometric',inPose,outPose,[],true);
            control('superficial-axis',geometry(anchor,0.75),outPose,[],false);
            control('depth.just-below',geometry(anchor,limits[0]-1e-6),outPose,[],true);
            control('depth.just-above',geometry(anchor,limits[0]+1e-6),outPose,[],false);
            control('drop.just-below',geometry(anchor,0.4),geometry(anchor,0.4+limits[1]-1e-6),[],false);
            control('drop.just-above',geometry(anchor,0.4),geometry(anchor,0.4+limits[1]+1e-6),[],true);
            control('point-segment-inside',geometry({...anchor,length:0},0.2),outPose,[],true);
            control('point-segment-outside',geometry({...anchor,length:0},1.4),outPose,[],false);
            control('outside-segment',geometry({...anchor,at:-0.25},0),outPose,[],false);
        }
    }
    return {revision,node:process.version,seed:420261128,generated:1200,matrix,maxAbsError,maxSampleErrorOnReturnedPairs:maxSampleError,controls};
}

async function painting(id){
    const {loadPainting}=await load('render.ts'),{compose}=await load('engine.ts');
    const {captureRig}=await load('studio/capture.ts'),{studioConfig,skipped}=await load('studio/checks.ts');
    const started=stamp(),p=await loadPainting(id),ref=JSON.parse(readFileSync(join('golden',id+'.json'),'utf8')),cfg=studioConfig(id);
    const loadAndGoldenMs=stamp()-started;
    let renderAndCaptureMs=0, capturedFrames=0;
    const allowed=cfg.clipAllow??[],rows=new Map(),baselines=new Map();
    const firstTrick=Object.keys(p.c.animations).find(k=>k==='trick')??Object.keys(p.c.animations).find(k=>k.startsWith('tech_'));
    function add(clip,frame,source){
        const key=clip+'/'+frame,entry=rows.get(key)??{clip,frame,baseline:false,intentional:false,known:[]};
        if(source==='baseline')entry.baseline=true;
        else if(source==='intentional')entry.intentional=true;
        else entry.known.push(source);
        rows.set(key,entry);
    }
    if(baseline8.includes(id))for(const clip of ['idle','walk',firstTrick].filter(Boolean)){
        const frames=ref[clip].length;
        for(const fraction of [0,.25,.5,.75])add(clip,Math.floor(frames*fraction),'baseline');
    }
    if(id==='kettle_crab')for(let n=54;n<=84;n++)add('trick_b',n,'intentional');
    for(const row of known.filter(x=>x.id===id))add(row.clip,row.frame,row);
    function render(clip,frame){
        const before=stamp();
        const observed=captureRig(()=>compose(p.c,p.s,p.b,clip,frame/24));
        renderAndCaptureMs+=stamp()-before;capturedFrames++;
        return observed;
    }
    function getBase(clip){
        if(!baselines.has(clip)){
            const {rig}=render(clip,0);
            if(!rig)throw Error('no reference rig '+id+'/'+clip);
            baselines.set(clip,{sampled:native.baselineOf(rig),exact:exactBase(rig)});
        }
        return baselines.get(clip);
    }
    const timings=[],summary=[],rigs=[];
    for(const entry of rows.values()){
        const {clip,frame}=entry;
        const {rig,result}=render(clip,frame);
        if(!rig)throw Error('no yielded rig '+id+'/'+clip+'/'+frame);
        const sha=createHash('sha1').update(result.picture.data).digest('hex').slice(0,10);
        if(sha!==ref[clip][frame])throw Error('native golden mismatch '+id+'/'+clip+'/'+frame+': '+sha+' '+ref[clip][frame]);
        const names=['idle',clip];if(p.c.animations['idle-f2'] && ['phase','idle-f2','show'].includes(clip))names.push('idle-f2');
        const bs=[...new Set(names)].map(getBase);
        const isSkipped=skipped(cfg,'clip',clip,frame);
        const measured=native.clipPairs(rig);
        const sampled=reportable(rig,measured,bs.map(x=>x.sampled),allowed,...limits);
        const continuous=exactPairs(rig);
        const exact=reportable(rig,continuous,bs.map(x=>x.exact),allowed,...limits);
        const nativeWorst=native.worstClip(rig,bs.map(x=>x.sampled),allowed);
        if(!same(nativeWorst,sampled[0]))throw Error('filter does not reproduce native worstClip '+id+'/'+clip+'/'+frame);
        const describe=x=>x?{cap:x.capLabel,ell:x.ellLabel,capIndex:x.cap,ellIndex:x.ell,depth:x.depth}:null;
        const ids=arr=>new Map(arr.map(x=>[x.cap+':'+x.ell,x]));
        const exactIds=ids(exact),sampleIds=ids(sampled);
        const added=exact.filter(x=>!sampleIds.has(x.cap+':'+x.ell));
        const lost=sampled.filter(x=>!exactIds.has(x.cap+':'+x.ell));
        const rawS=ids(measured), rawE=ids(continuous);
        const explore=hit=>{
            const key=hit.cap+':'+hit.ell;
            const currentSampled=rawS.get(key)?.depth ?? null,currentExact=rawE.get(key)?.depth ?? null;
            const restSampled=referenceDepth(rig,hit,bs.map(x=>x.sampled));
            const restExact=referenceDepth(rig,hit,bs.map(x=>x.exact));
            const oldDrop=currentSampled===null?null:restSampled-currentSampled;
            const newDrop=currentExact===null?null:restExact-currentExact;
            const sampledCurrentExactRest=currentSampled===null?null:restExact-currentSampled;
            return {cap:hit.capLabel,ell:hit.ellLabel,capIndex:hit.cap,ellIndex:hit.ell,currentSampled,currentExact,
                restSampled,restExact,oldDrop,newDrop,sampledCurrentExactRest};
        };
        let intended;
        if(entry.intentional){
            const beforePermissions=reportable(rig,continuous,bs.map(x=>x.exact),[],...limits);
            const bubbles=xs=>xs.filter(x=>x.capLabel.includes('bubble') || x.ellLabel.includes('bubble'));
            intended={raw:bubbles(beforePermissions).length,after:bubbles(exact).length,
                examples:bubbles(beforePermissions).slice(0,3).map(describe)};
        }
        const historical=entry.known.map(k=>{
            const match=x=>x.capLabel===k.cap && x.ellLabel===k.ell;
            return {ciLine:k.ciLine,cap:k.cap,ell:k.ell,sampled:sampled.some(match),exact:exact.some(match)};
        });
        summary.push({clip,frame,baseline:entry.baseline,intended,skipped:isSkipped,golden:sha,primitives:rig.prims.length,historical,
            sampledWorst:describe(sampled[0]),exactWorst:describe(exact[0]),sampledPairs:sampled.length,exactPairs:exact.length,
            added:added.map(explore),lost:lost.map(explore)});
        if(!baseline8.includes(id) || entry.baseline)rigs.push(rig);
    }
    const captureAndValidationMs=stamp()-started;
    // Same poses, same material and volume filters. Timing contains primitive extraction and pair generation.
    // First calls in the verification phase above warm both kernels.
    for(let trial=0;trial<3;trial++){
        const order=trial%2?['continuous','sampled']:['sampled','continuous'];
        const time={order};
        for(const name of order){
            const fn=name==='sampled'?native.clipPairs:exactPairs,wall=stamp(),cpu=process.cpuUsage();
            let n=0;
            for(const rig of rigs)n+=fn(rig).length;
            const usage=process.cpuUsage(cpu);
            time[name]={wallMs:stamp()-wall,cpuMs:(usage.user+usage.system)/1000,pairsBeforeBaseline:n};
        }
        timings.push(time);
    }
    return {id,revision,node:process.version,baseline8:baseline8.includes(id),captureAndValidationMs,loadAndGoldenMs,renderAndCaptureMs,capturedFrames,timedRigCount:rigs.length,timings,summary};
}

if(subject==='synthetic'){
    writeFileSync(join(out,'synthetic.json'),JSON.stringify(synthetic(),null,2)+'\n');
} else if(subject){
    writeFileSync(join(out,subject+'.json'),JSON.stringify(await painting(subject),null,2)+'\n');
} else {
    for(const id of ['synthetic',...new Set([...baseline8,...knownIds])]){
        const proc=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),out,id],{stdio:'inherit'});
        if(proc.status!==0)throw Error('experiment stopped in '+id);
    }
}
