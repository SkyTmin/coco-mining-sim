from pathlib import Path
from PIL import Image,ImageChops
import hashlib,json,sys
records=json.loads(Path(__file__).with_name('inputs.json').read_text())
f0,run,out=map(Path,sys.argv[1:]); verify=[]
for x in records:
 a=Image.open(f0/'viewers'/(x['key']+'.png')).convert('RGB')
 b=Image.open(run/(x['id']+'-uniform.png')).convert('RGB')
 w,h=x['w'],x['h']; row=[]
 for i,n in enumerate(x['uniform']):
  left=i%3*(w+4); top=i//3*(h+17)
  first=a.crop((left,top,left+w,top+h))
  left=i%3*w; top=i//3*(h+17)+17
  second=b.crop((left,top,left+w,top+h))
  dif=ImageChops.difference(first,second)
  status=dif.getbbox()
  row.append(dict(frame=n,identical=status is None,bounding=status,
                  original=hashlib.sha256(first.tobytes()).hexdigest(),rerender=hashlib.sha256(second.tobytes()).hexdigest()))
 verify.append(dict(id=x['id'],rows=row))
print('pictures',sum(len(x['rows']) for x in verify),'equal', sum(r['identical'] for x in verify for r in x['rows']))
out.write_text(json.dumps(verify,ensure_ascii=False,indent=2)+'\n')
