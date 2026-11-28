import type { Border } from '../types';
import { hx } from '../kit/f11-mobkit';
import { jewel, glint, chase } from './jewels';

export default {
  wood:['#231f30','#392f49','#64516e','#9d899d'],accent:'#c39a55',
  decorate(p,b,t){
    chase(p,b,15,set=>{
      for(let i=0;i<7;i++) {
        set(i,6+(i>>1),'#806e57'); set(6+i,9-(i>>1),'#846e4e');
        if(i<4)set(i+4,6-(i%2),'#645269');
      }
      set(6,8,'#b89360');set(6,7,'#d0af76');
    });
    const c=b>>1;
    [[c,c],[p.w-1-c,c],[p.w-1-c,p.h-1-c],[c,p.h-1-c]].forEach(([x,y],i)=>{
      jewel(p,x,y,5,['#462558','#744589','#9b60b5','#cf9fda'],'#d2ae74');
      glint(p,x-1,y-1,t,i*.75);
    });
    const length=2*(p.w+p.h-4*b), d=Math.floor(t*length/3);
    const w=p.w-2*b,h=p.h-2*b;
    for(let i=0;i<5;i++){
      const n=(d+i)%length,col=hx(i>1&&i<4?'#f4d698':'#b6a07a');
      if(n<w)p.set(b+n,b-2,col);
      else if(n<w+h)p.set(p.w-b+1,b+n-w,col);
      else if(n<2*w+h)p.set(p.w-b-1-(n-w-h),p.h-b+1,col);
      else p.set(b-2,p.h-b-1-(n-2*w-h),col);
    }
  }
} satisfies Border;
