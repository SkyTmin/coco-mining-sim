# Renders the mine wall in one texture style: python3 assets/concepts/blocks/scene.py <A|B|C> <out.png> [w h samples]
# Every block is a full cube with the texture on all six faces (UV 0..1 per face). Floor, side walls and ceiling are
# blocks too. Style C gets a real geometric bevel.
import math
import os
import sys

import bpy  # noqa: I001  (bpy must load before bmesh)
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex")
style = sys.argv[1]
out = sys.argv[2]
W, H, SAMPLES = (int(v) for v in (sys.argv[3:6] if len(sys.argv) > 5 else (1280, 640, 48)))

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("w")
sc.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.20, 0.22, 0.30, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.75

mats = {}


def mat(name, dim=1.0):
    key_ = (name, dim)
    if key_ in mats:
        return mats[key_]
    if False:
        return mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.85
    img = nt.nodes.new("ShaderNodeTexImage")
    img.image = bpy.data.images.load(os.path.join(TEX, f"{style}_{name}.png"))
    img.interpolation = "Smart" if style == "C" else "Closest"
    if dim != 1.0:
        mul = nt.nodes.new("ShaderNodeMix")
        mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
        mul.inputs["Factor"].default_value = 1.0
        mul.inputs[7].default_value = (dim, dim * 0.95, dim * 0.9, 1)
        nt.links.new(img.outputs["Color"], mul.inputs[6])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
    else:
        nt.links.new(img.outputs["Color"], bsdf.inputs["Base Color"])
    if name.endswith("amber") or name.endswith("gem"):
        nt.links.new(img.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 0.45 if name.endswith("amber") else 0.2
    mats[key_] = m
    return m


def cube_mesh():
    me = bpy.data.meshes.new("cube")
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=0.985)
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        n = f.normal
        for lp in f.loops:
            co = lp.vert.co
            if abs(n.z) > 0.5:
                u, v = co.x, co.y
            elif abs(n.x) > 0.5:
                u, v = co.y * (1 if n.x > 0 else -1), co.z
            else:
                u, v = co.x * (-1 if n.y > 0 else 1), co.z
            lp[uv].uv = (u / 0.985 + 0.5, v / 0.985 + 0.5)
    bm.to_mesh(me)
    bm.free()
    return me


MESH = cube_mesh()


def block(x, y, z, name, dim=1.0):
    ob = bpy.data.objects.new("b", MESH.copy())
    ob.data.materials.append(mat(name, dim))
    ob.location = (x, y, z)
    if style == "C":
        bv = ob.modifiers.new("bv", "BEVEL")
        bv.width, bv.segments = 0.07, 3
    sc.collection.objects.link(ob)


# wall: 7 wide (x -3..3), 3 high (z 0..2), depth layers y = 0..5
ores = {(-2, 0, 0): "coal", (0, 0, 2): "copper", (2, 0, 2): "iron", (-1, 0, 1): "gem", (2, 0, 0): "amber",
        (-3, 0, 2): "iron", (1, 1, 1): "coal", (1, 2, 0): "gem", (0, 3, 1): "amber", (-3, 0, 1): "copper_crack"}
holes = {(0, 0, 0), (0, 0, 1), (1, 0, 0), (0, 1, 0), (1, 0, 1), (0, 1, 1)}
for d in range(6):
    for x in range(-3, 4):
        for z in range(3):
            if (x, d, z) in holes:
                continue
            name = ores.get((x, d, z))
            block(x, d, z, f"w1_{name}" if name else "w1_rock")
# tunnel shell: floor, side walls, ceiling — blocks in front of the wall and around it
for d in range(-6, 7):
    for x in range(-4, 5):
        block(x, d, -1, "floor")
        if d < 0 or d > 5:
            pass
    for z in range(0, 4):
        block(-4, d, z, "w1_rock", 0.55)
        block(4, d, z, "w1_rock", 0.55)
    for x in range(-4, 5):
        block(x, d, 3, "w1_rock", 0.45)

# light: warm key from the player's lamp + cool fill
def light(kind, loc, energy, color, size=1.0):
    ld = bpy.data.lights.new(kind, kind)
    ld.energy, ld.color = energy, color
    if kind == "AREA":
        ld.size = size
    ob = bpy.data.objects.new(kind, ld)
    ob.location = loc
    sc.collection.objects.link(ob)
    return ob

key = light("AREA", (1.5, -4.5, 2.4), 420, (1.0, 0.88, 0.72), 2.5)
key.rotation_euler = (math.radians(70), 0, math.radians(15))
light("POINT", (0, 2.0, 1.2), 30, (1.0, 0.8, 0.5))
light("POINT", (-3, -2, 2.2), 25, (0.7, 0.8, 1.0))

cam_d = bpy.data.cameras.new("cam")
cam_d.lens = 22
cam = bpy.data.objects.new("cam", cam_d)
cam.location = (0.7, -5.6, 1.5)
direction = Vector((0.0, 1.0, 0.8)) - cam.location
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
sc.collection.objects.link(cam)
sc.camera = cam
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("saved", out)
