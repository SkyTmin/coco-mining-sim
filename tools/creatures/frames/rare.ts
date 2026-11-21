import type { Border } from '../types';
import { jewel, glint, chase } from './jewels';

export default {
  wood:['#282f3b','#465368','#748594','#c4cfd1'],accent:'#5e91c8',
  decorate(p,b,t){
    chase(p,b,9,set=>{
      for(let i=0;i<4;i++){
        set(i,6+(i>>1),'#384957'); set(i,5+(i>>1),'#91a1ad');
        set(i+3,7-(i>>1),'#394956');
      }
    });
    const c=Math.floor(b/2), corners=[[c,c],[p.w-1-c,c],[p.w-1-c,p.h-1-c],[c,p.h-1-c]];
    corners.forEach(([x,y],i)=>{
      jewel(p,x,y,4,['#183d69','#255986','#538ac1','#abcce1'],'#b8c6ca');
      if(i%2===0)glint(p,x-1,y-1,t,i===0?.45:1.83);
    });
  }
} satisfies Border;
