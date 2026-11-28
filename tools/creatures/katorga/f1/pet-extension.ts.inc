// Appended in memory to f1-art.ts so art, IK, depth, crop and outline stay native.
import { petFrames } from '../../poses';
type PetAction = keyof typeof petFrames;
type PetTracks<P> = Partial<Record<keyof P | 'lift', number>>;

// Each column in a track is a native drawing key. Unspecified channels stay
// at their idle value. All dimensions below are in the artist's rig units.
function petTrack<P>(f: number, beats: number[], channels: Partial<Record<keyof P | 'lift', number[]>>): PetTracks<P> {
  const result: PetTracks<P> = {};
  for (const key of Object.keys(channels) as (keyof P | 'lift')[]) {
    const values = channels[key]!;
    result[key] = kf(f, beats.map((frame, i) => [frame, values[i]] as KF));
  }
  return result;
}
const kingBed = { hy: 3.7, ln: .67, ny: 1.5, nx: -.7, sq: 1, bl: .5,
  wa: -.55, nhx: 1, nhy: -.6, fhy: .6, tc: 1.05, tu: -.9, ca: .12 };
const smallBed = { bob: -1.5, st: -.8, hx: -1, hy: 1.5, sq: 1, tu: -.85, tc: 1.05, f2x: -.6 };
function bedWeight(a: PetAction, f: number) {
  switch (a) {
    case 'sleep_in': return kf(f, [[0,0],[6,.06],[14,.52],[25,.99],[29,1]]);
    case 'sleep_out': return kf(f, [[0,1],[6,.89],[16,.02],[29,0]]);
    case 'wake_startled': return kf(f, [[0,1],[2,.92],[5,0]]);
    default: return 1;
  }
}
function addBed<P>(p: PetTracks<P>, bed: Partial<P>, weight: number) {
  for (const k of Object.keys(bed) as (keyof P)[]) p[k] = (p[k] ?? 0) + Number(bed[k]) * weight;
  return p;
}
function kingGesture(a: PetAction, f: number): PetTracks<KP> {
  const track = (beats: number[], channels: Partial<Record<keyof KP | 'lift', number[]>>) => petTrack<KP>(f, beats, channels);
  switch (a) {
    case 'happy':
      return track([0,8,17,21,26,36,41,47],{
        hy:[0,2.7,-.7,1.2,-1,2.8,.6,0], lift:[0,0,9,1,6,0,0,0],
        ln:[0,.36,-.28,.13,-.23,.44,.12,0], ny:[0,.8,-1.2,0,-1,.4,-.2,0],
        jaw:[0,0,.9,.3,.9,.32,.18,0], sq:[0,.5,.9,0,.9,.6,0,0],
        nhx:[0,-1,2,1,2,.5,.1,0], nhy:[0,.2,-5,-1,-4.8,.3,-.4,0],
        fhx:[0,.2,-4,-1,-4,0,0,0], fhy:[0,0,-5,-1,-4.5,0,0,0],
        nfx:[0,.4,-1.2,0,-.9,1,.2,0], nfl:[0,0,1.4,0,1.7,0,0,0],
        wa:[0,.1,-1,-.3,-.8,.2,0,0], tu:[0,-.3,.4,1,.4,-.6,.2,0]});
    case 'trick':
      return track([0,11,20,30,40,47,59], {
        hx:[0,-.8,-2,-2,-.6,1,0], hy:[0,1.7,-.3,-.5,.5,2,0],
        ln:[0,.35,-.42,-.48,-.12,.85,0], ny:[0,1,-.8,-1,-.4,1.1,0],
        nfl:[0,0,3.3,4,1.5,0,0], nfx:[0,-.2,2,3,2,1,0], ffx:[0,.8,2,2,.6,-1,0],
        nhx:[0,-1,1.9,2.3,1.6,1.5,0], nhy:[0,.6,-4,-4.5,-3,-1,0],
        fhx:[0,0,-4,-4,-2,1,0], fhy:[0,.5,-5,-5.5,-3,0,0],
        wa:[0,.45,-1.4,-1.5,-.85,-.45,0], tc:[0,.3,.7,.95,.4,-.35,0], ca:[0,.12,-.18,-.18,.1,.22,0]});
    case 'fidget_a':
      return track([0,11,20,28,35,47],{ny:[0,.3,.8,1.15,.5,0], ln:[0,.1,.34,.42,.22,0],
        fhx:[0,.3,1.9,2.4,1.7,0], fhy:[0,-1,-3.2,-3.1,-2,0], sn:[0,.5,.8,1,.1,0],
        sq:[0,0,.1,.7,0,0], nx:[0,.3,.6,.6,-.15,0], wa:[0,.14,.25,.25,.15,0]});
    case 'fidget_b':
      return track([0,12,21,28,33,47],{ny:[0,-.7,-1.4,-1.8,-1.35,0], ln:[0,-.04,-.24,-.3,-.22,0],
        dr:[0,-.3,-1.4,-1.95,-.75,0], nx:[0,.4,.8,1.1,.3,0], sn:[0,.2,1,.2,.85,0],
        hy:[0,-.15,-.65,-.8,-.4,0], ts:[0,.35,.7,-.35,.65,0]});
    case 'look':
      return track([0,8,13,22,28,35],{sn:[0,.6,.95,.8,.1,0], dr:[0,-.25,-.9,-1.3,-.6,0],
        nx:[0,.3,1.3,1.4,.5,0], ln:[0,0,.04,.26,.18,0], ny:[0,-.1,-.55,-.7,-.25,0], ca:[0,0,-.12,-.16,.04,0]});
    case 'sleep_in': case 'sleep_out': case 'sleep': case 'wake_startled': {
      let p: PetTracks<KP>;
      if(a==='sleep_in') p=track([0,6,12,25,29],{jaw:[0,.95,.7,0,0],dr:[0,-1,-.3,0,0],tu:[0,.4,.3,.08,0]});
      else if(a==='sleep_out') p=track([0,6,16,22,29],{sq:[0,-.7,0,0,0],ln:[0,0,-.3,-.15,0],nhx:[0,0,1.8,.4,0],nhy:[0,-.3,-3.7,-1,0],jaw:[0,.05,.7,.25,0]});
      else if(a==='sleep') p=track([0,42,83],{hy:[0,-.9,0],ny:[0,-.4,0],ts:[0,.5,0],ca:[0,-.05,0]});
      else p=track([0,2,5,11,19,23],{hy:[0,.1,-1,-.4,1.2,0],lift:[0,0,5,2,0,0],jaw:[0,0,.95,.5,.2,0],ln:[0,0,-.5,-.3,.15,0],nhy:[0,0,-4,-2,.2,0],fhy:[0,0,-3.8,-1,0,0],tu:[0,0,-.1,.9,-.25,0]});
      return addBed<KP>(p,kingBed,bedWeight(a,f));
    }
    case 'hatch':
      return track([0,9,19,29,35],{hy:[3.4,4,2.3,-.65,0],ln:[.76,.9,.6,-.24,0],bl:[.8,.9,.25,0,0],
        ny:[1.2,1.4,-1.3,-.9,0],dr:[.3,.4,-1.7,-.9,0],sq:[1,1,0,0,0],nhx:[.5,1.4,2,1.3,0],
        nhy:[.6,.4,-1,-2,0],fhy:[.6,.5,-.5,-2,0],tc:[1.2,1.5,1,-.25,0],tu:[-.6,-.9,-.4,.6,0]});
    case 'turn':
      return track([0,5,11,17,23],{nx:[0,-.9,-1.1,.5,0],ln:[0,-.12,-.42,.22,0],hx:[0,0,-.9,.65,0],
        ffl:[0,0,1.6,0,0],nfl:[0,.5,0,1.4,0],ffx:[0,0,1.5,.1,0],nfx:[0,-.5,-.4,.9,0],ts:[0,0,.7,-.8,0]});
    case 'tired':
      return track([0,12,25,40,50,59],{hy:[0,1.6,2,1.6,1,0],ln:[0,.38,.52,.42,.25,0],ny:[0,.7,1.3,.8,.6,0],
        sq:[0,.4,.9,.7,.5,0],jaw:[0,.4,.7,.1,.5,0],nhx:[0,-.4,-.8,-.5,-.3,0],wa:[0,.35,.45,.4,.25,0],tu:[0,-.45,-.75,-.55,-.4,0]});
  }
}

