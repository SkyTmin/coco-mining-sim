"""Independent 3D and screen metrics on raw endpoints, plus fixtures at the decision boundary."""
from pathlib import Path
import collections, json, math, re
import numpy as np

base=Path(__file__).resolve().parent
raw=json.loads((base/'callsite-raw.json').read_text())
registry=json.loads((base/'cap-sources.json').read_text())
projection=np.array([[1.,0.,0.],[0.,.6,-.8]])
length=lambda a: float(np.linalg.norm(a))
def metrics(pair):
 v=np.asarray(pair[1],dtype=float)-pair[0]
 return length(v),length(projection@v)

def controls():
 specs=[
  ('rigid translation', [[0,0,0],[8,0,0]], [[18,-26,31],[26,-26,31]], False),
  ('rigid yaw',[[0,0,0],[8,0,0]],[[0,0,0],[0,8,0]],False),
  ('direction along optical axis',[[0,0,0],[8,0,0]],[[0,0,0],[0,6.4,4.8]],False),
  ('tolerance exactly +1',[[0,0,0],[8,0,0]],[[0,0,0],[9,0,0]],False),
  ('tolerance exactly -1',[[0,0,0],[8,0,0]],[[0,0,0],[7,0,0]],False),
  ('just too long',[[0,0,0],[8,0,0]],[[0,0,0],[9.00001,0,0]],True),
  ('just too short',[[0,0,0],[8,0,0]],[[0,0,0],[6.99999,0,0]],True),
 ]
 out={}
 for name,rest,now,expected in specs:
  a,b=metrics(rest),metrics(now)
  tripped=abs(a[0]-b[0])>1
  assert tripped==expected
  out[name]={'3d':[a[0],b[0]],'screen':[a[1],b[1]],'alert':tripped}
 # Counterexample to the use of shoulder--hand as a single bone.
 rest=np.array([[0.,0,0],[3.,4,0],[6.,0,0]])
 pose=np.array([[0.,0,0],[5.,0,0],[10.,0,0]])
 out['two rigid bones extend the reach']={'segmentsRest':np.linalg.norm(np.diff(rest,axis=0),axis=1).tolist(),'segmentsNow':np.linalg.norm(np.diff(pose,axis=0),axis=1).tolist(),'reach':[length(rest[-1]-rest[0]), length(pose[-1]-pose[0])]}
 assert out['two rigid bones extend the reach']['segmentsRest']==[5,5] and out['two rigid bones extend the reach']['reach']==[6,10]
 # Parent geometry scale and post-projection zoom are different from a local extension.
 for name,v,scale in [('uniform parent', [0.,0,8.], [1.5]*3), ('anisotropic parent + pitch',[0.,0,8.],[1.,1.,1.5])]:
  local0=np.array([8.,0,0]); local=np.array(v)
  authored0=np.ones(3) if name=='uniform parent' else np.array(scale)
  world0=local0*authored0; world=local*np.array(scale)
  assert length(local)==length(local0) and length(world)-length(world0)==4
  out[name]={'local':[length(local0),length(local)],'placed':[length(world0),length(world)],'screen':[length(projection@world0),length(projection@world)]}
 out['camera zoom after projection']={'model':[8,8],'screen':[8,12],'cameraZoom':[1,1.5]}
 return out

def segments(sample, rules):
 out={}
 for rule in rules:
  reference=f"{rule['file']}:{rule['line']}"
  groups=collections.defaultdict(list)
  for prim in sample:
   if prim.get('file')==reference and re.fullmatch(rule['part'],prim['tag']): groups[prim['tag']].append(prim)
  for tag,items in groups.items():
   if len(items)!=len(rule['roles']): continue
   for role,item in zip(rule['roles'],items):
    name=f'{tag}/{reference}/{role}'
    before,screen0=metrics(item['pre']); world,screen=metrics(item['final'])
    out[name]={'preshaping':before,'placed':world,'projected':screen}
 return out

summary=[]
for row in raw:
 rules=[r for r in registry if r['painting']==row['id']]
 samples={k:segments(v,rules) for k,v in row['samples'].items()}
 rest=samples['idle']; pairs=[]; missing=collections.Counter()
 for mode in ['idleQuarter','move']:
  new=samples[mode]
  for k in sorted(set(rest)|set(new)):
   if k not in rest or k not in new:
    missing[mode]+=1;continue
   a,b=rest[k],new[k]
   pairs.append(dict(id=k,mode=mode,pre=[a['preshaping'],b['preshaping']],placed=[a['placed'],b['placed']],screen=[a['projected'],b['projected']]))
 def key(p,v): return abs(p[v][1]-p[v][0])
 metrics_={field:sum(key(p,field)>1.0 for p in pairs) for field in ['pre','placed','screen']}
 changed25=[p for p in pairs if key(p,'screen')>1 and key(p,'placed')<1e-5]
 rescaled=[p for p in pairs if key(p,'placed')>1 and key(p,'pre')<1e-5]
 summary.append(dict(id=row['id'],sourceMove=row['move'],restSegments=len(rest),comparisons=len(pairs),missing=missing,overOne=metrics_,projectionOnly=len(changed25),afterPlacementOnly=len(rescaled),exampleProjection=next(iter(changed25),None),exampleAfterPlacement=next(iter(rescaled),None),largestPlaced=max(pairs,key=lambda p:key(p,'placed'),default=None)))
result={'samples':['idle, t0 side0','idle, t0 side4','trick or first tech/walk, half duration side0'],'controls':controls(),'rows':summary}
(base/'vector-control.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('rows',len(summary),'rest segments',sum(p['restSegments'] for p in summary),'interpretable',sum(bool(p['comparisons']) for p in summary),'comparisons',sum(p['comparisons'] for p in summary))
print('over threshold', {k:sum(p['overOne'][k] for p in summary) for k in ['pre','placed','screen']})
print('screen only (placed unchanged)',sum(p['projectionOnly'] for p in summary),'placement only (pre unchanged)',sum(p['afterPlacementOnly'] for p in summary))
for p in summary:
 if p['exampleAfterPlacement']: print(p['id'],p['exampleAfterPlacement'])
