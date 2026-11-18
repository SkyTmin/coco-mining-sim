import type { Border } from '../types';
import { hx } from '../kit/f11-mobkit';
import { face } from '../scenes/relief';
import { jewel, glint, chase } from './jewels';

export default {
  wood:['#422e27','#715032','#a87840','#dbc184'],accent:'#ffc572',
  decorate(p,b,t){
    chase(p,b,18,set=>{
      // Overlapping acanthus on a shaded gold band.
      for(let i=0;i<9;i++){
        const q=i<5?i:8-i;
        for(let j=0;j<=q>>1;j++)set(i+1,8-j,'#a87740');
        set(i+1,7-(q>>1),'#d9b973');
        set(i+1,9,'#543b2c');
        set(9+i,8+(q>>1),'#b28b4a');
      }
      set(8,7,'#ebcc85'); set(10,8,'#62482f');
    });
    const c=b>>1;
    [[c,c],[p.w-1-c,c],[p.w-1-c,p.h-1-c],[c,p.h-1-c]].forEach(([x,y],i)=>{
      jewel(p,x,y,5,['#794525','#ad632a','#dc932e','#f9c565'],'#efc87b');
      glint(p,x-2,y-1,t,.20+i*.63);
    });
    const x=p.w>>1;
    // Cast crown and its three points, held entirely in the top rail.
    face(p,[[x-22,3],[x-12,8],[x-8,2],[x-4,6],[x,0],[x+4,6],[x+8,2],[x+12,8],[x+22,3],[x+17,13],[x+11,15],[x-11,15],[x-17,13]],hx('#493027'));
    face(p,[[x-19,5],[x-11,10],[x-8,4],[x-4,9],[x,2],[x+4,9],[x+8,4],[x+11,10],[x+19,5],[x+15,12],[x+9,14],[x-10,14],[x-15,12]],hx('#c99b51'));
    p.line(x-15,11,x-9,13,hx('#efd185'));p.line(x-8,13,x+9,13,hx('#edc576'));
    jewel(p,x,9,3,['#8e4927','#bc6c24','#e59a32','#ffdc8b'],'#eac774');
    glint(p,x-1,8,t,2.66);
  }
} satisfies Border;
