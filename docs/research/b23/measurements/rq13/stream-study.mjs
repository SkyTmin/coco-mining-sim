// Compute the same 3×3 neighbourhood filter in full-height and striped scratch buffers.
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
const cases=[];
function source(x,y,w,h) {
  x=Math.max(0,Math.min(w-1,x));
  y=Math.max(0,Math.min(h-1,y));
  return (x*13+y*71+(x^y)*7)%256;
}
function sample(w,h,rows,halo) {
  const start=performance.now(), hash=createHash('sha256');
  let peak=0;
  for(let top=0;top<h;top+=rows){
    const height=Math.min(rows,h-top);
    const input=new Uint8Array(w*(height+2*halo));
    const output=new Uint8Array(w*height*4);
    for(let r=0;r<height+2*halo;r++)
      for(let x=0;x<w;x++) input[r*w+x]=source(x,top+r-halo,w,h);
    peak=Math.max(peak,input.byteLength+output.byteLength);
    for(let r=0;r<height;r++){
      for(let x=0;x<w;x++){
        let sum=0;
        for(let j=-1;j<=1;j++) {
          const rr=Math.max(0,Math.min(height+2*halo-1,r+halo+j));
          for(let i=-1;i<=1;i++) sum+=input[rr*w+Math.max(0,Math.min(w-1,x+i))];
        }
        const v=Math.round(sum/9), at=(r*w+x)*4;
        output[at]=v;output[at+1]=v;output[at+2]=v;output[at+3]=255;
      }
    }
    hash.update(output);
  }
  return {hash:hash.digest('hex'),scratch:peak,ms:performance.now()-start};
}
for(const [w,h] of [[176,140],[256,192]]){
  const base=sample(w,h,h,1);
  for(const rows of [h,32,16,8]){
    for(const halo of [1,0]){
      if (rows===h && halo===0) continue;
      const warm=sample(w,h,rows,halo),times=[];
      for(let i=0;i<9;i++)times.push(sample(w,h,rows,halo).ms);
      times.sort((a,b)=>a-b);
      cases.push({w,h,rows,halo,hash:warm.hash,matches:warm.hash===base.hash,peakScratchBytes:warm.scratch,medianMs:+times[4].toFixed(3)});
    }
  }
}
console.log(JSON.stringify({node:process.version,arch:process.arch,rows:cases},null,2));
