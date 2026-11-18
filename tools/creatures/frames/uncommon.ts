import { hx } from '../kit/f11-mobkit';
import type { Border } from '../types';

const uncommon:Border={
  wood:['#272922','#443e2c','#66593c','#8d7950'], accent:'#5FCB6A',
  decorate(p,b) {
    const cut=hx('#252d23'), stem=hx('#51633b'), leaf=hx('#63884c'), tip=hx('#91ab65');
    for(const y of [5,p.h-6]) for(let x=b+1;x<=p.w-b-9;x+=8) {
      p.line(x,y,x+4,y-1,stem); p.line(x+4,y-1,x+8,y,stem);
      p.set(x+3,y-2,leaf); p.set(x+4,y-2,cut);
    }
    for(const x of [5,p.w-6]) for(let y=b+1;y<=p.h-b-9;y+=8) {
      p.line(x,y,x-1,y+4,stem); p.line(x-1,y+4,x,y+8,stem);
      p.set(x-2,y+3,leaf); p.set(x-2,y+4,cut);
    }
    // Hand-cut three-leaf spandrels turn round a square peg in every corner.
    const corner=['....sl..','...slt..','...ls...','.sls...l','sll..sll','lts.slt.','...ltt..','..l.....'];
    for(const dx of [1,-1]) for(const dy of [1,-1]) {
      for(let v=0;v<corner.length;v++) for(let u=0;u<corner[v].length;u++) {
        const c=corner[v][u];
        if(c==='.') continue;
        p.set(dx>0?1+u:p.w-2-u,dy>0?1+v:p.h-2-v,c==='l'?leaf:c==='t'?tip:cut);
      }
    }
  }
};
export default uncommon;
