"""Run at checkout root. Count working-tree payload, without Git objects or caches."""
from pathlib import Path
import json,subprocess

tools=Path("tools/creatures")
v=tools/"viewer"
golden={p.stem for p in (tools/"golden").glob("*.json")}
catalog=json.load(open(v/"catalog.json"))
ids=[entry["id"] for entry in catalog if entry["id"] in golden]
assert len(ids)==41
shared=[]
for p in (v/"atlases").rglob("*"):
    if p.is_file() and p.relative_to(v/"atlases").parts[0] not in golden:
        shared.append(p)
other=[p for p in v.glob("*.mjs") if p.name not in ["publish-gallery.mjs","make-posters.mjs","publish-pages.mjs"]]
other+= [v/"catalog.json",v/"artifact/index.html",v/"artifact/gallery.css"]
inventory={}
for id in ids:
    files=list(p for p in (v/"atlases"/id).rglob("*") if p.is_file())
    atlas=v/"atlases"/id/"atlas.json"
    assert atlas.exists() or next(e for e in catalog if e["id"]==id).get("runtime")=="f1"
    j=json.load(open(atlas)) if atlas.exists() else {"actors":{"pages":[]}}
    golden_path=tools/"golden"/(id+".json");refs=json.load(open(golden_path))
    inventory[id] = dict(files=len(files),bytes=sum(p.stat().st_size for p in files),
                         frames=sum(map(len,refs.values())),goldenBytes=golden_path.stat().st_size,
                         sourceBytes=sum(p.stat().st_size for p in (tools/"c").glob(id+"*") if p.is_file() and (p.name.startswith(id+".") or p.name.startswith(id+"-"))),
                         actorPages=len(j["actors"]["pages"]))
def total(which,n):
    return sum(inventory[ids[i%41]][which] for i in range(n))
out={"basisIds":ids,"currentAtlasBytes":sum(p.stat().st_size for p in (v/"atlases").rglob("*") if p.is_file()),
     "actualShelfCatalogEntries":len(catalog),"sharedArchiveAndOtherBytes":sum(p.stat().st_size for p in shared+other),
     "sharedArchiveAndOtherFiles":len(shared+other),"model":[],"byPainting":inventory}
for n in (41,100,300):
    out["model"].append({"count":n,**{x:total(x,n) for x in ("files","bytes","frames","goldenBytes","sourceBytes","actorPages")}})
basis=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()
records=subprocess.check_output(["git","ls-tree","-rlz","--full-tree",basis]).split(b"\0")
out["trackedBasis"]=basis
out["trackedFileBytes"]=sum(int(record.split(b"\t",1)[0].split()[-1]) for record in records if record and b" blob " in record.split(b"\t",1)[0])
print(json.dumps(out,ensure_ascii=False,indent=2))
