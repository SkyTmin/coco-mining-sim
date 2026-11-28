// From tools/creatures: node --import tsx /path/to/scene-contracts.mjs > scene-contracts.json
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const load = file => import(pathToFileURL(join(process.cwd(), file)));
const {compose, loopSample} = await load('engine.ts');
const {Px} = await load('rig/px.ts');
const {sizeOf} = await load('types.ts');
const border = {wood:['#454544','#656565','#878787','#989898'], accent:'#aaaaaa'};
const ink = [232,50,26,255], post = [35,177,69,255], floorInk = [37,39,50,255];
const hash = p => createHash('sha256').update(p.data).digest('hex').slice(0,16);
const countDiff = (a,b) => {
    let n=0;
    for(let i=0;i<a.data.length;i+=4) {
        if(a.data[i]!==b.data[i] || a.data[i+1]!==b.data[i+1] || a.data[i+2]!==b.data[i+2] || a.data[i+3]!==b.data[i+3]) n++;
    }
    return n;
};
function scene({depth,extra=0,water=false,groundY=34}={}) {
    const s = (p,t) => {
        p.rect(0,0,p.w-1,p.h-1,floorInk);
        // One opaque pixel travels around a 72-frame background and returns exactly on the 72nd.
        p.set(Math.round(t*24)%72+1,4,[255,233,102,255]);
    };
    s.ground = () => groundY;
    s.front = Array.from({length:extra},(_,i)=>({
        id:'peg-'+i,depth:10+i/100,paint:p=>p.set(1+i%80,2+Math.floor(i/80),[83,156,202,255]),
    }));
    if(depth!==undefined) s.front.push({id:'posts',depth,paint:p=>{
        p.rect(31,14,37,46,post); p.rect(47,14,53,46,post);
    }});
    if(water) s.waterRows=Array.from({length:64},(_,y)=> y>=27 && y<=42 ? [22,54] : []);
    return s;
}
function creature({seconds=3,ghost=false,water=false,flight=0,fast=false,dx=0,dy=0}={}) {
    const px=new Px(11,15);
    px.rect(1,1,9,14,ink);
    return {
        id:'contract_fixture',rarity:'common',theme:'contract',size:[88,64,16,8],portraitOrigin:[34,34],
        animations:{idle:{seconds,loop:true}},
        frame:(anim,t)=>({
            px,anchor:[5,14],eye:null,points:{sole:[5,14],muzzle:[5,9]},primitives:1,
            planted:flight?[]:['sole'],dx:dx+(fast? (Math.round(t*24)%2 ? 30:-10):0),dy:dy-flight,
            ...(ghost?{ghost:{dx:16,dy:8,front:true,alpha:1}}:{}),
            ...(water?{waterContacts:[{socket:'muzzle',kind:0,phase:(Math.round(t*24)%24)/24,size:9}]}:{}),
        }),
    };
}
function render(c,s,n){return compose(c,s,border,'idle',n/24)}
const out={version:1,node:process.version,seed:25023,actors:[],loops:[],ground:[],water:[],order:[],trials:0};
for(const depth of [30,38,46]) {
    const c=creature({ghost:true}), s=scene({depth}), f=render(c,s,0), pad=sizeOf(c)[3];
    // Two grounded feet y=34,42. The same post is behind a nearer foot and in front of a farther foot.
    for(const [actor,x,y,footY] of [['rear',34,28,34],['near',50,36,42]]){
        const expected=depth>footY?post:ink,got=f.picture.get(pad+x,pad+y);
        out.actors.push({depth,actor,footY,expected,got,match:String(expected)===String(got)});
    }
}
for(const seconds of [1/24,0.5,1,1.5,2,3,6,9,300]) {
    const c=creature({seconds}), s=scene(), end=Math.round(seconds*24);
    const first=render(c,s,0), next=render(c,s,end), last=render(c,s,end-1);
    out.loops.push({seconds,frames:end,resetPhase:first.backgroundFrame,continuationPhase:next.backgroundFrame,lastPhase:last.backgroundFrame,
        continuationVsReset:countDiff(first.layers.bg,next.layers.bg),lastVsReset:countDiff(first.layers.bg,last.layers.bg)});
}
for(const [floor,flight] of [[34,0],[41,0],[34,9],[41,9]]) {
    const f=render(creature({flight}),scene({groundY:floor}),0);
    out.ground.push({floor,flight,sole:f.points.sole,declaredPlanted:f.body.planted,declaredFloorGap:floor-f.points.sole[1]});
}
const wetC=creature({water:true}),wet=scene({water:true}),dry=scene();
for(const n of [0,5,11,17,23,30,48,71]){
    const wetF=render(wetC,wet,n), dryF=render(wetC,dry,n);
    let changed=0,outsideWater=0;
    for(let y=0;y<80;y++)for(let x=0;x<104;x++){
        if(String(wetF.picture.get(x,y))!==String(dryF.picture.get(x,y))){
            changed++;
            if(x-8<22 || x-8>=54 || y-8<27 || y-8>42) outsideWater++;
        }
    }
    out.water.push({n,changed,outsideWater});
}
let state=out.seed;
function random(limit){state=(Math.imul(state,1664525)+1013904223)>>>0;return Math.floor(state/2**32*limit)}
for(const count of [0,1,16,64,257]){
    const c=creature({seconds:300,fast:true,ghost:true,water:true}),s=scene({depth:38,extra:count,water:true});
    const frames=Array.from({length:30},()=>random(7200)), expected=frames.map(n=>hash(render(c,s,n).picture));
    let mismatches=0;
    for(let i=frames.length-1;i>=0;i--) if(hash(render(c,s,frames[i]).picture)!==expected[i])mismatches++;
    out.order.push({props:count+1,frames:frames.length,uniqueFrames:new Set(frames).size,reversedMismatches:mismatches,firstFrame:frames[0],firstHash:expected[0]});
}
out.trials={actorPixelComparisons:out.actors.length,loopLengths:out.loops.length,groundCases:out.ground.length,waterFrames:out.water.length,randomOrderFrames:out.order.reduce((n,x)=>n+x.frames,0)};
console.log(JSON.stringify(out,null,2));
