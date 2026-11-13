"""
The visual benchmark: the skull, its oak riser, the display platform and the cabinet's front corner,
rendered in Cycles from the browser's own camera. This render is the art-direction target for the
real-time scene, not part of the web build.

    blender -b --factory-startup --python blender/build_museum.py           # first, if the models changed
    blender -b blender/museum.blend --python blender/benchmark.py           # then this

Writes:
    blender/benchmark/benchmark.blend   editable source: the gallery's first bay with the benchmark lighting
    blender/benchmark/reference.png     the target, cropped to the benchmark region of a 2880x1800 frame

The camera comes from the browser at 1440x900 CSS px (2x), case 1 at rest: three.js position
(-0.08, 1.48, 2.95), direction (0.2238, -0.2057, -0.9527), vertical FOV 31 degrees. three.js is Y-up
facing +Z; Blender is Z-up facing -Y, so (x, y, z) in three.js is (x, -z, y) here.

Benchmark materials are local copies, so the shared museum materials and the export are untouched.
"""

import math
import os

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "benchmark")
os.makedirs(OUT, exist_ok=True)

# The benchmark crop in the browser's 2880x1800 frame (x, y from the top left, width, height).
FRAME = (2880, 1800)
CROP = (620, 540, 880, 640)

# Everything that isn't part of the first bay's vignette stands in the first case in Blender: hide it.
HIDE = ["Samples", "KDS", "Laptop", "Planning", "AfterHours", "Desk", "Plinth", "SnakePlant", "Pothos", "Books", "CaseWide"]

scene = bpy.context.scene


def three_to_blender(v):
    x, y, z = v
    return Vector((x, -z, y))


def hide_tree(name):
    root = bpy.data.objects.get(name)
    if root:
        for obj in [root, *root.children_recursive]:
            obj.hide_render = True
            obj.hide_viewport = True


for name in HIDE:
    hide_tree(name)
print("[benchmark] names", sorted(o.name for o in scene.objects if o.name.split(".")[0] in ("Frame", "Trim", "Deck", "Riser", "Glass", "Cabinet", "DrawerOak", "DrawerBrass")))

# ---------------------------------------------------------------- camera, matched to the browser

cam_data = bpy.data.cameras.new("BenchmarkCamera")
cam_data.sensor_fit = "VERTICAL"
cam_data.angle_y = math.radians(31)
cam_data.clip_start = 0.05
cam = bpy.data.objects.new("BenchmarkCamera", cam_data)
scene.collection.objects.link(cam)
cam.location = three_to_blender((-0.08, 1.48, 2.95))
direction = three_to_blender((0.22380612955591905, -0.20565968661895262, -0.9526882541907365))
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

scene.render.resolution_x, scene.render.resolution_y = FRAME
scene.render.resolution_percentage = 100
x, y, w, h = CROP
scene.render.use_border = True
scene.render.use_crop_to_border = True
scene.render.border_min_x = x / FRAME[0]
scene.render.border_max_x = (x + w) / FRAME[0]
scene.render.border_min_y = 1 - (y + h) / FRAME[1]
scene.render.border_max_y = 1 - y / FRAME[1]

# ---------------------------------------------------------------- materials (local benchmark copies)


def node_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat, mat.node_tree.nodes, mat.node_tree.links, mat.node_tree.nodes["Principled BSDF"]


def assign(obj_names, mat):
    for name in obj_names:
        obj = bpy.data.objects.get(name)
        if obj and obj.type == "MESH":
            obj.data.materials.clear()
            obj.data.materials.append(mat)


def srgb(hex_color):
    h = hex_color.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c) + (1.0,)


# Plaster: pale and matte with a broad satin sheen, a whisper of translucency at thin edges, and fine
# tooth in the bump only (no grime: the light describes the form).
plaster, n, l, b = node_material("BenchPlaster")
b.inputs["Base Color"].default_value = srgb("#ecdfca")  # warm ivory
b.inputs["Roughness"].default_value = 0.52
b.inputs["Specular IOR Level"].default_value = 0.35
b.inputs["Subsurface Weight"].default_value = 0.12
b.inputs["Subsurface Radius"].default_value = (1.0, 0.85, 0.7)
b.inputs["Subsurface Scale"].default_value = 0.004
noise = n.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 900
noise.inputs["Detail"].default_value = 4
bump = n.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.06
bump.inputs["Distance"].default_value = 0.0004
l.new(noise.outputs["Fac"], bump.inputs["Height"])
l.new(bump.outputs["Normal"], b.inputs["Normal"])
tone = n.new("ShaderNodeTexNoise")
tone.inputs["Scale"].default_value = 40
ramp = n.new("ShaderNodeMapRange")
ramp.inputs["To Min"].default_value = 0.5
ramp.inputs["To Max"].default_value = 0.56
l.new(tone.outputs["Fac"], ramp.inputs["Value"])
l.new(ramp.outputs["Result"], b.inputs["Roughness"])
assign(["Skull"], plaster)


