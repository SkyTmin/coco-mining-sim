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
  const split = after ? unit(after/5) : 0;
  fillSeg(p,cx+0.5,cy+2,cx+0.8+split*1.7,cy-2,0.55);
  if (!after) return;
  const kernels = [[16,14,19],[9,11,24],[22,18,31]];
  for (const [dx, lift, length] of kernels) {
    const u=unit(after/length);
    const x=contact[0]+dx*u;
    const y=contact[1]+(root[1]-contact[1])*u-4*lift*u*(1-u);
    p.col('#563b42'); disc(p,x,y,1.8);
    p.col('#efbb70'); p.dot(Math.round(x)-1,Math.round(y)-1,2,1);
  }
}
