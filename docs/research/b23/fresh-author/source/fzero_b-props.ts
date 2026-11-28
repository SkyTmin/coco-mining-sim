import { disc, fillPoly, fillSeg } from '../fx/pen';
import type { FxInput } from '../types';

const root = [128,114];
const contact = [124,91];
const unit = (v:number) => Math.min(1, Math.max(0, v));
export function drawPod(f: FxInput) {
  const p = f.backdrop;
  const frame = f.anim === 'fidget_a' ? f.t*24 : 0;
  const after = Math.max(0,frame-29);
  const tilt = after ? 6*Math.sin(after/2.9)*Math.exp(-after/11) : 0;
  const cx = contact[0] + tilt, cy = contact[1] + 0.25*Math.abs(tilt);
  p.col('#443b35');
  fillSeg(p,root[0],root[1],127,103,1.5);
  fillSeg(p,127,103,cx,cy,1.4);
  p.col('#8f8252');
  fillSeg(p,root[0]-1,root[1],126,103,0.65);
  fillSeg(p,126,103,cx-1,cy,0.65);
  p.col('#6b7947');
  fillPoly(p,[127,108,119,103,120,107,126,110]);
  p.col('#ccd083');
  fillSeg(p,126,108,120,104,0.6);
  p.col('#61434b');
  disc(p,cx,cy,4.2);
  p.col('#ac704b');
  disc(p,cx,cy-0.5,3.3);
  p.col('#f6c279');
  fillSeg(p,cx-2,cy+1,cx-1.3,cy-2.8,1.05);
  p.col('#543e3b');
  const split = after ? unit(after/4) : 0;
  if(split) {
    p.col('#463441');
    fillPoly(p,[cx-3,cy-1,cx+2,cy+2,cx+3+3*split,cy-4*split,cx,cy-2]);
    p.col('#d79b60');
    fillSeg(p,cx+1,cy+2,cx+3+3*split,cy-4*split,1.12);
    p.col('#ffe3a4');
    p.dot(Math.round(cx+3+3*split),Math.round(cy-4*split),1,1);
    p.col('#543e3b');
  }
  fillSeg(p,cx+0.5,cy+2,cx+0.8+split*1.7,cy-2,0.55);
  if (!after) return;
  const kernels = [[16,23,19,-1],[6,12,26,2],[24,35,31,-3]];
  for (const [dx, lift, length, groundOffset] of kernels) {
    const u=unit(after/length);
    const landed = unit((after-length)/4);
    const x=contact[0]+dx*u+landed*2;
    const y=contact[1]+(root[1]+groundOffset-contact[1])*u-4*lift*u*(1-u) - Math.sin(landed*Math.PI)*1.5;
    p.col('#563b42'); disc(p,x,y,2.25);
    p.col('#fff1c2');
    fillSeg(p,x-1,y-2,x-3-landed*1.7,y-4+landed*2.4,0.7);
    fillSeg(p,x-1,y-2,x+1-landed*2,y-5+landed*2.4,0.55);
    p.col('#efbb70'); p.dot(Math.round(x)-1,Math.round(y)-1,2,1);
  }
}
