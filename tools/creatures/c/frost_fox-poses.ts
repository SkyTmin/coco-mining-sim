import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
export const clips = {
  ...everyday, happy:{seconds:2}, trick:{seconds:3.75}, fidget_a:{seconds:2}, fidget_b:{seconds:2},
  sleep:{seconds:3.5,loop:true}, sleep_in:{seconds:1.25}, sleep_out:{seconds:1.25}, wake_startled:{seconds:1},
};
type Track = [number,JointPose][];
const paw = (name:string,x:number,y:number,z:number)=>reach(name,[x,y,z]);
const sleeping = {sleep:1,blink:1};
const lap = Math.PI * 2;
export const tracks:Record<string,Track> = {
  idle:[[0,{}],[21,{'head.pitch':-.06,earLift:.35}],[39,{tailFan:.3,'head.yaw':-.09}],[61,{earFold:.18}],[71,{}]],
  look:[[0,{}],[8,{earLift:1}],[16,{'head.yaw':-.95,'head.pitch':-.19}],[25,{'head.yaw':.25,earLift:1.1}],[35,{}]],
  fidget_a:[[0,{}],[10,{'head.yaw':.45,earFold:.32}],[22,{...paw('foreR',20,8,18),'head.pitch':.61,crouch:3,earFold:.5}],
    [28,{...paw('foreR',24,10,20),'head.pitch':.45,'head.yaw':.24}],[38,{earLift:1}],[47,{}]],
  fidget_b:[[0,{}],[10,{'head.yaw':-.64,'tail.yaw':-.25}],[21,{'head.yaw':-1.12,twist:-.31,tailFan:.93,tailCurl:.9}],
    [30,{'head.yaw':-.54,tailLift:1.5,earFold:.52}],[39,{'tail.yaw':.43}],[47,{}]],
  happy:[[0,{}],[4,{earLift:1.5,...paw('foreR',18,9,9),tailFan:.75,'head.yaw':.22}],
    [10,{pitch:.46,crouch:5,tailFan:1.5,tailLift:1.1,'head.pitch':-.26,...paw('foreR',25,8,0),...paw('foreL',24,-7,0)}],
    [17,{pitch:-.37,roll:.2,...paw('foreL',20,-9,13),tailLift:.8,'head.yaw':-.34}],
    [23,{pitch:-.27,roll:-.23,...paw('foreR',21,10,17),earLift:1.4,tailFan:1.3}],
    [30,{jump:8,dx:6,roll:-.18,'tail.yaw':.45,'head.yaw':.3}],[36,{crouch:6,dx:7,tailFan:1.9,tailLift:1.05}],
    [41,{earLift:1.4,'head.pitch':-.3,tailCurl:.8}],[47,{}]],
  trick:[[0,{}],[6,{'head.yaw':-1.15,earLift:.8,tailFan:1.4}],[11,{yaw:.55,'head.yaw':-.52,dx:5,dy:2,crouch:4,tailFan:1.1}],
    [18,{yaw:2.12,dx:10,dy:5,roll:-.25,tailFan:1.1,...paw('foreR',-8,16,6)}],
    [25,{yaw:3.9,dx:-1,dy:4,roll:-.3,tailLift:.55,tailFan:.9}],
    [32,{yaw:5.47,dx:-12,dy:0,pitch:.18,crouch:3,tailFan:1}],
    [39,{yaw:lap,dx:-18,crouch:8,pitch:.21,tailFan:1.1,earFold:.66}],
    [46,{yaw:lap,dx:-10,jump:12,pitch:-.28,tailLift:-.75,earFold:.4}],
    [53,{yaw:lap,dx:2,jump:25,pitch:-.12,tailLift:-1.5,earFold:.9,...paw('foreR',18,7,34),...paw('foreL',16,-6,32),...paw('hindR',-20,7,28)}],
    [59,{yaw:lap,dx:14,jump:16,pitch:.30,tailLift:-.95,earFold:.5}],
    [66,{yaw:lap,dx:19,crouch:7,pitch:.28,tailLift:.22}],[71,{yaw:lap,dx:13,'head.pitch':-.36,earLift:1}],
    [77,{yaw:lap,dx:5,'head.pitch':-.42,'head.yaw':-.22,tailFan:.66}],
    [82,{yaw:lap,'head.pitch':-.33,earFold:.2}],[89,{yaw:lap}]],
  sleep_in:[[0,{}],[9,{sleep:.18,'head.pitch':-.35,earLift:.8}],[17,{sleep:.67,'head.yaw':.32}],[24,sleeping],[29,sleeping]],
  sleep_out:[[0,sleeping],[8,{sleep:.8,earLift:.55}],[17,{sleep:.33,pitch:.19,tailLift:1}],[23,{'head.pitch':-.25,earLift:1}],[29,{}]],
  wake_startled:[[0,sleeping],[4,{sleep:.74,earLift:1.7}],[9,{jump:5,earLift:1.8,tailFan:1.5}],[15,{pitch:.23,crouch:4,'head.yaw':-.48}],[23,{}]],
  hatch:[[0,{}],[9,{earFold:.72,'head.pitch':.32}],[18,{tailLift:1.4,tailFan:1.8,earLift:1.6}],
    [26,{...paw('foreR',17,9,7),'head.yaw':.28,earLift:1}],[35,{}]],
};
export function gesture(anim:string,t:number):JointPose {
  if(anim==='sleep')return sleeping;
  const track=tracks[anim];
  if(!track)return {};
  const frame=t*24, index=track.findIndex(([n])=>n>=frame);
  if(index<=0)return track[index===0?0:track.length-1][1];
  const [lo,a]=track[index-1],[hi,b]=track[index];
  const u=(frame-lo)/(hi-lo);
  const s=anim==='trick' && lo>=11 && hi<=32 ? u : u*u*(3-2*u);
  const result:JointPose={};
  for(const name of new Set([...Object.keys(a),...Object.keys(b)]))
    result[name]=(a[name]??0)*(1-s)+(b[name]??0)*s;
  if(anim==='trick' && frame>=8 && frame<=39) {
    // Four-beat footfalls around the circle, in the rotating pelvis frame.
    const strength=Math.min(1,(frame-8)/4,(39-frame)/4);
    const yaw=result.yaw??0, c=Math.cos(yaw), s=Math.sin(yaw);
    for(const [leg,fore,side,phase] of [
      ['foreL',1,-1,.51],['foreR',1,1,.01],['hindL',-1,-1,.11],['hindR',-1,1,.61],
    ] as const) {
      const a=((frame-8)/9+phase)*2*Math.PI;
      const x=fore*12.74+5*Math.cos(a)*strength, y=side*6.3;
      Object.assign(result,paw(leg,x*c-y*s,x*s+y*c,6*Math.max(0,Math.sin(a))*strength));
    }
  }
  return result;
}
