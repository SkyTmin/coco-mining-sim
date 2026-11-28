"""One freely decaying degree of freedom. Initial x=1, v=0, constant equilibrium 0."""
from math import cos, exp, pi, sin, sqrt
import json
rows=[]
for nu in (2,6,12):
    omega=2*pi*nu
    zeta=0.25
    for substeps in (1,2,4,8):
        x,v=1.,0.
        dt=1/(24*substeps)
        max_error=0.
        peak=0.
        for k in range(1,49):
            for sub in range(substeps):
                v+=dt*(-2*zeta*omega*v-omega*omega*x)
                x+=dt*v
            t=k/24
            b=omega*sqrt(1-zeta*zeta)
            exact=exp(-zeta*omega*t)*(cos(b*t)+zeta*omega/b*sin(b*t))
            max_error=max(max_error,abs(x-exact))
            peak=max(peak,abs(x))
        rows.append(dict(hz=nu,substeps=substeps,samples=48,max_error=max_error,peak_at_output=peak))
print(json.dumps(rows,indent=2))
