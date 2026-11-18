import { hx } from '../kit/f11-mobkit';
import type { Border } from '../types';

const common:Border={
  wood:['#302521','#46352a','#604834','#85684a'], accent:'#A9B4C2',
  decorate(p,b) {
    const groove=hx('#392a24'), sap=hx('#786047'), nail=hx('#4e5258'), edge=hx('#abb4b8');
    for(const y of [4,p.h-5]) for(let x=b+3;x<p.w-b-7;x+=16) {
      p.line(x,y,x+4,y,groove);
      p.line(x+5,y-1,x+7,y-1,sap);
    }
    for(const x of [4,p.w-5]) for(let y=b+4;y<p.h-b-6;y+=16) {
      p.line(x,y,x,y+3,groove);
      p.line(x-1,y+4,x-1,y+6,sap);
    }
    for(const x of [3,p.w-4]) for(const y of [3,p.h-4]) {
      p.rect(x-1,y-1,x+1,y+1,groove);
      p.set(x-1,y-1,edge); p.set(x,y,nail); p.set(x+1,y,nail);
    }
  }
};
export default common;
