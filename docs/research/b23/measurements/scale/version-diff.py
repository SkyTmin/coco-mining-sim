"""From checkout root: python version-diff.py FRAMES22 FRAMES24"""
from pathlib import Path
import json,sys
from collections import Counter

golden=Path("tools/creatures/golden")
summary={}
for root in sys.argv[1:]:
    root=Path(root)
    mismatches=[]
    total=0
    for p in sorted(root.glob("*/frames.json")):
        id=p.parent.name
        baseline=json.loads((golden/(id+".json")).read_text())
        for row in json.loads(p.read_text()):
            clip,frame=row["clip"],row["frame"]
            expected=baseline[clip][frame]
            if row["hash"]!=expected:
                mismatches.append(dict(id=id,clip=clip,frame=frame,expected=expected,actual=row["hash"]))
            total+=1
    summary[root.name]={"sampled":total,"mismatches":mismatches}
print(json.dumps(summary,indent=2))
