"""Assemble the 41 mobile capture files without rescaling plus separate 4× central crops."""
import json, sys
from pathlib import Path
from PIL import Image,ImageDraw
d=Path(sys.argv[1]);dest=Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True)
data=json.loads((d/'results.json').read_text())['paintings']
for offset in range(0,len(data),6):
 rows=data[offset:offset+6]
 images=[Image.open(d/(r['id']+'.png')).convert('RGB') for r in rows]
 col=max(i.width for i in images)+4;line=max(i.height for i in images)+20
 full=Image.new('RGB',(col*2,line*((len(rows)+1)//2)),(24,26,30))
 details=Image.new('RGB',(2*220,((len(rows)+1)//2)*177),(24,26,30))
 for n,(r,im) in enumerate(zip(rows,images)):
  x=n%2*col;y=n//2*line
  full.paste(im,(x,y)); ImageDraw.Draw(full).text((x+2,y+im.height),r['id']+' '+r['clip']+'/'+str(r['frame']),fill='white')
  cx=im.width//2;cy=im.height//2
  enlarged=im.crop((cx-22,cy-18,cx+22,cy+18)).resize((176,144),Image.Resampling.NEAREST)
  x=n%2*220;y=n//2*177;details.paste(enlarged,(x,y));ImageDraw.Draw(details).text((x+2,y+145),r['id']+' x4',fill='white')
 full.save(dest/(f'native-{offset//6+1}.jpg'),quality=95);details.save(dest/(f'x4-{offset//6+1}.png'))
