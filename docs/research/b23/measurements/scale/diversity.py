"""Compare protected render samples. python diversity.py TMP_FRAMES > result.json"""
import hashlib
import json
import sys
from itertools import combinations
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

root = Path(sys.argv[1])
features = {}
gallery = {}
for directory in sorted(p for p in root.iterdir() if p.is_dir()):
    rows = json.loads((directory / "frames.json").read_text())
    images = [Image.open(directory / f"{r['clip']}-{r['frame']}-body.png").convert("RGBA") for r in rows]
    idle = images[0]
    bbox = idle.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
    if bbox is None:
        raise ValueError(f"No body pixels in {directory.name}")
    crop = idle.crop(bbox)
    thumb = ImageOps.contain(crop, (40, 40), Image.Resampling.NEAREST)
    centered = Image.new("RGBA", (40, 40))
    centered.paste(thumb, ((40-thumb.width)//2,(40-thumb.height)//2))
    mask = np.asarray(centered)[:,:,3] >= 128
    pixels = np.asarray(crop)
    body = pixels[pixels[:,:,3] >=128,:3] // 64
    histogram = np.bincount(body[:,0]*16+body[:,1]*4+body[:,2],minlength=64) / len(body)
    # Compare tails, legs, and body after removing translation of the feet.
    motion = []
    for start,stop in [(0,4),(4,7)]:
        sub = []
        for img,row in zip(images[start:stop],rows[start:stop]):
            ys,xs = np.where(np.asarray(img)[:,:,3] >=128)
            ax,ay = map(round,row["feet"])
            sub.append(set(zip((xs-ax).tolist(),(ys-ay).tolist())))
        for left,right in zip(sub,sub[1:]+sub[:1]):
            motion.append(1-len(left & right)/max(1,len(left|right)))
    scene = Image.open(directory/"idle-0-scene.png").convert("RGB").resize((8,8),Image.Resampling.BOX)
    features[directory.name] = (mask,histogram,np.array(motion),np.asarray(scene,dtype=np.float64)/255)
    gallery[directory.name] = centered
pairs=[]
for left,right in combinations(features,2):
    a,b=features[left],features[right]
    shape=1-np.count_nonzero(a[0]&b[0])/max(1,np.count_nonzero(a[0]|b[0]))
    palette=np.sqrt(max(0,1-np.sqrt(a[1]*b[1]).sum()))
    rhythm=np.abs(a[2]-b[2]).mean()
    scene=np.abs(a[3]-b[3]).mean()
    pairs.append({"ids":[left,right],"shape":shape,"palette":float(palette),"motion":float(rhythm),"scene":float(scene)})
for dimension in ("shape","palette","motion","scene"):
    # Midranks make all exact ties count equally.
    order=sorted(range(len(pairs)),key=lambda i:pairs[i][dimension])
    start=0
    while start<len(order):
        end=start+1
        while end<len(order) and abs(pairs[order[start]][dimension]-pairs[order[end]][dimension])<1e-12:
            end+=1
        rank=(start+end-1)/2/max(1,len(order)-1)
        for i in order[start:end]:
            pairs[i]["rank_"+dimension]=rank
        start=end
for pair in pairs:
    pair["all"]=np.mean([pair["rank_"+k] for k in ("shape","palette","motion","scene")])
    pair["actor"]=np.mean([pair["rank_"+k] for k in ("shape","palette","motion")])
def short(key):
    result=[]
    for row in sorted(pairs,key=lambda r:(r[key],r['ids']))[:5]:
        result.append({k:(v if isinstance(v,list) else round(v,5)) for k,v in row.items() if not k.startswith('rank_')})
    return result
rankings={k:short(k) for k in ("all","actor","shape","palette","motion","scene")}
print(json.dumps({"paintings":len(features),"pairs":len(pairs),"verified_frames":sum(len(json.loads(p.read_text())) for p in root.glob("*/frames.json")),"closest":rankings},ensure_ascii=False,indent=2))
if len(sys.argv)>2:
    from PIL import ImageDraw
    out=Image.new("RGB",(420,108*5),(35,35,35))
    draw=ImageDraw.Draw(out)
    for y,row in enumerate(rankings["all"]):
        for x,id in enumerate(row['ids']):
            displayed=gallery[id].resize((80,80),Image.Resampling.NEAREST)
            out.paste(displayed,(x*210+55,y*108),displayed)
            draw.text((x*210+4,y*108+81),id,fill='white')
    out.save(sys.argv[2])
