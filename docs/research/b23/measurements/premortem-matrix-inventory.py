"""Run from tools/creatures. Read page headers, union of reference rectangles, seeds, and catalog metadata."""
from collections import defaultdict
from pathlib import Path
import json
import sys
from PIL import Image, ImageDraw
root=Path('.')
ids=sorted(p.stem for p in (root/'golden').glob('*.json'))
if len(ids)!=41: raise RuntimeError('Expected original 41 goldens')
seeds=defaultdict(list);missing=[];extra=[];records=[];data_errors=[]
for subject in ids:
    b=root/'../../assets/creatures'/subject/'behavior.json'
    if b.is_file():
        s=json.loads(b.read_text())['seed'];seeds[s % 2**32].append([subject,s]);
        if not 0<=s<2**32:extra.append([subject,s])
    else:missing.append(subject)
    directory=root/'viewer/atlases'/subject;atlas=directory/'atlas.json'
    if not atlas.is_file(): continue
    a=json.loads(atlas.read_text())['actors'];rects=defaultdict(list)
    for index,x,y,w,h in a['rects']: rects[index].append((x,y,w,h))
    for page, name in enumerate(a['pages']):
        path=directory/name
        with Image.open(path) as im: size=im.size
        d=Image.new('1',size);paint=ImageDraw.Draw(d)
        for x,y,w,h in rects[page]:
            if not (w>0 and h>0 and x>=0 and y>=0 and x+w<=size[0] and y+h<=size[1]):data_errors.append([subject,page,x,y,w,h]);continue
            paint.rectangle((x,y,x+w-1,y+h-1),fill=1)
        total=size[0]*size[1];used=sum(d.histogram()[1:]);records.append({'id':subject,'file':name,'px':total,'used_px':used,'size':size,'file_bytes':path.stat().st_size})
catalog=json.loads((root/'viewer/catalog.json').read_text())
result={'subject_count':len(ids),'seed_values':sum(map(len,seeds.values())),'seed_unavailable':missing,'seed_outside_uint32':extra,'seed_normalized_collisions':{str(k):v for k,v in seeds.items() if len(v)>1},'catalog_rows':len(catalog),'entry_keys':sorted(set().union(*(r.keys() for r in catalog))),'page_count':len(records),'total_rgba_bytes':4*sum(r['px'] for r in records),'unreferenced_rgba_bytes':4*sum(r['px']-r['used_px'] for r in records),'invalid_rectangles':data_errors,'pages':records}
Path(sys.argv[1]).write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
