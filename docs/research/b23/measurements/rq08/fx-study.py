"""Three numerical fixtures. Only coverage and pixel coordinates, no artwork assets."""
import json,math

# If coverage is modelled by n identical optical-depth slices, preserve transmittance.
target=0.6
opacity=[]
for n in [1,2,4,8,16]:
    compensated=1-(1-target)**(1/n)
    out=lambda a:1-(1-a)**n
    opacity.append({'slices':n,'naive_out':round(out(target),6),'corrected_per_slice':round(compensated,6),
                    'corrected_out':round(out(compensated),6)})
# Ordered threshold derived recursively from quadrant order, without reading a foreign map.
def order(x,y):
    rank=0
    for bit,weight in [(1,1),(0,4)]:
        xb=(x>>bit)&1;yb=(y>>bit)&1
        rank+=((xb^yb)*2+yb)*weight
    return rank
levels=tuple(order(x,y) for y in range(4) for x in range(4))
assert sorted(levels)==list(range(16))
def mask(x,y):return order(x,y)<6
samples=[(x,y) for x in range(32) for y in range(16)]
def sample_at_screen(screen_x,y,origin,anchor):
    coordinate=screen_x-origin if anchor=="material" else screen_x
    return mask(coordinate,y)
def changed(dx,anchor):
    return sum(sample_at_screen(x,y,0,anchor)!=sample_at_screen(x+dx,y,dx,anchor) for x,y in samples)
motion=[{'dx':dx,'material_changed':changed(dx,"material"),
        'screen_changed_after_aligning_actor':changed(dx,"screen")}
        for dx in (1,2,3,4)]
# Emitter translates 2 px/tick, particle has 1 px/tick relative velocity; compare in world pixels.
positions=[]
for k in range(3):
    born=2*k
    age=8-born
    positions.append({'spawn_tick':born,'world_x_at_8':2*born+age,'local_x_at_8':2*8+age})
print(json.dumps({'target_alpha':target,'opacity':opacity,'thresholds':levels,'samples':len(samples),
                 'coverage':sum(mask(x,y) for x,y in samples),'motion':motion,'emitter':positions},indent=2))