// The four-footed siblings have their own action keys. One leads with a
// forepaw and the other with its muzzle; both begin and end at qIdle(0).
function smallGesture(a: PetAction, f: number, second: boolean): PetTracks<QP> {
  const b = second;
  const track = (beats: number[], channels: Partial<Record<keyof QP | 'lift', number[]>>) => petTrack<QP>(f, beats, channels);
  switch(a) {
    case 'happy':
      return track([0,8,17,21,26,36,41,47],{bob:[0,-.8,.9,-.2,.8,-.9,-.25,0],
        rear:[0,.1,b?.85:.5,.2,b?.55:.9,.15,0,0], st:[0,-.6,1,.1,1,-.65,0,0],
        lift:[0,0,b?3:5,0,b?5:3,0,0,0], hx:[0,-.2,.8,0,.6,.3,0,0], jaw:[0,0,.85,.2,.95,.4,.1,0],
        f2l:[0,0,1.7,.3,1.3,0,0,0],h2l:[0,0,1.2,0,1.3,0,0,0],tu:[0,-.5,.2,.8,.25,-.4,.2,0]});
    case 'trick':
      return track([0,11,20,30,40,47,59],{bob:[0,-.8,.2,.6,.3,-.7,0],rear:[0,.1,.85,1,.5,.05,0],
        hx:[0,-.5,-.4,b?.85:-.9,.5,.9,0],hy:[0,.4,-.7,-1,-.35,.9,0],jaw:[0,0,.25,.7,.25,0,0],
        h2l:[0,0,b?0:1.3,b?0:1.7,0,0,0],h1l:[0,0,b?1.3:0,b?1.7:0,0,0,0],
        f2x:[0,0,.3,1,.6,.4,0],tc:[0,.4,.95,1.3,.6,-.4,0],ts:[0,.3,.8,-.7,-.5,.2,0]});
    case 'fidget_a':
      return track([0,12,20,29,35,47],{f2l:[0,.5,1.6,b?1.5:2.1,1,0],f2x:[0,.2,1.1,1.2,.8,0],
        hy:[0,.5,.9,1.4,.8,0],hx:[0,.2,.6,b?1:.6,.4,0],sn:[0,.25,.6,.1,.4,0],rear:[0,.06,.16,.2,.1,0]});
    case 'fidget_b':
      return track([0,11,20,28,34,47],{rear:[0,.1,.4,b?.8:.6,.3,0],hy:[0,-.4,-.9,-1.3,-.7,0],
        hx:[0,.15,.65,.8,.45,0],sn:[0,.1,.8,.1,.75,0],ts:[0,.25,.6,-.8,.4,0]});
    case 'look':
      return track([0,8,13,22,29,35],{sn:[0,.7,.9,.6,.3,0],hx:[0,.35,1,1.2,.5,0],hy:[0,-.25,-.9,-1,-.4,0],
        rear:[0,0,.08,b?.5:.35,.2,0],tu:[0,0,.15,.5,.2,0]});
    case 'sleep_in': case 'sleep_out': case 'sleep': case 'wake_startled': {
      let p: PetTracks<QP>;
      if(a==='sleep_in') p=track([0,6,14,25,29],{jaw:[0,b?.65:.9,.45,0,0],rear:[0,b?.42:.24,.1,0,0],tc:[0,b?-.2:.15,.3,.08,0]});
      else if(a==='sleep_out') p=track([0,6,16,22,29],{sq:[0,-.7,0,0,0],st:[0,0,b?1.1:1.5,.6,0],f2x:[0,0,b?.45:1.4,.65,0],hy:[0,-.3,b?-1:-.7,-.4,0]});
      else if(a==='sleep') p=track([0,42,83],{bob:[0,b?.58:.72,0],hy:[0,-.32,0],ts:[0,b?.5:-.4,0]});
      else p=track([0,2,5,11,19,23],{rear:[0,0,.85,.5,.15,0],lift:[0,0,b?3.5:4.5,.4,0,0],hy:[0,0,-1,-.7,.6,0],jaw:[0,0,1,.4,.1,0],tc:[0,0,-.3,.9,.25,0]});
      return addBed<QP>(p,smallBed,bedWeight(a,f));
    }
    case 'hatch':
      return track([0,9,19,29,35],{bob:[-.9,-1.2,-.3,.65,0],st:[-1,-1.5,-.3,.8,0],rear:[0,0,.35,b?.75:.6,0],
        hx:[-.7,-1,.85,1,0],hy:[1,1.2,-.8,-1.1,0],sq:[1,1,0,0,0],f2x:[-.7,-.7,.8,1.25,0],tc:[1,1.3,.4,-.35,0]});
    case 'turn':
      return track([0,5,11,17,23],{hx:[0,-.8,-1.2,.3,0],st:[0,0,-1,.4,0],f2l:[0,1,1.3,0,0],h1l:[0,0,.45,1.3,0],
        f2x:[0,-.4,-.8,.3,0],h1x:[0,0,-.4,.6,0],ts:[0,.4,.9,b?-.9:-.6,0]});
    case 'tired':
      return track([0,12,25,40,50,59],{bob:[0,-.7,-1.15,-.8,-.4,0],hy:[0,.7,b?1.6:1.15,.8,.5,0],
        jaw:[0,.35,.8,.15,.5,0],sq:[0,.4,.8,.6,.4,0],st:[0,-.25,-.7,-.4,-.3,0],tu:[0,-.4,-.8,-.5,-.3,0]});
  }
}

