"""Match opaque source-body pixels against one mobile canvas by translation. Pass the capture directory."""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image
p=Path(sys.argv[1]); name='penguin_marshal'
body=np.asarray(Image.open(p/(name+'-cpu-body.png')).convert('RGBA'))
screen=np.asarray(Image.open(p/(name+'.png')).convert('RGB'),dtype=np.int16)
ys,xs=np.where(body[:,:,3]>250)
want=body[ys,xs,:3].astype(np.int16); h,w=body.shape[:2]; scores=[]
for dy in range(-15,16):
    for dx in range(-60,61):
        x,y=xs+dx,ys+dy
        valid=(x>=0)&(x<w)&(y>=0)&(y<h)
        distance=np.max(np.abs(want[valid]-screen[y[valid],x[valid]]),axis=1)
        scores.append((int((distance<=3).sum()),dx,dy))
best=sorted(scores,reverse=True)
def overlap(dx,dy):
    x,y=xs+dx,ys+dy
    return int(((x>=w//2-22)&(x<w//2+22)&(y>=h//2-18)&(y<h//2+18)).sum())
score,dx,dy=best[0]
print(json.dumps({'painting':name,'opaque':len(xs),'window':[44,36],'best_agreement':score,'best_shift':[dx,dy],'second_agreement':best[1][0],'agreement_unshifted':next(score for score,x,y in scores if x==0 and y==0),'inside_source':overlap(0,0),'inside_gallery':overlap(dx,dy)},indent=2))
