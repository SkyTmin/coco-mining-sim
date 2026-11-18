import type { HeavyAppearance } from '../bodies/heavy-quadruped';
import { hx } from '../kit/f11-mobkit';
import type { Mat, V3 } from '../rig/f15-rig';

const hornTip: V3 = [12, 13, 4];
const horn: V3[] = [
  [3, 7, 6], [1, 8, 12], [-4, 9, 16], [-10, 10.5, 15], [-14, 12, 10],
  [-14.5, 13, 3], [-11, 13.7, -2.5], [-5.5, 14, -5], [0, 14.3, -4], [4.5, 14, 0],
  [6.8, 13.6, 3.6], hornTip,
];

export const stormSkin: HeavyAppearance = {
  hornTip,
  draw(r, s, card, variant) {
    const material = (id: string): Mat => {
      const tones = card.materials.find(m => m.name === id)!.tones;
      return { T: [hx(tones[0]), hx(tones[2]), hx(tones[4]), hx(tones[6])] };
    };
    const wool = material('cloud'), keratin = material('horn'), face = material('face');
    if (variant === 'gold') wool.T = [hx('#493640'), hx('#8c614a'), hx('#c79f65'), hx('#efdb9b')];
    for (const leg of s.legs) {
      r.tag = leg.name;
      r.cap(leg.hip, leg.knee, 4.1, 2.8, wool);
      r.cap(leg.knee, leg.foot, 2.8, 1.9, face);
      for (const k of [-1,1]) r.ell(leg.hoof, [1.4, k*1.4, -1.5], [3.7,1.6,2], face);
    }
    const B = s.body, H = s.head;
    r.tag = 'torso';
    r.ell(B, [-5,0,1.4], [19,11,11.6], wool);
    for (const [x,z,rad] of [[-17,6,9],[-9,10,10],[0,12,9.7],[8,10,8.2]])
      r.ell(B,[x,0,z],[rad,10,rad*.78],wool);
    for (const side of [-1,1])
      for (const [x,z,rad] of [[-18,4,6.2],[-10,6,6.9],[-2,7,7.2],[5,6,6.3],[9,0,5.3]])
        r.ell(B,[x,side*7.6,z],[rad,5.4,rad*.87],wool);
    r.tag = 'tail';
    r.cap(s.tail.o,s.points.tailTip,3.2,1.3,wool);
    r.tag = 'neck';
    r.cap(B.p(8,0,5),H.p(0,0,1),7.5,6,wool);
    r.tag = 'head';
    r.ell(H,[4,0,1.2],[10,7.1,7.5],face);
    r.ell(H,[12,0,-1.6],[7,5.7,4.7],face);
    r.ell(H,[17,0,-2.4],[3.7,4,2.4],face);
    r.cap(H.p(8,0,-4),H.p(9,0,-11),2.7,.3,wool);
    for(const side of [-1,1]) {
      r.tag='head';
      r.ell(H,[-2,side*8,4],[3,5,2.2],face);
      r.ell(H,[9,side*6.5,2.2],[2.6,1.1,1.6],keratin);
      if(!s.life.blink) r.line(H.p(8.4,side*7.5,2.3),H.p(10.1,side*7.5,2.3),hx('#262132'),0,1.1);
      if(side>0)r.eye=H.p(9,side*7.5,2.3);
      r.tag=side>0?'hornR':'hornL';
      for(let i=1;i<horn.length;i++) {
        const p=horn[i-1],q=horn[i];
        const radius=(j:number)=>4.25*(1-j/(horn.length-1))+.55;
        r.cap(H.p(p[0],side*p[1],p[2]),H.p(q[0],side*q[1],q[2]),radius(i-1),radius(i),keratin);
      }
    }
  }
};
