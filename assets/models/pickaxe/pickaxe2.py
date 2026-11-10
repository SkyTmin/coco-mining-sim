# Owner's pickaxe2.py, coco-prison-roblox stage-1 at 3d7ba53.
# Build the original Blender mesh, then export colored Roblox voxel boxes.
# Run: blender.exe -b -P assets/models/pickaxe/pickaxe2.py

import math
import random
import json
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

PX = 0.1  # studs per voxel


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))


def srgb_to_linear(c):
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)


# ---------------------------------------------------------------- palette
OAK = ["#7a5532", "#6c4a2b", "#85603a"]
OAK_DARK = "#56391f"
TWINE = "#cdb68a"
TWINE_DARK = "#a08a5c"
HEAD = ["#a87c48", "#9c7040", "#b08450"]
HEAD_HI = "#c8a068"
HEAD_LO = "#6e5230"
TIP = "#d2ac74"
BIND = "#5e4024"

rng = random.Random(2611)
vox = {}


def put(x, y, z, col):
    vox[(x, y, z)] = col


# ---------------------------------------------------------------- the handle: 4×4, z -26..12, the butt cap wider
HX = (-2, -1, 0, 1)
for z in range(-26, 17):
    for x in HX:
        for y in HX:
            if z <= -24 or z >= 13:
                col = OAK_DARK
            elif x == -2 and y == 1:
                col = OAK_DARK if rng.random() < 0.7 else OAK[1]  # a dark grain streak down one corner
            else:
                col = OAK[(z // 3 + x + 2 * y + rng.randint(0, 1)) % 3]
            put(x, y, z, col)
for z in (-27, -26, -25):  # the butt: a px wider all round
    for x in range(-3, 3):
        for y in range(-3, 3):
            if x in (-3, 2) and y in (-3, 2):
                continue
            put(x, y, z, BIND if (x + y + z) % 4 == 0 else OAK_DARK)
for z in range(-22, -12):  # the twine grip: wraps a px proud, a dark line between wraps
    for x in range(-3, 3):
        for y in range(-3, 3):
            if x in (-3, 2) or y in (-3, 2):
                if x in (-3, 2) and y in (-3, 2):
                    continue
                put(x, y, z, TWINE_DARK if z % 2 == 0 else TWINE)


# ---------------------------------------------------------------- the crescent head: an arc of radius 21 round
# (−0.5, −10) swept ±72°, 9 px thick in the middle tapering to a point at both ends
CX, CZ, R, SWEEP = -0.5, -10.0, 21.0, math.radians(72)
for x in range(-24, 24):
    for z in range(-8, 20):
        px, pz = x + 0.5 - 0.5 - CX, z + 0.5 - CZ
        th = math.atan2(px, pz)  # 0 straight up
        if abs(th) > SWEEP:
            continue
        k = abs(th) / SWEEP
        half = 0.5 + 4.2 * (1 - k) ** 0.8
        dr = math.hypot(px, pz) - R
        if abs(dr) > half:
            continue
        depth = (-2, -1, 0, 1) if k < 0.2 else ((-2, -1, 0, 1) if k < 0.55 else (-1, 0))
        for y in depth:
            if k > 0.84:
                col = TIP
            elif dr > half - 1:
                col = HEAD_HI  # the top edge
            elif dr < -half + 1:
                col = HEAD_LO  # the underside
            else:
                col = HEAD[rng.randint(0, 2)]
            put(x, y, z, col)
# worn nicks on the top edge
for x in (-12, 8, 15):
    zs = [z for (vx, vy, z) in vox if vx == x and vy == 0 and vox[(vx, vy, z)] == HEAD_HI]
    if zs:
        for y in (-2, -1, 0, 1):
            vox.pop((x, y, max(zs)), None)

# ---------------------------------------------------------------- the binding block with a rope X, the peg on top
for z in range(5, 15):
    for x in range(-4, 4):
        for y in range(-4, 4):
            if -4 < x < 3 and -4 < y < 3:
                continue  # inside
            u = (x + 0.5) if y in (-4, 3) else (y + 0.5)  # across the face
            v = z - 9.5
            put(x, y, z, TWINE if abs(abs(u) - abs(v)) < 1.0 else BIND)
for x in HX:
    for y in HX:
        put(x, y, 15, OAK_DARK)
        put(x, y, 16, OAK_DARK)

# ---------------------------------------------------------------- mesh: one cube per voxel, inner faces dropped
def build():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    mats = {}
    me = bpy.data.meshes.new("WoodenPickaxe")
    obj = bpy.data.objects.new("WoodenPickaxe", me)
    bpy.context.scene.collection.objects.link(obj)
    bm = bmesh.new()
    faces_dir = [
        ((1, 0, 0), [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)]),
        ((-1, 0, 0), [(0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)]),
        ((0, 1, 0), [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)]),
        ((0, -1, 0), [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)]),
        ((0, 0, 1), [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)]),
        ((0, 0, -1), [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)]),
    ]
    verts = {}

    def v(p):
        if p not in verts:
            verts[p] = bm.verts.new(Vector(p) * PX)
        return verts[p]

    for (x, y, z), col in vox.items():
        # a slight per-voxel shade jitter so flat colours read as pixels
        key = col + "%d" % rng.randint(0, 2)
        if key not in mats:
            base = hexrgb(col)
            j = [0.94, 1.0, 1.05][int(key[-1])]
            m = bpy.data.materials.new(key)
            m.use_nodes = True
            bsdf = m.node_tree.nodes["Principled BSDF"]
            bsdf.inputs["Base Color"].default_value = srgb_to_linear(tuple(min(1, c * j) for c in base)) + (1,)
            bsdf.inputs["Roughness"].default_value = 1.0
            if "Specular IOR Level" in bsdf.inputs:
                bsdf.inputs["Specular IOR Level"].default_value = 0.0
            me.materials.append(m)
            mats[key] = len(me.materials) - 1
        for n, quad in faces_dir:
            if (x + n[0], y + n[1], z + n[2]) in vox:
                continue
            f = bm.faces.new([v((x + a, y + b, z + c)) for a, b, c in quad])
            f.material_index = mats[key]
    # centre the mesh on its bounding box so every view turns round the middle
    lo = Vector((min(p.co.x for p in bm.verts), min(p.co.y for p in bm.verts), min(p.co.z for p in bm.verts)))
    hi = Vector((max(p.co.x for p in bm.verts), max(p.co.y for p in bm.verts), max(p.co.z for p in bm.verts)))
    mid = (lo + hi) / 2
    for p in bm.verts:
        p.co -= mid
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    # centre on the grip so rotations look natural
    obj.location = (-0.0 * PX, 0, 0)
    return obj


