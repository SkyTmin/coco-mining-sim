"""Inventory the protected artwork and browser routes of two immutable Git revisions."""
import argparse
import json
import subprocess
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('repo',type=Path)
parser.add_argument('before')
parser.add_argument('after')
args=parser.parse_args()
def git(*values):
    return subprocess.check_output(['git','-C',str(args.repo),*values])
def snapshot(ref):
    sha=git('rev-parse',ref+'^{commit}').decode().strip()
    tree={}
    for entry in git('ls-tree','-r','-t','-z',sha,'--','tools/creatures','assets/creatures').split(b'\0'):
        if not entry:continue
        info,path=entry.split(b'\t',1)
        tree[path.decode()]=info.decode().split()[2]
    def data(path):
        return json.loads(git('cat-file','blob',tree[path]))
    base='tools/creatures/'
    gdir=base+'golden/'
    golden={p[len(gdir):-5]:oid for p,oid in tree.items() if p.startswith(gdir) and p.endswith('.json')}
    catalog=data(base+'viewer/catalog.json')
    visits={item['id']:item for item in catalog}
    assert len(visits)==len(catalog) and set(golden)<=visits.keys()
    rows={}
    for key,oid in sorted(golden.items()):
        route=visits[key]
        raw=data(gdir+key+'.json')
        assert raw and all(isinstance(frames,list) and frames for frames in raw.values())
        root=base+'viewer/atlases/'+key
        rows[key]=dict(id=key,name=route.get('name'),runtime=route.get('runtime','atlas'),
                       golden=oid,clips=len(raw),frames=sum(map(len,raw.values())),
                       card=tree.get(base+'c/'+key+'.card.json'),
                       behavior=tree.get('assets/creatures/'+key+'/behavior.json'),
                       actorModule=tree.get(base+'c/'+key+'.ts'),
                       browserAssets=tree.get(root))
    return dict(revision=sha,catalog=tree[base+'viewer/catalog.json'],galleryEntries=len(catalog),
                posters=tree[base+'viewer/atlases/posters'],allAtlasFiles=tree[base+'viewer/atlases'],
                outsideGolden=sorted(set(visits)-set(rows)),rows=rows)
first,second=map(snapshot,(args.before,args.after))
assert first['rows'].keys()==second['rows'].keys()
ledger=second.pop('rows')
past=first.pop('rows')
deltas={}
for key,row in ledger.items():
    changes={k:{'before':past[key][k],'after':value} for k,value in row.items() if past[key][k]!=value}
    if changes:deltas[key]=changes
print(json.dumps(dict(before=first,after=second,protected=len(ledger),
                      protectedFrames=sum(x['frames'] for x in ledger.values()),
                      beforeFrames=sum(x['frames'] for x in past.values()),
                      different=deltas,paintings=list(ledger.values())),
                 ensure_ascii=False,indent=2))
