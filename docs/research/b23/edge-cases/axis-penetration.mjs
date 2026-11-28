// From tools/creatures: node --import tsx /path/to/axis-penetration.mjs
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const load = file => import(pathToFileURL(join(process.cwd(), file)));
const {Rig} = await load('rig/f15-rig.ts');
const {baselineOf,worstClip,clipPairs,CLIP_DEPTH,CLIP_DROP}=await load('studio/clip.ts');
const m={T:[[25,66,40,255],[32,89,63,255],[65,134,74,255],[104,171,88,255]]};
function run({radius,length,shaft,at,off}){
    function rig(y) {
        const r=new Rig();
        r.tag='torso';r.ball([at*length,0,0],radius,m);
        r.tag='shaft';r.cap([0,y,0],[length,y,0],shaft,shaft,m);
        return r;
    }
    const pose=rig(off), rest=baselineOf(rig(3*radius+shaft));
    const exact=Math.abs(off)/radius; // center projects into the segment by construction (0 < at < 1).
    if(radius**3<3*shaft**2*(length+shaft))throw Error('invalid fixture volume');
    return {exact,shouldReport:exact<CLIP_DEPTH && 1-exact>CLIP_DROP,sampled:clipPairs(pose)[0]?.depth??null,reported:!!worstClip(pose,rest)};
}
const controls=[
    {radius:4,length:90,shaft:0.4,at:0.45,off:0},
    {radius:4,length:90,shaft:0.4,at:0.5,off:0},
    {radius:4,length:90,shaft:0.4,at:0.45,off:5},
];
const out={seed:52023,controls:controls.map(params=>({params,...run(params)})),ranges:{ratio8to15:{},ratio15to25:{},ratio25to40:{}}};
let state=out.seed;
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32};
for(const [key,lo,hi] of [['ratio8to15',8,15],['ratio15to25',15,25],['ratio25to40',25,40]]){
 const v={cases:0,exactDeep:0,reported:0,missed:0,falsePositive:0};
 for(let i=0;i<500;i++){
    const radius=2+8*random(),length=radius*(lo+(hi-lo)*random()),shaft=radius*(0.03+0.04*random());
    const at=0.06+0.88*random(),off=radius*(i%2===0?0.5*random():0.6+random());
    const r=run({radius,length,shaft,at,off});
    v.cases++;if(r.shouldReport)v.exactDeep++;if(r.reported)v.reported++;
    if(r.shouldReport&&!r.reported)v.missed++;
    if(!r.shouldReport&&r.reported)v.falsePositive++;
 }
 out.ranges[key]=v;
}
console.log(JSON.stringify(out,null,2));