def pack_boxes():
    """Greedily merge equal colors while keeping the voxel silhouette."""
    origin = tuple(min(position[axis] for position in vox) for axis in range(3))
    limit = tuple(max(position[axis] for position in vox) + 1 for axis in range(3))
    palette = sorted(set(vox.values()))
    surface = {
        (x, y, z) for x, y, z in vox
        if any((x + dx, y + dy, z + dz) not in vox for dx, dy, dz in (
            (1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)
        ))
    }
    remaining = dict(vox)
    boxes = []
    for x, y, z in sorted(surface, key=lambda at: (at[2], at[1], at[0])):
        color = remaining.get((x, y, z))
        if color is None:
            continue

        def fits(position):
            return position in remaining and (position not in surface or remaining[position] == color)

        w, d, h = 1, 1, 1
        while fits((x + w, y, z)):
            w += 1
        while all(fits((x + i, y + d, z)) for i in range(w)):
            d += 1
        while all(fits((x + i, y + j, z + h)) for i in range(w) for j in range(d)):
            h += 1
        for i in range(w):
            for j in range(d):
                for k in range(h):
                    del remaining[(x + i, y + j, z + k)]
        boxes.append([x - origin[0], y - origin[1], z - origin[2], w, d, h, palette.index(color)])
    assert not (surface & remaining.keys())
    size = [hi - lo for lo, hi in zip(origin, limit)]
    return {"size": size, "p": [color.lstrip("#") for color in palette], "b": boxes, "tilt": 45}


def export():
    obj = build()
    assert obj.data.polygons and len(obj.data.materials) > 1
    data = pack_boxes()
    root = Path(__file__).resolve().parents[3]
    output = root / "src/shared/Models/wooden_pickaxe.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="\n") as file:
        file.write(json.dumps(data, separators=(",", ":")) + "\n")
    print(f"{len(vox)} original voxels, {len(obj.data.polygons)} Blender faces, {len(data['b'])} Roblox boxes")


export()
