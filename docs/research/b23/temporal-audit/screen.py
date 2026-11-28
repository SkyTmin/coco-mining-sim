"""From tools/creatures; list equal-neighbour triads in frozen per-frame fingerprints. No writes to the checked-out tree."""
from pathlib import Path
import json,sys
directory=Path('golden')
hits=[]; count=clips=triples=0; by_id={}
for f in sorted(directory.glob('*.json')):
    doc=json.loads(f.read_text())
    by_id[f.stem]=0
    for clip,seq in doc.items():
        count+=len(seq);clips+=1;triples+=max(0,len(seq)-2)
        for frame in range(1,len(seq)-1):
            if seq[frame-1]==seq[frame+1] and seq[frame]!=seq[frame-1]:
                hits.append(dict(id=f.stem,clip=clip,frame=frame,neighbour=seq[frame-1],middle=seq[frame]))
                by_id[f.stem]+=1
out=Path(sys.argv[1])
out.write_text(json.dumps(dict(paintings=len(by_id),clips=clips,frames=count,within_clip_triples=triples,all_by_painting=by_id,hits=hits),indent=2)+'\n')
