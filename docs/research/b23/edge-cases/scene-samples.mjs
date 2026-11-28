// From tools/creatures: node --import tsx /path/to/scene-samples.mjs /tmp/edge-results
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
const out=process.argv[2], id=process.argv[3];
if(!out) throw Error('Pass a temporary output directory');
mkdirSync(out,{recursive:true});
const ids=['river_otter','bun_panda','eclipse_drake','threshold_keeper','moon_magician','pocket_magnet','lunar_plush','herald_griffin'];
if(!id){
    for(const name of ids){
        const result=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),out,name],{stdio:'inherit'});
        if(result.status!==0) throw Error('sample failed: '+name);
    }
} else {
    const load=file=>import(pathToFileURL(join(process.cwd(),file)));
    const {loadForHash}=await load('studio/snap.ts');
    const {compose}=await load('engine.ts');
    const {c,s,b}=await loadForHash(id);
    const ref=JSON.parse(readFileSync(join('golden',id+'.json'),'utf8'));
    const hsh=px=>createHash('sha1').update(px.data).digest('hex').slice(0,10);
    const diff=(a,b)=>{
        let n=0;
        for(let i=0;i<a.data.length;i+=4) {
            if(a.data[i]!==b.data[i]||a.data[i+1]!==b.data[i+1]||a.data[i+2]!==b.data[i+2]||a.data[i+3]!==b.data[i+3])n++;
        }
        return n;
    };
    const outRow={id,seed:2511,clips:{},sceneWater:!!s.waterRows,propCount:s.front?.length??0,loopChecks:[],maxPlantedShift:null,missingPlanted:[],continuousContacts:0};
    let seed=outRow.seed;
    function random(n){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/2**32*n)}
    const long=Object.keys(ref).sort((a,b)=>ref[b].length-ref[a].length)[0];
    const companion=Object.entries(c.animations).find(([,x])=>x.companion)?.[0];
    const observe=[...new Set(['idle','walk','trick','trick_b',long,companion].filter(k=>k && ref[k]))];
    for(const clip of observe){
        const count=ref[clip].length;
        const frames=[...new Set([0,count-1,...Array.from({length:10},()=>random(count-1)).flatMap(n=>[n,n+1])])].sort((a,b)=>a-b);
        const row={frames,hashMismatch:[],reverseMismatch:[],maxMove:0,waterFrames:0,waterContacts:0,bodyOverSceneGround:[],groundModel:typeof s.ground==='function',negativeGroundSamples:0};
        let prev;
        for(const n of frames){
            const f=compose(c,s,b,clip,n/24), actual=hsh(f.picture);
            if(actual!==ref[clip][n])row.hashMismatch.push({n,actual,expected:ref[clip][n]});
            if(f.waterContacts?.length){row.waterFrames++;row.waterContacts+=f.waterContacts.length}
            for(const name of f.body.planted??[]){
                if(!f.points[name]) {outRow.missingPlanted.push({clip,n,name});continue}
                if(prev && prev.n===n-1 && prev.points[name] && prev.planted.includes(name)){
                    const offset=Math.hypot(f.points[name][0]-prev.points[name][0],f.points[name][1]-prev.points[name][1]);
                    if(offset>row.maxMove)row.maxMove=offset;
                    outRow.continuousContacts++;
                    if(!outRow.maxPlantedShift || offset>outRow.maxPlantedShift.px)
                        outRow.maxPlantedShift={clip,n,socket:name,px:offset};
                }
                if(typeof s.ground==='function'){
                    const [x,y]=f.points[name],gap=s.ground(x)-y;
                    if(gap<0)row.negativeGroundSamples++;
                    if(row.bodyOverSceneGround.length<3)row.bodyOverSceneGround.push({n,name,gap});
                }
            }
            prev={n,points:f.points,planted:f.body.planted??[]};
        }
        const reverseFrames=[frames[frames.length-1],frames[Math.floor(frames.length/2)],frames[0]];
        for(const n of reverseFrames){
            const actual=hsh(compose(c,s,b,clip,n/24).picture);
            if(actual!==ref[clip][n])row.reverseMismatch.push(n);
        }
        outRow.clips[clip]=row;
    }
    for(const clip of Object.keys(ref).filter(k=>c.animations[k]?.loop && !k.includes('walk_'))){
        const n=ref[clip].length,first=compose(c,s,b,clip,0),last=compose(c,s,b,clip,(n-1)/24),after=compose(c,s,b,clip,n/24);
        outRow.loopChecks.push({clip,frames:n,reset:first.backgroundFrame,last:last.backgroundFrame,after:after.backgroundFrame,
            afterVsResetBG:diff(after.layers.bg,first.layers.bg),lastVsResetBG:diff(last.layers.bg,first.layers.bg),
            afterVsResetBody:diff(after.layers.body,first.layers.body)});
    }
    writeFileSync(join(out,id+'.json'),JSON.stringify(outRow,null,2)+'\n');
    console.log(id,observe.length);
}
