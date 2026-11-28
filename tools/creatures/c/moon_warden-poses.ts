import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

export const clips = {
  ...everyday,
  fidget_a: { seconds: 2 }, fidget_b: { seconds: 2 },
  happy: { seconds: 2 }, trick: { seconds: 3.75 },
  sleep: { seconds: 3.5, loop: true },
  sleep_in: { seconds: 1.25 }, sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
const asleep = { sleep: 1, blink: 1, nod: .42, ear: -.24 };
const left = (x: number,y: number,z: number) => reach('handL',[x,y,z]);
const right = (x: number,y: number,z: number) => reach('handR',[x,y,z]);
const flying = (x: number,y: number,z: number) => reach('weaponGrip',[x,y,z]);
const foot = (name: 'L'|'R',x: number,y: number,z: number) => reach('foot'+name,[x,y,z]);
type Track = [number, JointPose][];
const tracks: Record<string, Track> = {
  idle: [[0,{}],[14,{nod:-.09,ear:.09}],[33,{pitch:.09,squat:1.5,roll:.07}],
    [47,{gaze:.18,ear:-.13}],[60,{blink:1}],[65,{ear:.09}],[71,{}]],
  look: [[0,{}],[8,{ear:-.37,nod:.19,shaftPitch:-.036}],[16,{gaze:-.78,nod:-.23,twist:-.13}],
    [26,{gaze:.69,ear:-.12,twist:.24}],[35,{}]],
  fidget_a: [[0,{}],[9,{nod:.38,gaze:-.21}],
    [20,{...left(11,-5,44),ear:-.61,nod:.37,pitch:.055,roll:.06,shaftPitch:.036,squat:-2,twist:.027}],[28,{...left(12,-2,50),nod:.36,twist:-.18}],
    [38,{...left(10,-14,36),nod:-.17,roll:-.12}],[47,{}]],
  fidget_b: [[0,{}],[8,{ear:.32,gaze:-.23}],[19,{...left(1,-12,66),ear:-.7,nod:.25,roll:-.076,twist:-.135,shaftPitch:.21,pitch:-.15,squat:-2}],
    [28,{...left(-5,-11,65),ear:-.28,nod:.39}],[36,{ear:.43,gaze:.46}],[47,{}]],
  happy: [[0,{}],
    [4,{...foot('L',12,-15,11),shaftPitch:.72,ear:.59,roll:.19,smile:1}],
    [7,{squat:7,pitch:.26,shaftPitch:.24,ear:.55,smile:1}],
    [11,{...foot('R',-7,16,13),shaftPitch:-.72,roll:-.22,ear:.68,smile:1}],
    [15,{...foot('R',-12,20,12),...left(8,-22,57),roll:-.28,twist:.48,ear:.35,smile:1}],
    [21,{squat:4,twist:-.27,ear:-.12,smile:1}],
    [27,{jump:10,...foot('L',-4,-1,15),...foot('R',-4,1,15),tuck:.67,twist:-.63,roll:.30,ear:.43,...left(7,-21,60),smile:1}],
    [33,{squat:6,pitch:.19,ear:-.3,smile:1}],
    [39,{...left(12,-6,47),...foot('R',8,16,1),roll:-.19,nod:-.18,smile:1}],[47,{}]],
  sleep_in: [[0,{}],[7,{nod:-.33,ear:.12,blink:.6}],[15,{sleep:.47,ear:-.18,nod:.16}],
    [24,{...asleep,blink:.85}],[29,asleep]],
  sleep_out: [[0,asleep],[8,{sleep:.80,nod:.24,ear:.14}],[17,{sleep:.35,nod:-.32,ear:.4,...left(0,-16,68)}],
    [24,{nod:-.22,ear:.27}],[29,{}]],
  wake_startled: [[0,asleep],[4,{sleep:.68,ear:.4,nod:-.2}],[9,{jump:7,tuck:.36,ear:.62,nod:-.3,roll:-.14}],
    [14,{squat:6,...foot('L',15,-13,0),twist:.48,gaze:.72,ear:.21}],[20,{gaze:-.36}],[23,{}]],
  hatch: [[0,{}],[7,{squat:14,pitch:.45,ear:-.34}],[14,{squat:5,nod:-.14,ear:.25}],
    [21,{...right(10,18,53),shaftPitch:.33,ear:.50,nod:-.33,...left(13,-17,51)}],
    [27,{...right(10,19,49),shaftPitch:.23,nod:-.22}],[35,{}]],
};

// The shaft clears the paw at 21, turns end-over-end beside the backflip,
// then meets the waiting rear grip at 48. Keep the full turn through the bow.
const turn = -Math.PI*2;
const behind = right(-15,23,37);
tracks.trick = [[0,{}],[10,{squat:6,pitch:.3,shaftPitch:.74,ear:-.26}],
  [16,{squat:10,pitch:.39,shaftPitch:1.25,...right(13,16,30),nod:-.2}],
  [21,{...right(9,20,54),...flying(9,20,54),shaftPitch:1.54,ear:.34,nod:-.36}],
  [27,{jump:28,tuck:.55,flip:-.75,...flying(8,37,81),shaftPitch:5.78,ear:-.25}],
  [34,{jump:34,tuck:1,flip:-2.95,...flying(-7,54,91),shaftPitch:10.73,cape:.55}],
  [41,{jump:26,tuck:.72,flip:-5.13,...flying(-19,43,76),shaftPitch:11.96,cape:.60}],
  [48,{...behind,...flying(-15,23,37),flip:turn,twist:-.48,squat:9,shaftPitch:Math.PI*2+6.7,nod:-.4,ear:-.3}],
  [53,{...behind,flip:turn,twist:-.35,squat:4,shaftPitch:Math.PI*2+6.55,gaze:-.46,nod:-.26}],
  [59,{...behind,flip:turn,shaftPitch:Math.PI*2+6.48,nod:-.53,ear:.58,roll:-.18}],
  [65,{...behind,flip:turn,shaftPitch:Math.PI*2+6.46,ear:-.28,gaze:.36}],
  [75,{flip:turn,shaftPitch:Math.PI*2+6.37,squat:5,pitch:.81,nod:.28,ear:-.32,...left(17,-21,44)}],
  [80,{flip:turn,shaftPitch:Math.PI*2+6.34,squat:4,pitch:.74,nod:.26,...left(16,-19,43)}],
  [89,{flip:turn,shaftPitch:Math.PI*4}]];
export function gesture(anim: string,t: number): JointPose {
  if (anim === 'sleep') return asleep;
  const keys = tracks[anim];
  if (!keys) return {};
  const f = t * 24, i = keys.findIndex(([time]) => time >= f);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length-1][1];
  const [start,a] = keys[i-1], [end,b] = keys[i];
  let u = (f-start)/(end-start);
  // Keep the airborne rotational momentum between keys of the somersault.
  if (!(anim === 'trick' && start>=21 && end<=48)) u=u*u*(3-2*u);
  const pose: JointPose = {};
  for (const name of new Set([...Object.keys(a),...Object.keys(b)]))
    pose[name]=(a[name]??0)*(1-u)+(b[name]??0)*u;
  return pose;
}