def bench_oak(name, source, quiet=0.4, rough=(0.4, 0.58)):
    """Waxed oak from the museum's own grain texture. The texture is very low in color contrast, so
    its figure gets a modest lift (less as `quiet` rises), roughness varies gently with the grain in a
    narrow satin band, and a faint bump lets the figure catch the light."""
    mat, n, l, b = node_material(name)
    src = bpy.data.materials[source]
    image = next(node.image for node in src.node_tree.nodes if node.type == "TEX_IMAGE" and "ao" not in node.image.name)
    uv = n.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"  # The grain UVs (the second map, "AOMap", carries the baked occlusion).
    tex = n.new("ShaderNodeTexImage")
    tex.image = image
    l.new(uv.outputs["UV"], tex.inputs["Vector"])
    # The grain texture itself is very low in contrast (the browser shows its figure mostly through
    # roughness). Here it gets a measured lift in contrast, less than full, so the figure reads quietly.
    figure = n.new("ShaderNodeBrightContrast")
    figure.inputs["Contrast"].default_value = 0.8 * (1 - quiet)
    l.new(tex.outputs["Color"], figure.inputs["Color"])
    tint = n.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1.0
    tint.inputs[7].default_value = srgb("#b0957c")  # The browser's oak tone, a touch less orange.
    l.new(figure.outputs["Color"], tint.inputs[6])
    l.new(tint.outputs[2], b.inputs["Base Color"])
    rmap = n.new("ShaderNodeMapRange")
    rmap.inputs["From Min"].default_value = 0.37
    rmap.inputs["From Max"].default_value = 0.45
    rmap.inputs["To Min"].default_value = rough[1]
    rmap.inputs["To Max"].default_value = rough[0]
    l.new(tex.outputs["Color"], rmap.inputs["Value"])
    l.new(rmap.outputs["Result"], b.inputs["Roughness"])
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.0003
    l.new(tex.outputs["Color"], bump.inputs["Height"])
    l.new(bump.outputs["Normal"], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = 0.45
    return mat


cabinet_oak = bench_oak("BenchCabinetOak", bpy.data.objects["Cabinet"].data.materials[0].name)
assign(["Cabinet", "DrawerOak"], cabinet_oak)
assign(["Riser"], bench_oak("BenchRiserOak", "OakGrain", quiet=0.45))

# Brass: softly polished, so curved rails and finials show a controlled highlight, not a mirror.
brass, n, l, b = node_material("BenchBrass")
b.inputs["Base Color"].default_value = srgb("#c09a5c")
b.inputs["Metallic"].default_value = 1.0
b.inputs["Roughness"].default_value = 0.27
assign(["Frame", "Trim", "DrawerBrass"], brass)

# Glass: thin panes. Transparent where seen face-on, a glossy reflection rising toward grazing angles.
glass, n, l, b = node_material("BenchGlass")
n.remove(b)
out = n["Material Output"]
fresnel = n.new("ShaderNodeLayerWeight")
fresnel.inputs["Blend"].default_value = 0.2
glossy = n.new("ShaderNodeBsdfGlossy")
glossy.inputs["Roughness"].default_value = 0.03
clear = n.new("ShaderNodeBsdfTransparent")
mix = n.new("ShaderNodeMixShader")
l.new(fresnel.outputs["Fresnel"], mix.inputs["Fac"])
l.new(clear.outputs["BSDF"], mix.inputs[1])
l.new(glossy.outputs["BSDF"], mix.inputs[2])
l.new(mix.outputs["Shader"], out.inputs["Surface"])
assign(["Glass"], glass)

# Linen deck: matte cloth with a little sheen at grazing angles.
linen, n, l, b = node_material("BenchLinen")
b.inputs["Base Color"].default_value = srgb("#d8caae")
b.inputs["Roughness"].default_value = 0.92
b.inputs["Sheen Weight"].default_value = 0.4
assign(["Deck"], linen)

for obj in scene.objects:
    if obj.name in ("Glass", "WindowGlass"):
        obj.hide_render = False

# ---------------------------------------------------------------- lighting


def light(name, kind, location, target, energy, color, size=None, spot=None, blend=0.9):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if kind == "SPOT":
        data.spot_size = spot
        data.spot_blend = blend
        data.shadow_soft_size = size
    elif kind == "AREA":
        data.shape = "DISK"
        data.size = size
    else:
        data.shadow_soft_size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    return obj


for obj in list(scene.objects):  # The still's lights from build_museum, if this file has them.
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)

# The exhibit key: the browser's spot position, broad and soft, warm white, from above and right.
key_at = three_to_blender((0.32, 3.1, -0.2 + 0.62))
key_to = three_to_blender((0.0, 0.825 + 0.08, -0.2))
light("Key", "SPOT", key_at, key_to, 900, (1.0, 0.84, 0.66), size=0.4, spot=math.radians(19), blend=0.9)
# Gentle warm bounce from the deck and the room in front: lifts the shadowed cheek and the sockets.
light("Fill", "AREA", three_to_blender((0.6, 1.1, 1.4)), key_to, 3.5, (1.0, 0.86, 0.7), size=1.6)
# The evening window, off to the left: a restrained cool rim.
light("Window", "AREA", three_to_blender((-0.94, 1.52, -0.96)), three_to_blender((0.2, 0.9, 0.4)), 26, (0.6, 0.72, 0.95), size=0.5)
# The sconce, warm, right of the niche.
light("Sconce", "POINT", three_to_blender((1.0, 1.63, -0.835)), (0, 0, 0), 6, (1.0, 0.74, 0.46), size=0.06)

world = bpy.data.worlds.new("BenchWorld")
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.16, 0.2, 0.21, 1)  # The blue-green room.
bg.inputs["Strength"].default_value = 0.28
scene.world = world

sky = bpy.data.materials.get("EveningSky")
if sky:
    bsdf = sky.node_tree.nodes["Principled BSDF"]
    tex = next(node for node in sky.node_tree.nodes if node.type == "TEX_IMAGE")
    sky.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 1.2

# ---------------------------------------------------------------- render

scene.render.engine = "CYCLES"
scene.cycles.samples = int(os.environ.get("BENCH_SAMPLES", "384"))
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 8
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0.0
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(OUT, "reference.png")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "benchmark.blend"))
bpy.ops.render.render(write_still=True)
print("[benchmark] rendered", scene.render.filepath)
