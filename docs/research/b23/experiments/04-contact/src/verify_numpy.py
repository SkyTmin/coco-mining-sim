"""Reviewer, independent NumPy geometry from the preregistered random cases; does not import trial or detector."""
import math,json
import numpy as np
seed=420261128
def rng():
 global seed
 seed=(1664525*seed+1013904223)&0xffffffff
 return seed/2**32
def unit(v):return np.asarray(v)/np.linalg.norm(v)
stats={name:{key:0 for key in ('tp','fn','fp','tn')} for name in ('sampled','continuous')}
error=0
for i in range(1200):
 direction=unit([2*rng()-1 for _ in range(3)])
 dx,dy,dz=direction
 perp=unit([dy,-dx,0] if abs(dz)<.9 else [dz,0,-dx])
 radii=np.array([2+8*rng(),2+14*rng(),2+18*rng()])
 length=8+32*rng();at=.06+.88*rng();angle=rng()*math.tau;rod=min(radii)*(.025+.025*rng())
 off=.5*rng() if i%2==0 else .61+1.1*rng()
 c,s=math.cos(angle),math.sin(angle)
 matrix=np.array([[c,0,s],[0,1,0],[-s,0,c]]) @ np.diag(radii)
 center=np.array([11,-12,25]);world=lambda t:center+matrix@(length*(t-at)*direction+off*perp)
 a,b=[np.linalg.solve(matrix,world(t)-center) for t in (0,1)]
 # Independent line-to-point distance via parallelogram area divided by edge length.
 if np.dot(a,b-a)>=0: distance=np.linalg.norm(a)
 elif np.dot(b,a-b)>=0: distance=np.linalg.norm(b)
 else: distance=np.linalg.norm(np.cross(a,b))/np.linalg.norm(b-a)
 sample=min(np.linalg.norm(z) for z in np.linspace(a,b,11))
 error=max(error,abs(distance-off))
 truth=off<.55
 for k,d in [('continuous',distance),('sampled',sample)]:
  pred=d<.55
  stats[k][('tp' if pred else 'fn') if truth else ('fp' if pred else 'tn')]+=1
print(json.dumps({'seed':420261128,'cases':1200,'matrix':stats,'maxAbsError':error},indent=2))
