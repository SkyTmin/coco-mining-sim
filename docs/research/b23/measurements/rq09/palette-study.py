"""Read authored swatches from accepted actor layers. No images are modified."""
from pathlib import Path
import json,sys,os
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ids=('astral_seer','pocket_magnet','prism_serpent','frost_yeti','moon_magician','bramble_warden','bun_panda','storm_ram')
root=Path(sys.argv[1])
# Ottosson, "A perceptual color space for image processing", 2021-01-25 matrices.
to_lms=np.array([[.4122214708,.5363325363,.0514459929],[.2119034982,.6806995451,.1073969566],[.0883024619,.2817188376,.6299787005]])
to_lab=np.array([[.2104542553,.7936177850,-.0040720468],[1.9779984951,-2.4285922050,.4505937099],[.0259040371,.7827717662,-.8086757660]])
def lab(pixels):
    rgb=np.asarray(pixels)/255
    lin=np.where(rgb>.04045,((rgb+.055)/1.055)**2.4,rgb/12.92)
    return np.cbrt(lin@to_lms.T)@to_lab.T
pairs=[]
for id in ids:
    body=np.asarray(Image.open(root/id/'idle-0-body.png').convert('RGBA'))
    px=body[body[:,:,3]>=128,:3]
    order=np.argsort(lab(px)[:,0],kind='stable')
    a,b=px[order[[int(len(px)*.10),int(len(px)*.90)]]]
    pairs.append((id,a.tolist(),b.tolist()))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-gpu'])
    page=browser.new_page();out=[]
    for id,a,b in pairs:
        cases=page.evaluate("""([a,b])=>{const c=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
            const results={};
            for(const space of ['srgb','srgb-linear','oklab','oklch shorter hue']){
                results[space]=[];
                for(let i=0;i<7;i++){
                    const val='color-mix(in '+space+', rgb('+a.join(' ')+') '+(100*(6-i)/6)+'%, rgb('+b.join(' ')+') '+(100*i/6)+'%)';
                    if(!CSS.supports('color',val)) throw Error('CSS unsupported: '+val);
                    c.fillStyle=val;c.fillRect(0,0,1,1);
                    results[space].push([...c.getImageData(0,0,1,1).data.slice(0,3)]);
                }
            }
            return results}""",[a,b])
        metrics={}
        for name,ramp in cases.items():
            labs=lab(ramp);steps=np.linalg.norm(np.diff(labs,axis=0),axis=1)
            pinned=lab([a]+ramp[1:-1]+[b])
            pinned_steps=np.linalg.norm(np.diff(pinned,axis=0),axis=1)
            metrics[name]={'steps_cv':round(float(steps.std()/steps.mean()),5),
                'endpoint_mismatches':int(ramp[0]!=a)+int(ramp[-1]!=b),
                'pinned_steps_cv':round(float(pinned_steps.std()/pinned_steps.mean()),5),
                'minimum_dL':round(float(min(np.diff(labs[:,0]))),5),'colors':ramp}
        out.append(dict(id=id,shadow=a,light=b,ramps=metrics))
    version=browser.version
    browser.close()
print(json.dumps({'browser':version,'source':'opaque actor idle/0 L percentiles 10,90','all':out,
    'aggregate_median_cv':{name:round(float(np.median([x['ramps'][name]['steps_cv'] for x in out])),5) for name in cases}},indent=2))