function petOffset<P extends object>(idle: P, changes: PetTracks<P>): P {
  const p = { ...idle };
  for (const key of Object.keys(idle) as (keyof P)[]) {
    if (changes[key] !== undefined) Object.assign(p, { [key]: Number(idle[key]) + changes[key]! });
  }
  return p;
}

export function petFrame(m: Mob, pose: MobPose, progress: number): MobFrame | null {
  if (!Object.hasOwn(petFrames, pose.mode)) return null;
  const a = pose.mode as PetAction;
  const last = petFrames[a] - 1;
  const f = Math.min(last, Math.round(clamp(progress, 0, 1) * petFrames[a]));
  // Rotate across the planted foot halfway through the pivot.
  const facing = a === 'turn' && f < 11 ? !pose.left : pose.left;
  if (m.kind === 'kinglet') {
    const second = !!m.data?.petVariant;
    const change = smallGesture(a, f, second);
    const [idle, fx] = qIdle(0);
    const Q = petOffset(idle,change);
    if (Q.sq >= .5) fx.eye = 'squint';
    const rendered = paintQuad(Q, fx, f/FPS);
    return { ...cropFrame(rendered.px,rendered.lit,QG.cx,QG.base,rendered.eye,facing),
      dy: -(change.lift ?? 0), still: true, shadow: 9 };
  }
  const look: KingLook = { blade: !!m.data?.f1blade, split: !!m.data?.f1split };
  const idle = idleClip(look);
  const clip: Clip = {
    id: 'pet/' + a, geo: GEO_N,
    at(time) {
      const frame = clamp(time * FPS, 0, last);
      const change = kingGesture(a,frame);
      const idleShot = idle.at(0);
      const p = petOffset(idleShot.p,change);
      return { p, fx: { ...idleShot.fx, ...(p.sq >= .5 ? { eye: 'squint' as const } : {}) } };
    },
    xf(time) { return { ...XF0, dy: -(kingGesture(a,clamp(time*FPS,0,last)).lift ?? 0) }; },
  };
  const time = f/FPS;
  // Settle lagged cape/tail channels before exiting a clip at its idle seam.
  const endsAtRest = f === last && a !== 'sleep' && a !== 'sleep_in';
  const startsAtRest = f === 0 && !['sleep','sleep_out','wake_startled','hatch'].includes(a);
  const fr = endsAtRest || startsAtRest
    ? kingCached(idle, 0, look, facing, pose.look).fr
    : kingCached(clip, f === last ? time + .12 : time, look, facing, pose.look).fr;
  return { ...fr, dy: clip.xf!(time,time).dy, still: true, shadow: 16 };
}
