import { hx } from '../kit/f11-mobkit';
import type { LightAppearance } from '../bodies/light-quadruped';
import type { Mat, Tones } from '../rig/f15-rig';

function material(...colors: string[]): Mat {
  return { T: colors.map(color => hx(color)) as Tones };
}

const plum = material('#35283a', '#614258', '#9c6679', '#c38c96');
const flax = material('#594147', '#976f69', '#d1a991', '#f6ddae');
const dusky = material('#242837', '#3a3c4d', '#57536a', '#80718b');
const amber = material('#664644', '#b47d58', '#e7ae6c', '#f8dc93');
const eye = material('#171c2b', '#22283b', '#3d3944', '#695362');
const red = material('#693e48', '#9e5358', '#ce7a69', '#f4aa81');

export const draw: LightAppearance['draw'] = (r, s) => {
  const { body, head, tail } = s;
  const foot = (forward: number) => forward > 0 ? 3.5 : 4.6;
  for (const leg of s.legs) {
    r.tag = leg.name;
    r.cap(leg.hip, leg.knee, foot(leg.fore), 2.1, plum);
    r.cap(leg.knee, leg.hock, 2.2, 1.4, flax);
    r.cap(leg.hock, leg.foot, 1.4, 0.85, dusky);
    r.ell(leg.hoof, [0.9,0,1], [2.4,1.45,1.6], dusky);
    r.ell(leg.hoof, [2.1,0,1.6], [0.65,1.0,0.48], flax);
  }
  r.tag = 'torso';
  r.ell(body, [-1,0,0], [17.5,7.2,8.1], plum);
  r.ell(body, [6.5,0,-1.4], [9.5,7,6.8], flax);
  // Paired rows of elongated speckles follow an ellipse on the back.
  for (const side of [-1,1])
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 10; col++) {
        const x = -15 + col*2.35 + (row%2)*0.8;
        const cross = Math.sqrt(1 - ((x+1)/17.5)**2);
        const angle = 0.35 + 0.31*row + 0.05*Math.sin(col*1.3);
        const y = side * 7.24 * cross * Math.sin(angle);
        const z = 8.13 * cross * Math.cos(angle);
        r.ell(body,[x,y,z],[0.7+(col%3)*0.12,0.35,0.45],row === 0 ? amber : flax);
      }
  r.tag = 'tail';
  r.cap(tail.o,s.points.tailTip,2.7,0.55,plum);
  for (let i=0;i<7;i++) {
    const tuft=tail.at(-7-i*0.75,0,-1.8-i*0.33);
    r.ell(tuft, [0,0,0], [2.4,1.9-i*0.13,2.1-i*0.18], i < 4 ? plum : flax);
  }
  r.tag = 'neck';
  r.cap(s.neck.o,head.o,5.4,3.6,flax);
  r.tag = 'head';
  r.ell(head, [1,0,0], [7.1,5.2,5.8], plum);
  r.ell(head, [5.5,0,-1.8], [5.1,3.7,3.25], flax);
  r.ell(head,[10.3,0,-1.65],[1.5,2.2,1.45],dusky);
  r.ell(head,[2.6,0,4.5],[3.4,1.1,1.2],flax);
  for(const side of [-1,1]) {
    const suffix=side<0?'L':'R';
    r.tag='ear'+suffix;
    const ear=head.at(-2,side*3.2,3).roll(side*0.45).pitch(-0.32);
    r.ell(ear, [0,0,5.2],[2.2,2.0,6.3],plum);
    r.ell(ear, [1.35,0,5.2],[1.07,1.32,4.45],red);
    for(let i=0;i<4;i++) r.dot(ear.p(1.85,side*0.6,3.8+i),flax.T[2],0,0.65);
    r.tag='eye'+suffix;
    const b=s.life.blink ? 0.21 : 1;
    const start=r.size;
    r.ell(head,[3.7,side*4.35,1.65],[2.15,0.96,1.59*b],eye);
    if(!s.life.blink) {
      r.ell(head,[4.0,side*4.96,1.45],[1.0,0.48,0.8],amber);
      r.dot(head.p(4.45,side*5.18,2.25),flax.T[3],0,0.7);
    }
    r.markEye(start,side,!s.life.blink);
    if(side>0) r.eye=head.p(4.0,side*4.96,1.45);
    r.tag='head';
    for(let i=0;i<3;i++) r.dot(head.p(6.4+i*0.85,side*(3.0-i*0.2),-2.8),dusky.T[2],0,0.65);
  }
};
