"""
Builds the museum's 3D assets from scratch: no downloaded models or textures.

    blender -b --factory-startup --python blender/build_museum.py            # build + export
    blender -b --factory-startup --python blender/build_museum.py -- --render  # also render a still

Writes:
    blender/museum.blend           editable source (open it in Blender to tweak)
    blender/textures/*.png         generated textures: oak, plaster, evening sky, rug, the curator's note
    public/museum/museum.glb       web asset: "Bay", "Case" (with its "Drawer"), "Skull", "Fern", "Props", and from
                                   museum_exhibits.py the other specimens, "Desk" and the room's dressing
    public/museum/hall.jpg         still render, used as the no-WebGL fallback (with --render)

Units are meters. Blender is Z-up with the exhibits facing -Y; the glTF export turns
that into three.js Y-up with the exhibits facing +Z, toward the camera.
"""

import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLEND_DIR = os.path.join(ROOT, "blender")
TEX_DIR = os.path.join(BLEND_DIR, "textures")
WEB_DIR = os.path.join(ROOT, "public", "museum")
RENDER = "--render" in sys.argv

BAY_WIDTH = 2.6  # One exhibit per bay; the web app spaces exhibits by this much. Close enough that the next case peeks in.
WALL_Y = 1.0  # Front face of the back wall.
CASE_Y = 0.2  # Center of the display case, in front of the niche.
PLINTH_H = 0.78  # A squat cabinet: about as tall as it is wide.
DECK_Z = PLINTH_H + 0.045
# The cabinet runs wider on the right than the glass case, leaving a shelf for the curator's things.
CAB_X0, CAB_X1, CAB_D = -0.30, 0.52, 0.25  # left side, right side, half depth
# The drawer under the top, which holds the curator's note. The web scene slides the "Drawer" node.
DRAWER_X0, DRAWER_X1, DRAWER_Z0, DRAWER_Z1, DRAWER_DEPTH = CAB_X0 + 0.055, CAB_X1 - 0.055, 0.555, 0.695, 0.3
# 006's wider case (scene.ts WIDE): symmetric, no shelf, glass half as wide again.
WIDE_X0, WIDE_X1, WIDE_HALF = -0.43, 0.43, 0.31


# ---------------------------------------------------------------- helpers


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for directory in (TEX_DIR, WEB_DIR):
        os.makedirs(directory, exist_ok=True)


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifiers(obj):
    activate(obj)
    for modifier in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)


def ellipsoid(center, radii, segments=32, rings=20, name="part"):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=center)
    obj = bpy.context.active_object
    obj.scale = radii
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def box(name, x0, x1, y0, y1, z0, z1, bevel=0.0, segments=4):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (x1 - x0, y1 - y0, z1 - z0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
        apply_modifiers(obj)
    return obj


def join(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    return joined


def shade_smooth(obj):
    activate(obj)
    bpy.ops.object.shade_smooth()


def tube(points, radius, name, caps=True):
    """A smooth swept tube through points (NURBS), converted to a closed mesh."""
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    spline = curve.splines.new("NURBS")
    spline.points.add(len(points) - 1)
    for point, (x, y, z) in zip(spline.points, points):
        point.co = (x, y, z, 1.0)
    spline.order_u = 4
    spline.use_endpoint_u = True
    curve.resolution_u = 24
    curve.bevel_depth = radius
    curve.bevel_resolution = 5
    curve.use_fill_caps = caps
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    activate(obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.active_object


def grain_uv(obj, scale=0.6, seed=0):
    """Box-projected UVs where the grain runs along each board's longest side, like real joinery.
    The oak texture's grain lines run along U, so U follows the board."""
    rng = np.random.default_rng(seed)
    mesh = obj.data
    if not mesh.uv_layers:
        mesh.uv_layers.new(name="UVMap")
    uv = mesh.uv_layers[0].data
    dims = obj.dimensions
    offset = rng.uniform(0, 1, 2)
    for poly in mesh.polygons:
        axis = max(range(3), key=lambda i: abs(poly.normal[i]))
        a, b = [i for i in range(3) if i != axis]
        if dims[b] > dims[a]:
            a, b = b, a
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            uv[li].uv = (co[a] / scale + offset[0], co[b] / scale + offset[1])


def bake_setup(distance, samples=256):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples  # Enough that the small bakes come out clean, without grain.
    if scene.world is None:
        scene.world = bpy.data.worlds.new("BakeWorld")
    scene.world.light_settings.distance = distance  # How far occlusion reaches: local contact only.


def gltf_output_group():
    """The node group the glTF exporter reads an occlusion texture from."""
    group = bpy.data.node_groups.get("glTF Material Output")
    if group is None:
        group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        group.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    return group


def bake_ao_texture(obj, label, size, distance, strength):
    """Bakes soft ambient occlusion into a texture on a second UV map and wires it as the glTF
    occlusion map. In three.js it darkens only the ambient light, so contact stays subtle."""
    bake_setup(distance)
    mesh = obj.data
    grain = mesh.uv_layers[0]
    ao_uv = mesh.uv_layers.new(name="AOMap")
    mesh.uv_layers.active = ao_uv
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")
    image = bpy.data.images.new(f"ao-{label}", size, size, alpha=False)
    textures = []
    for slot in obj.material_slots:
        material = slot.material.copy()  # Each baked object gets its own copy, carrying its own AO map.
        material.name = f"{slot.material.name}.{label}"
        slot.material = material
        nodes, links = material.node_tree.nodes, material.node_tree.links
        uv_node = nodes.new("ShaderNodeUVMap")
        uv_node.uv_map = "AOMap"
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.image.colorspace_settings.name = "Non-Color"
        links.new(uv_node.outputs["UV"], tex.inputs["Vector"])
        nodes.active = tex
        textures.append((material, tex))
    bpy.ops.object.bake(type="AO", margin=8, use_clear=True)
    # Soften and lift the result: occlusion only where things actually meet.
    pixels = np.empty(size * size * 4, np.float32)
    image.pixels.foreach_get(pixels)
    pixels[0::4] = pixels[1::4] = pixels[2::4] = 1.0 - (1.0 - pixels[0::4]) * strength
    image.pixels.foreach_set(pixels)
    image.filepath_raw = os.path.join(TEX_DIR, f"ao-{label}.png")
    image.file_format = "PNG"
    image.save()
    group = gltf_output_group()
    for material, tex in textures:
        nodes, links = material.node_tree.nodes, material.node_tree.links
        separate = nodes.new("ShaderNodeSeparateColor")
        output = nodes.new("ShaderNodeGroup")
        output.node_tree = group
        links.new(tex.outputs["Color"], separate.inputs["Color"])
        links.new(separate.outputs["Red"], output.inputs["Occlusion"])
    mesh.uv_layers.active = grain


def bake_ao_vertices(obj, distance, strength, floor):
    """Bakes ambient occlusion into vertex colors, for the specimen: no UVs to manage, and it
    reads as the faint grey a plaster cast collects in its hollows."""
    bake_setup(distance)
    attr = obj.data.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    obj.data.color_attributes.active_color = attr
    activate(obj)
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    colors = np.empty(len(obj.data.vertices) * 4, np.float32)
    attr.data.foreach_get("color", colors)
    ao = colors[0::4]
    ao = np.clip(1.0 - (1.0 - ao) * strength, floor, 1.0)
    colors[0::4] = colors[1::4] = colors[2::4] = ao
    colors[3::4] = 1.0
    attr.data.foreach_set("color", colors)


def parent(children, name):
    empty = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(empty)
    for child in children:
        child.parent = empty
    return empty


# ---------------------------------------------------------------- materials


def principled(name, color, roughness, metallic=0.0, image=None, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.surface_render_method = "BLENDED"
    if image is not None:
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        # Texture times color, so one neutral texture can carry several paints. glTF exports it as a factor.
        mix = mat.node_tree.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        mix.inputs[7].default_value = (*color, 1.0)
        mat.node_tree.links.new(tex.outputs["Color"], mix.inputs[6])
        mat.node_tree.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    return mat


def srgb(hex_color):
    """Hex to linear RGB, which is what Principled BSDF expects."""
    hex_color = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hex_color[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def oak_image(name="oak", size=1024, rows=8, seed=11, seams=True):
    """Tileable oak running along X, periodic in both directions. With seams it reads as floor planks."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:size, 0:size].astype(np.float64) / size
    row = np.floor(v * rows).astype(int)
    in_row = v * rows - row

    # Two planks per row per tile, with a random seam position per row.
    seam = rng.uniform(0, 0.5, rows)[row]
    plank_u = (u - seam) % 1.0
    plank = row * 2 + (plank_u >= 0.5)
    tone = rng.uniform(-0.07, 0.07, rows * 2)[plank]

    # Grain: fine lines along the plank, gently wavering, with periodic low-frequency drift.
    drift = np.zeros_like(u)
    for _ in range(5):
        fx, fy = rng.integers(1, 4), rng.integers(1, 3)
        drift += np.sin(2 * np.pi * (fx * u + fy * v) + rng.uniform(0, 2 * np.pi)) * rng.uniform(0.15, 0.4)
    phase = rng.uniform(0, 1, rows * 2)[plank]
    if not seams:  # One continuous board: grain follows the whole tile, not each plank.
        in_row, phase, tone = v, np.zeros_like(u), np.zeros_like(u)
    lines = 7 if seams else 34
    grain = np.sin(2 * np.pi * (in_row * lines + 0.3 * np.sin(2 * np.pi * (2 * u + phase)) + 0.35 * drift))
    fine = np.sin(2 * np.pi * (in_row * lines * 5.3 + 0.9 * drift + phase))
    t = 0.55 + 0.08 * grain + 0.035 * fine + tone

    # Neutral-ish honey oak: the material color warms it, the lights do the rest.
    light = np.array([0.86, 0.76, 0.62])
    dark = np.array([0.66, 0.55, 0.42])
    rgb = dark + (light - dark) * t[..., None]

    # Seams: soft dark lines between rows and at plank ends.
    edge_v = np.minimum(in_row, 1 - in_row)
    edge_u = np.minimum(plank_u % 0.5, 0.5 - plank_u % 0.5) * 2
    seam_shade = np.clip(np.minimum(edge_v * rows * 18, edge_u * 260), 0, 1)
    if seams:
        rgb *= (0.72 + 0.28 * seam_shade)[..., None]
    rgb = np.clip(rgb, 0, 1)

    img = bpy.data.images.new(name, size, size, alpha=False)
    rgba = np.concatenate([rgb, np.ones((size, size, 1))], axis=2).astype(np.float32)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX_DIR, f"{name}.png")
    img.file_format = "PNG"
    img.save()
    return img


def periodic_noise(rng, size, octaves, amplitude):
    """Smooth, tileable value noise from a few periodic sine waves. Calm on purpose: no visible pattern."""
    v, u = np.mgrid[0:size, 0:size].astype(np.float64) / size
    out = np.zeros((size, size))
    for k in range(octaves):
        fx, fy = rng.integers(1, 3 + 2 * k), rng.integers(1, 3 + 2 * k)
        out += np.sin(2 * np.pi * (fx * u + fy * v) + rng.uniform(0, 2 * np.pi)) * amplitude / (k + 1)
    return out


def save_image(name, rgb):
    size_y, size_x = rgb.shape[:2]
    img = bpy.data.images.new(name, size_x, size_y, alpha=False)
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((size_y, size_x, 1))], axis=2).astype(np.float32)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX_DIR, f"{name}.png")
    img.file_format = "PNG"
    img.save()
    return img


def plaster_image(size=512, seed=3):
    """Hand-painted plaster: near-white, with gentle mottling and faint brush direction. Tinted per wall by the material color."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:size, 0:size].astype(np.float64) / size
    mottle = periodic_noise(rng, size, 6, 0.018)
    strokes = 0.006 * np.sin(2 * np.pi * (u * 3 + v * 22 + 0.6 * np.sin(2 * np.pi * (u * 2 + v))))
    fleck = (rng.random((size, size)) - 0.5) * 0.012
    value = 0.95 + mottle + strokes + fleck
    return save_image("plaster", np.repeat(value[..., None], 3, axis=2))


def sky_image(width=384, height=768, seed=8):
    """The view through the window: deep blue evening over a far hill with a few lit windows, and a
    soft tree line in front. Original, painted in code."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    t = v / height  # 0 at the bottom row (Blender images start at the bottom), 1 at the top.
    top, mid, low = np.array([0.06, 0.09, 0.21]), np.array([0.12, 0.19, 0.36]), np.array([0.34, 0.36, 0.50])
    k = np.clip((t - 0.2) / 0.8, 0, 1)[..., None]
    sky = np.where(k > 0.35, mid + (top - mid) * ((k - 0.35) / 0.65), low + (mid - low) * (k / 0.35))
    sky = sky + np.exp(-((t - 0.24) ** 2) / 0.003)[..., None] * np.array([0.10, 0.06, 0.04])  # the last warmth on the horizon
    cloud = periodic_noise(rng, max(width, height), 4, 0.5)[:height, :width]
    band = np.exp(-((t - 0.6) ** 2) / 0.004)[..., None]
    sky = sky + band * np.clip(cloud, 0, None)[..., None] * np.array([0.03, 0.04, 0.06])
    # A few faint stars, high up.
    for _ in range(9):
        sx, sy = rng.uniform(0.08, 0.92) * width, rng.uniform(0.6, 0.97) * height
        sky += (np.exp(-((u - sx) ** 2 + (v - sy) ** 2) / 1.2) * rng.uniform(0.25, 0.5))[..., None] * np.array([0.8, 0.85, 1.0])
    # A far hill, a shade lighter than the trees, with a handful of distant lit windows on it.
    hill = 0.27 + 0.025 * np.sin(u / width * 2 * np.pi * 1.2 + 2.0)
    on_hill = (t < hill)[..., None]
    sky = np.where(on_hill, np.array([0.08, 0.11, 0.19]) + 0.02 * t[..., None], sky)
    for _ in range(11):
        lx = rng.uniform(0.06, 0.94) * width
        ly = rng.uniform(0.2, 0.25) * height
        glow = np.exp(-((u - lx) ** 2 + (v - ly) ** 2) / rng.uniform(2.5, 5.0))
        sky += (glow * rng.uniform(0.6, 1.0))[..., None] * np.array([1.0, 0.72, 0.38])
    # A soft tree line in front: rounded crowns, nearly black blue-green.
    ridge = 0.17 + 0.025 * np.sin(u / width * 2 * np.pi * 2 + 0.4) + 0.01 * np.sin(u / width * 2 * np.pi * 5 + 1.3)
    cell = (u / width * 7) % 1.0  # One soft dome per tree.
    crowns = 0.035 * np.sqrt(np.clip(1 - ((cell - 0.5) / 0.5) ** 2, 0, 1))
    trees = (t < ridge + crowns)[..., None]
    sky = np.where(trees, np.array([0.04, 0.07, 0.09]) + 0.02 * t[..., None], sky)
    return save_image("evening-sky", sky)


def rug_image(width=1024, height=512, seed=13):
    """A faded runner: dusty terracotta field, teal and cream border stripes, a quiet row of diamonds,
    a little fibre and some wear down the middle. Tiles along its length (u)."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    v, u = v / height, u / width
    rgb = np.ones((height, width, 3)) * np.array([0.55, 0.38, 0.31])
    edge = np.minimum(v, 1 - v)
    teal, cream, rust = np.array([0.29, 0.39, 0.37]), np.array([0.80, 0.71, 0.57]), np.array([0.45, 0.28, 0.23])
    rgb = np.where((edge < 0.085)[..., None], teal, rgb)
    rgb = np.where(((edge > 0.105) & (edge < 0.122))[..., None], cream, rgb)
    rgb = np.where(((edge > 0.14) & (edge < 0.15))[..., None], rust, rgb)
    # Diamonds down the middle, three per tile: a cream outline around a rust centre.
    cell = (u * 3) % 1.0
    d = np.abs(cell - 0.5) / 0.16 + np.abs(v - 0.5) / 0.22
    rgb = np.where(((d > 0.78) & (d < 1.0))[..., None], cream, rgb)
    rgb = np.where((d < 0.45)[..., None], rust, rgb)
    # Fibre: fine streaks along the weave, plus speckle.
    streak = np.sin(2 * np.pi * (v * 180 + 0.4 * np.sin(2 * np.pi * u * 3))) * 0.018
    speckle = (rng.random((height, width)) - 0.5) * 0.05
    # Wear: a gently lighter path down the middle, where people walk.
    wear = np.exp(-((v - 0.5) ** 2) / 0.05) * (0.04 + periodic_noise(rng, width, 3, 0.02)[:height, :width])
    rgb = rgb * (1 + streak + speckle)[..., None] + wear[..., None] * np.array([0.9, 0.85, 0.75])
    return save_image("rug", rgb)


def note_image(width=256, height=320, seed=17):
    """The curator's note card: cream paper with a few lines of quick, illegible handwriting."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    rgb = np.ones((height, width, 3)) * np.array([0.93, 0.89, 0.80])
    ink = np.zeros((height, width))
    for row in range(5):
        y = height * (0.78 - row * 0.13)
        x0, x1 = width * 0.12, width * rng.uniform(0.62, 0.9)
        # A wavering stroke with loops: handwriting at a glance, nothing readable up close.
        path = y + 5 * np.sin(u * 0.32 + row) + 3 * np.sin(u * 0.11 + row * 2)
        stroke = np.exp(-((v - path) ** 2) / 2.2) * ((u > x0) & (u < x1))
        ink = np.maximum(ink, stroke * (0.55 + 0.45 * (np.sin(u * 0.9 + row) > -0.6)))
    sig = np.exp(-((v - height * 0.12 - 6 * np.sin(u * 0.2)) ** 2) / 2.5) * ((u > width * 0.5) & (u < width * 0.86))
    ink = np.maximum(ink, sig)
    rgb = rgb * (1 - ink[..., None] * 0.7) + ink[..., None] * np.array([0.12, 0.16, 0.26]) * 0.7
    return save_image("curator-note", rgb)


# ---------------------------------------------------------------- the skull


def build_skull(material):
    """An original, stylized anthropology teaching cast. No scan or downloaded model is involved.

    Overlapping ellipsoid volumes are merged by a coarse voxel remesh, which also rounds the joins
    between them, then relaxed with volume-preserving smoothing so it reads as one plaster casting.
    The orbits and nasal opening are carved afterwards so their edges stay defined.
    """
    lift = 0.026  # Puts the bottom of the mandible on z = 0.
    parts = []

    def add(center, radii, segments=28, rings=18):
        c = (center[0], center[1], center[2] + lift)
        parts.append(ellipsoid(c, radii, segments, rings))

    def lifted(points):
        return [(x, y, z + lift) for x, y, z in points]

    def dental(s, z, back=0.0):
        """A point on the dental arch: a parabola, widest at the back molars."""
        return (0.034 * s, -0.087 + back + 0.05 * s * s, z)

    # The vault runs a little oversized, rounder at the forehead: friendlier, still a skull.
    add((0, 0.003, 0.125), (0.073, 0.101, 0.077), 48, 32)  # vault, forehead included
    add((0, 0.061, 0.099), (0.052, 0.041, 0.047))  # occipital
    # Cranial base: the skull is widest low at the sides, so the arches and jaw joints have bone to
    # meet instead of hanging in the air beside a narrow vault.
    add((0, 0.012, 0.072), (0.058, 0.068, 0.036), 36, 22)
    add((0, -0.071, 0.097), (0.051, 0.016, 0.013))  # brow ridge, ending inside the orbit rims
    add((0, -0.063, 0.05), (0.043, 0.032, 0.037))  # maxilla
    # The ridge that holds the upper teeth, so they sit in bone rather than hanging below it.
    parts.append(tube(lifted([dental(s, 0.031, 0.005) for s in (-0.95, -0.5, 0.0, 0.5, 0.95)]), 0.0075, "Alveolus"))
    for s in (-1, 1):
        # Cheekbone: a plate facing forward and out, not a ball. It is what makes the face wide.
        # Rounded rather than sharp: a fuller cheek reads softer without changing the anatomy.
        cheek = ellipsoid((s * 0.047, -0.06, 0.063 + lift), (0.019, 0.011, 0.017), 28, 18, "Cheek")
        cheek.rotation_euler = (0, 0, math.radians(s * 28))
        activate(cheek)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        parts.append(cheek)
        # Outer orbit rim: the brow's end runs down into the cheekbone in one stroke.
        parts.append(tube(lifted([(s * 0.047, -0.07, 0.097), (s * 0.054, -0.066, 0.083), (s * 0.051, -0.062, 0.068)]), 0.0055, "Rim"))
        add((s * 0.044, -0.06, 0.083), (0.012, 0.011, 0.016))  # the orbit's side wall, behind the rim
        # The bone behind the upper jaw and behind the last molars, so the gaps under the arch and
        # at the back of the bite read as recesses, not holes through the head.
        add((s * 0.03, -0.026, 0.038), (0.014, 0.022, 0.022))
        add((s * 0.037, -0.03, 0.018), (0.009, 0.015, 0.012))
        add((s * 0.047, -0.013, 0.044), (0.006, 0.009, 0.013))  # coronoid, rising under the arch
        add((s * 0.05, 0.03, 0.06), (0.014, 0.016, 0.022))  # mastoid
        # Zygomatic arch: a swept tube from the cheekbone back to the ear, close along the skull's side.
        parts.append(tube(lifted([(s * 0.046, -0.056, 0.064), (s * 0.058, -0.034, 0.066), (s * 0.061, -0.008, 0.064), (s * 0.056, 0.014, 0.06)]), 0.006, "Arch"))
        # Ramus: a flat blade rising from the jaw's angle to the joint under the arch, leaning back as
        # it rises. A real ramus is a plate; the earlier tube read as a finger.
        ramus = ellipsoid((s * 0.049, 0.002, 0.027 + lift), (0.0075, 0.018, 0.028), 28, 18, "Ramus")
        ramus.rotation_euler = (math.radians(-10), 0, 0)
        activate(ramus)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        parts.append(ramus)
        add((s * 0.05, 0.012, 0.054), (0.009, 0.0065, 0.006))  # condyle, seated under the arch's root
    # Mandible body: one U from angle to angle through the chin, then stretched upright so its
    # section is a tall oval like real bone, not a round rope.
    body = [(-0.047, 0.004, 0.0), (-0.043, -0.03, -0.004), (-0.03, -0.062, -0.007), (0.0, -0.078, -0.008), (0.03, -0.062, -0.007), (0.043, -0.03, -0.004), (0.047, 0.004, 0.0)]
    jaw = tube(lifted(body), 0.0085, "Jaw")
    activate(jaw)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    jaw.scale = (1, 1, 1.8)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    parts.append(jaw)
    add((0, -0.08, -0.014), (0.016, 0.009, 0.011))  # chin
    add((0, -0.058, 0.017), (0.027, 0.03, 0.011))  # palate and floor of the mouth, behind the teeth
    # Teeth, upper and lower, along the dental arch: fewer, broader and shorter, so they soften
    # into the cast instead of reading as a grin.
    for z, back in ((0.0245, 0.0), (0.0105, 0.002)):
        for s in np.linspace(-0.86, 0.86, 8):
            add(dental(s, z, back), (0.0066, 0.0052, 0.0062), 16, 10)

    skull = join(parts, "Skull")
    activate(skull)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")  # The cursor sits at the world origin.

    # Merge the volumes into one closed surface first, so the cutters have something clean to carve.
    merge = skull.modifiers.new("Merge", "REMESH")
    merge.mode = "VOXEL"
    merge.voxel_size = 0.0022
    apply_modifiers(skull)

    cutters = []
    for s in (-1, 1):
        cutters.append(ellipsoid((s * 0.026, -0.09, 0.082 + lift), (0.0205, 0.034, 0.0185)))  # orbits, deep
    cutters.append(ellipsoid((0, -0.096, 0.058 + lift), (0.011, 0.034, 0.0165)))  # nasal aperture
    cutters.append(ellipsoid((0, -0.096, 0.047 + lift), (0.014, 0.028, 0.0075)))  # its wider base
    cutters.append(ellipsoid((0, -0.092, 0.017 + lift), (0.032, 0.03, 0.0018)))  # the bite line, barely open
    # One cutter at a time: overlapping cutters joined into one object confuse the exact solver.
    for cutter in cutters:
        boolean = skull.modifiers.new("Carve", "BOOLEAN")
        boolean.operation = "DIFFERENCE"
        boolean.object = cutter
        boolean.solver = "EXACT"
        apply_modifiers(skull)
        bpy.data.objects.remove(cutter, do_unlink=True)
    print(f"[skull] carved: {len(skull.data.polygons)} faces")

    # A coarse remesh now rounds every join and every carved rim the way a plaster mould would,
    # then volume-preserving smoothing settles it into one casting.
    coarse = skull.modifiers.new("Round", "REMESH")
    coarse.mode = "VOXEL"
    coarse.voxel_size = 0.0036
    relax = skull.modifiers.new("Relax", "LAPLACIANSMOOTH")
    relax.iterations = 24
    relax.lambda_factor = 0.85
    relax.use_volume_preserve = True
    fine = skull.modifiers.new("Refine", "REMESH")
    fine.mode = "VOXEL"
    fine.voxel_size = 0.0017
    apply_modifiers(skull)

    # Plaster tooth: a fraction of a millimeter of irregularity, enough to catch the light.
    tooth = bpy.data.textures.new("PlasterTooth", "CLOUDS")
    tooth.noise_scale = 0.005
    tooth.noise_depth = 1
    displace = skull.modifiers.new("Tooth", "DISPLACE")
    displace.texture = tooth
    displace.strength = 0.0006
    displace.mid_level = 0.5
    settle = skull.modifiers.new("Settle", "LAPLACIANSMOOTH")
    settle.iterations = 2
    settle.lambda_factor = 0.4
    settle.use_volume_preserve = True
    decimate = skull.modifiers.new("Decimate", "DECIMATE")
    decimate.ratio = 0.3
    apply_modifiers(skull)
    print(f"[skull] finished: {len(skull.data.polygons)} faces, dims {tuple(round(d, 3) for d in skull.dimensions)}")
    shade_smooth(skull)
    skull.data.materials.append(material)

    # Seated on its riser, turned a little toward the visitor's left for a three-quarter view, with
    # a slight resting tilt, as if listening. Re-seated so the lowest point still meets the riser.
    skull.rotation_euler = (0, math.radians(7), math.radians(-18))
    skull.location = (0, CASE_Y + 0.01, DECK_Z + 0.035)
    bpy.context.view_layer.update()
    low = min((skull.matrix_world @ v.co).z for v in skull.data.vertices)
    skull.location.z += DECK_Z + 0.035 - low
    return skull


# ---------------------------------------------------------------- the case


def build_drawer(mats, front, x0=DRAWER_X0, x1=DRAWER_X1):
    """The curator's drawer: an oak box behind a rounded front, a brass card holder and knob, and a
    folded note lying inside. The web scene slides the "Drawer" node out and stands the note up on
    its hinge ("DrawerNote", origin at its front edge)."""
    z0, z1 = DRAWER_Z0, DRAWER_Z1
    mid = (x0 + x1) / 2
    oak = [box("DrawerFront", x0, x1, front - 0.024, front - 0.002, z0, z1, bevel=0.01, segments=4)]
    bx0, bx1, bz0, bz1 = x0 + 0.012, x1 - 0.012, z0 + 0.008, z1 - 0.022
    by0, by1 = front - 0.002, front + DRAWER_DEPTH
    oak.append(box("DrawerBottom", bx0, bx1, by0, by1, bz0, bz0 + 0.008))
    oak.append(box("DrawerSide", bx0, bx0 + 0.012, by0, by1, bz0, bz1))
    oak.append(box("DrawerSide", bx1 - 0.012, bx1, by0, by1, bz0, bz1))
    oak.append(box("DrawerBack", bx0, bx1, by1 - 0.012, by1, bz0, bz1))
    for i, part in enumerate(oak):
        grain_uv(part, seed=60 + i)
    drawer_oak = join(oak, "DrawerOak")
    drawer_oak.data.materials.append(mats["grain"])
    shade_smooth(drawer_oak)

    # A brass card holder (with a blank card) above a small knob, like a specimen-cabinet drawer.
    brass = [box("CardHolder", mid - 0.042, mid + 0.042, front - 0.03, front - 0.023, 0.638, 0.678, bevel=0.003, segments=2)]
    brass.append(ellipsoid((mid, front - 0.036, 0.593), (0.015, 0.013, 0.015), 20, 12, "Knob"))
    drawer_brass = join(brass, "DrawerBrass")
    drawer_brass.data.materials.append(mats["bronze"])
    shade_smooth(drawer_brass)
    card = box("DrawerCard", mid - 0.035, mid + 0.035, front - 0.0325, front - 0.029, 0.643, 0.673)
    card.data.materials.append(mats["paper"])

    # The note: a card lying flat, hinged at its front edge so the web scene can stand it up.
    hinge_y, floor_z = front + 0.03, bz0 + 0.0085
    w, l = 0.13, 0.16
    bm = bmesh.new()
    corners = [(mid - w / 2, 0), (mid + w / 2, 0), (mid + w / 2, l), (mid - w / 2, l)]
    verts = [bm.verts.new((x, hinge_y + y, floor_z)) for x, y in corners]
    face = bm.faces.new(verts)
    uv = bm.loops.layers.uv.new("UVMap")
    for loop in face.loops:
        x, y, _ = loop.vert.co
        loop[uv].uv = ((x - (mid - w / 2)) / w, (y - hinge_y) / l)  # The far edge becomes the top once it stands.
    if face.normal.z < 0:
        face.normal_flip()
    mesh = bpy.data.meshes.new("DrawerNote")
    bm.to_mesh(mesh)
    bm.free()
    note = bpy.data.objects.new("DrawerNote", mesh)
    bpy.context.scene.collection.objects.link(note)
    solid = note.modifiers.new("Card", "SOLIDIFY")
    solid.thickness = 0.0012
    apply_modifiers(note)
    note.data.materials.append(mats["note"])
    activate(note)
    bpy.context.scene.cursor.location = (mid, hinge_y, floor_z)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")  # The hinge.
    bpy.context.scene.cursor.location = (0, 0, 0)

    return parent([drawer_oak, drawer_brass, card, note], "Drawer")


def build_case(mats, x0=CAB_X0, x1=CAB_X1, half_x=0.232):
    """A squat oak specimen cabinet with softly rounded edges: bun feet, a base moulding, two raised
    panels and the curator's drawer, then the glass case on top. The standard cabinet runs wider than
    the case on the right, leaving a shelf. Edges are softened as if handled for decades.
    half_x is half the glass case's width; its depth is the same for every case."""
    cx, cy = 0.0, CASE_Y
    d = CAB_D
    front = cy - d
    parts_oak = []
    for fx in (x0 + 0.07, x1 - 0.07):
        for sy in (-1, 1):
            parts_oak.append(ellipsoid((fx, cy + sy * (d - 0.07), 0.03), (0.046, 0.046, 0.032), 24, 14, "Foot"))
    parts_oak.append(box("Base", x0 - 0.014, x1 + 0.014, cy - d - 0.014, cy + d + 0.014, 0.05, 0.115, bevel=0.03, segments=6))
    parts_oak.append(box("Body", x0, x1, cy - d, cy + d, 0.1, PLINTH_H - 0.03, bevel=0.045, segments=7))
    parts_oak.append(box("Top", x0 - 0.02, x1 + 0.02, cy - d - 0.02, cy + d + 0.02, PLINTH_H - 0.042, PLINTH_H, bevel=0.021, segments=6))
    # Two raised panels under the drawer: the joint lines that make it read as built.
    mid = (x0 + x1) / 2
    for px0, px1 in ((x0 + 0.065, mid - 0.016), (mid + 0.016, x1 - 0.065)):
        parts_oak.append(box("Panel", px0, px1, front - 0.012, front + 0.004, 0.175, 0.495, bevel=0.012, segments=4))
    for i, part in enumerate(parts_oak):
        grain_uv(part, seed=i)
    cabinet = join(parts_oak, "Cabinet")
    cabinet.data.materials.append(mats["grain"])
    shade_smooth(cabinet)

    # The dark opening behind the drawer front, seen once the drawer slides out.
    opening = box("DrawerOpening", x0 + 0.059, x1 - 0.059, front - 0.003, front + 0.001, DRAWER_Z0 + 0.004, DRAWER_Z1 - 0.004)
    opening.data.materials.append(mats["shadow"])
    drawer = build_drawer(mats, front, x0 + 0.055, x1 - 0.055)

    trim = box("Trim", cx - half_x - 0.026, cx + half_x + 0.026, cy - 0.258, cy + 0.258, PLINTH_H, PLINTH_H + 0.028, bevel=0.008)
    trim.data.materials.append(mats["bronze"])

    deck = box("Deck", cx - half_x + 0.007, cx + half_x - 0.007, cy - 0.225, cy + 0.225, PLINTH_H + 0.028, DECK_Z, bevel=0.004)
    deck.data.materials.append(mats["linen"])

    riser = box("Riser", cx - 0.085, cx + 0.085, cy - 0.07, cy + 0.08, DECK_Z, DECK_Z + 0.035, bevel=0.008)
    grain_uv(riser, seed=40)
    riser.data.materials.append(mats["grain"])

    # Glass: four sides and a lid, single-sided, no thickness. Cheap to draw and to sort.
    top = DECK_Z + 0.34
    half = 0.232
    bm = bmesh.new()
    corners = [(-half_x, -half), (half_x, -half), (half_x, half), (-half_x, half)]
    low = [bm.verts.new((cx + x, cy + y, DECK_Z)) for x, y in corners]
    high = [bm.verts.new((cx + x, cy + y, top)) for x, y in corners]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((low[i], low[j], high[j], high[i]))
    bm.faces.new(high)
    bm.normal_update()
    for face in bm.faces:  # Point every pane outward.
        centre = face.calc_center_median()
        if face.normal.dot(centre - Vector((cx, cy, (DECK_Z + top) / 2))) < 0:
            face.normal_flip()
    mesh = bpy.data.meshes.new("Glass")
    bm.to_mesh(mesh)
    bm.free()
    glass = bpy.data.objects.new("Glass", mesh)
    bpy.context.scene.collection.objects.link(glass)
    glass.data.materials.append(mats["glass"])

    # Bronze frame: corner posts, a ring around the lid, and small ball finials.
    frame_parts = []
    for x, y in corners:
        frame_parts.append(box("Post", cx + x - 0.006, cx + x + 0.006, cy + y - 0.006, cy + y + 0.006, DECK_Z, top, bevel=0.003, segments=2))
        frame_parts.append(ellipsoid((cx + x, cy + y, top + 0.014), (0.0105, 0.0105, 0.0105), 16, 10, "Finial"))
    for (x0, y0), (x1, y1) in zip(corners, corners[1:] + corners[:1]):
        frame_parts.append(
            box("Rail", cx + min(x0, x1) - 0.006, cx + max(x0, x1) + 0.006, cy + min(y0, y1) - 0.006, cy + max(y0, y1) + 0.006, top - 0.004, top + 0.008, bevel=0.003, segments=2)
        )
    frame = join(frame_parts, "Frame")
    frame.data.materials.append(mats["bronze"])

    for obj in (trim, deck, frame, riser):
        shade_smooth(obj)
    case = parent([cabinet, opening, drawer, trim, deck, riser, glass, frame], "Case")
    case.rotation_euler.z = math.radians(0.6)  # Not quite square to the wall: someone moved it once.
    return case


# ---------------------------------------------------------------- the bay


# Window and sconce positions, shared with src/components/museum/scene.ts (which converts to Y-up).
WINDOW_X, WINDOW_W, WINDOW_SILL, WINDOW_SPRING = -0.94, 0.36, 1.0, 1.86
SCONCE_X, SCONCE_Z = 1.0, 1.58  # Low enough that the glowing shade clears the page header's shade.


def build_bay(mats):
    half = BAY_WIDTH / 2
    floor_depth = 3.6
    niche_w, niche_spring, niche_depth = 1.3, 1.85, 0.16

    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, WALL_Y - floor_depth / 2, 0))
    floor = bpy.context.active_object
    floor.name = "Floor"
    floor.scale = (BAY_WIDTH, floor_depth, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # One texture tile per half bay, so a bay holds exactly two and bays tile seamlessly.
    tile = BAY_WIDTH / 2
    for loop in floor.data.loops:
        co = floor.data.vertices[loop.vertex_index].co
        floor.data.uv_layers.active.data[loop.index].uv = ((co.x + half) / tile, (co.y - WALL_Y) / tile)
    floor.data.materials.append(mats["floor"])

    # A runner rug along the hall in front of the cases, continuous from bay to bay.
    rug_y0, rug_y1 = -0.74, -0.12
    rug = box("Rug", -half, half, rug_y0, rug_y1, 0.0, 0.006)
    for loop in rug.data.loops:
        co = rug.data.vertices[loop.vertex_index].co
        rug.data.uv_layers.active.data[loop.index].uv = ((co.x + half) / tile, (co.y - rug_y0) / (rug_y1 - rug_y0))
    rug.data.materials.append(mats["rug"])

    # Back wall: painted plaster with an arched niche for the exhibit and an arched window recess.
    wall = box("Wall", -half, half, WALL_Y, WALL_Y + 0.3, 0.0, 3.4)
    cut_box = box("NicheBox", -niche_w / 2, niche_w / 2, WALL_Y - 0.05, WALL_Y + niche_depth, -0.1, niche_spring)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=niche_w / 2, depth=niche_depth + 0.05, location=(0, WALL_Y + (niche_depth - 0.05) / 2, niche_spring), rotation=(math.radians(90), 0, 0))
    cut_arch = bpy.context.active_object
    win_depth = 0.2
    win_box = box("WindowBox", WINDOW_X - WINDOW_W / 2, WINDOW_X + WINDOW_W / 2, WALL_Y - 0.05, WALL_Y + win_depth, WINDOW_SILL, WINDOW_SPRING)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=WINDOW_W / 2, depth=win_depth + 0.05, location=(WINDOW_X, WALL_Y + (win_depth - 0.05) / 2, WINDOW_SPRING), rotation=(math.radians(90), 0, 0))
    win_arch = bpy.context.active_object
    for cutter in (cut_box, cut_arch, win_box, win_arch):
        boolean = wall.modifiers.new("Cut", "BOOLEAN")
        boolean.operation = "DIFFERENCE"
        boolean.object = cutter
        boolean.solver = "EXACT"
        apply_modifiers(wall)
        bpy.data.objects.remove(cutter, do_unlink=True)
    bevel = wall.modifiers.new("Round", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 6
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(40)
    apply_modifiers(wall)
    # Planar UVs on the wall face, so the painted texture keeps a constant scale (one tile per 1.2 m).
    for loop in wall.data.loops:
        co = wall.data.vertices[loop.vertex_index].co
        wall.data.uv_layers.active.data[loop.index].uv = (co.x / 1.2 + co.y / 1.2, co.z / 1.2)
    shade_smooth(wall)
    # The niche gets warm cream paint; the rest of the wall, window recess included, the dusty teal.
    # Face centers are compared in world space, so apply the box's offset first, and drop the
    # empty material slot the boolean cuts leave behind.
    activate(wall)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    wall.data.materials.clear()
    wall.data.materials.append(mats["paint"])
    wall.data.materials.append(mats["paint_cream"])
    for poly in wall.data.polygons:
        c = poly.center
        in_niche = abs(c.x) < niche_w / 2 + 0.02 and c.y > WALL_Y + 0.005 and c.z < niche_spring + niche_w / 2 + 0.02
        poly.material_index = 1 if in_niche else 0  # The window recess stays teal: cooler, and it sits back.

    # Oak wainscot either side of the niche: a flat back, proud stiles and rails, a rounded dado rail.
    oak_parts = []
    spans = ((-half + 0.14, -niche_w / 2 - 0.04), (niche_w / 2 + 0.04, half - 0.14))
    for x0, x1 in spans:
        oak_parts.append(box("WainscotBack", x0, x1, WALL_Y - 0.012, WALL_Y + 0.002, 0.14, 0.84))
        for z0, z1 in ((0.14, 0.2), (0.78, 0.84)):  # rails
            oak_parts.append(box("Rail", x0, x1, WALL_Y - 0.026, WALL_Y - 0.01, z0, z1, bevel=0.005, segments=2))
        for xs in (x0, (x0 + x1) / 2 - 0.03, x1 - 0.06):  # stiles, a little prouder than the rails, like real joinery
            oak_parts.append(box("Stile", xs, xs + 0.06, WALL_Y - 0.031, WALL_Y - 0.012, 0.14, 0.84, bevel=0.005, segments=2))
        oak_parts.append(box("Dado", x0 - 0.01, x1 + 0.01, WALL_Y - 0.04, WALL_Y + 0.002, 0.83, 0.875, bevel=0.016, segments=4))
    # Skirting all along, including the back of the niche.
    for x0, x1, y in ((-half, -niche_w / 2 - 0.03, WALL_Y), (niche_w / 2 + 0.03, half, WALL_Y), (-niche_w / 2 + 0.035, niche_w / 2 - 0.035, WALL_Y + niche_depth)):
        oak_parts.append(box("Skirting", x0, x1, y - 0.03, y + 0.002, 0.0, 0.15, bevel=0.012, segments=3))
    # The window sill, deep enough for a pot, and a slim frame with one mullion and one transom.
    oak_parts.append(box("Sill", WINDOW_X - WINDOW_W / 2 - 0.04, WINDOW_X + WINDOW_W / 2 + 0.04, WALL_Y - 0.09, WALL_Y + 0.17, WINDOW_SILL - 0.035, WINDOW_SILL, bevel=0.012, segments=3))
    for i, part in enumerate(oak_parts):
        grain_uv(part, seed=100 + i)
    wainscot = join(oak_parts, "Wainscot")
    wainscot.data.materials.append(mats["grain"])
    shade_smooth(wainscot)

    glass_y = WALL_Y + 0.15
    frame_parts = [
        box("Mullion", WINDOW_X - 0.012, WINDOW_X + 0.012, glass_y - 0.03, glass_y, WINDOW_SILL, WINDOW_SPRING + WINDOW_W / 2, bevel=0.004, segments=2),
        box("Transom", WINDOW_X - WINDOW_W / 2, WINDOW_X + WINDOW_W / 2, glass_y - 0.03, glass_y, 1.5, 1.524, bevel=0.004, segments=2),
    ]
    window_frame = join(frame_parts, "WindowFrame")
    window_frame.data.materials.append(mats["paint_cream"])
    shade_smooth(window_frame)

    # The glass itself: an arch-topped panel showing the painted evening sky (unlit in the web scene).
    bm = bmesh.new()
    rows = []
    steps = 24
    for i in range(steps + 1):  # Arch outline, left to right over the top.
        a = math.pi * (1 - i / steps)
        rows.append((WINDOW_X + math.cos(a) * WINDOW_W / 2, WINDOW_SPRING + math.sin(a) * WINDOW_W / 2))
    outline = [(WINDOW_X - WINDOW_W / 2, WINDOW_SILL)] + rows + [(WINDOW_X + WINDOW_W / 2, WINDOW_SILL)]
    verts = [bm.verts.new((x, glass_y, z)) for x, z in outline]
    face = bm.faces.new(verts)
    uv = bm.loops.layers.uv.new("UVMap")
    top_z = WINDOW_SPRING + WINDOW_W / 2
    for loop in face.loops:
        x, _, z = loop.vert.co
        loop[uv].uv = ((x - (WINDOW_X - WINDOW_W / 2)) / WINDOW_W, (z - WINDOW_SILL) / (top_z - WINDOW_SILL))
    if face.normal.y > 0:
        face.normal_flip()
    mesh = bpy.data.meshes.new("WindowGlass")
    bm.to_mesh(mesh)
    bm.free()
    window_glass = bpy.data.objects.new("WindowGlass", mesh)
    bpy.context.scene.collection.objects.link(window_glass)
    window_glass.data.materials.append(mats["sky"])

    # A brass wall sconce with a linen shade, beside the niche: the room's warm practical light.
    sconce_parts = [
        box("Backplate", SCONCE_X - 0.035, SCONCE_X + 0.035, WALL_Y - 0.012, WALL_Y, SCONCE_Z - 0.06, SCONCE_Z + 0.04, bevel=0.01, segments=3),
    ]
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.008, depth=0.11, location=(SCONCE_X, WALL_Y - 0.06, SCONCE_Z), rotation=(math.radians(90), 0, 0))
    sconce_parts.append(bpy.context.active_object)
    sconce = join(sconce_parts, "Sconce")
    sconce.data.materials.append(mats["bronze"])
    shade_smooth(sconce)
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.075, radius2=0.05, depth=0.1, end_fill_type="NOTHING", location=(SCONCE_X, WALL_Y - 0.115, SCONCE_Z + 0.05))
    shade = bpy.context.active_object
    shade.name = "SconceShade"
    solid = shade.modifiers.new("Thickness", "SOLIDIFY")
    solid.thickness = 0.003
    apply_modifiers(shade)
    shade_smooth(shade)
    shade.data.materials.append(mats["shade"])

    # Half pilasters at each edge, with an oak base block: two bays side by side make one pilaster.
    pilasters = []
    for s in (-1, 1):
        x_out, x_in = s * half, s * (half - 0.14)
        pilasters.append(box("Pilaster", min(x_out, x_in), max(x_out, x_in), WALL_Y - 0.1, WALL_Y + 0.01, 0.0, 3.4, bevel=0.03))
    pilaster = join(pilasters, "Pilaster")
    for loop in pilaster.data.loops:
        co = pilaster.data.vertices[loop.vertex_index].co
        pilaster.data.uv_layers.active.data[loop.index].uv = (co.x / 1.2 + co.y / 1.2, co.z / 1.2)
    shade_smooth(pilaster)
    pilaster.data.materials.append(mats["paint_cream"])
    blocks = []
    for s in (-1, 1):
        x_out, x_in = s * half, s * (half - 0.16)
        blocks.append(box("PlinthBlock", min(x_out, x_in), max(x_out, x_in), WALL_Y - 0.12, WALL_Y + 0.01, 0.0, 0.3, bevel=0.012, segments=3))
    for i, part in enumerate(blocks):
        grain_uv(part, seed=200 + i)
    block = join(blocks, "PilasterBase")
    block.data.materials.append(mats["grain"])

    return parent([floor, rug, wall, wainscot, window_frame, window_glass, sconce, shade, pilaster, block], "Bay")


def build_notebook(mats, cover, name):
    """A pocket field notebook (9 x 14 cm): cloth covers, a cream page block, a dark elastic band."""
    w, l, t = 0.09, 0.14, 0.009
    pages = box(name + "Pages", -w / 2 + 0.002, w / 2 - 0.003, -l / 2 + 0.002, l / 2 - 0.002, 0.0014, t - 0.0014)
    pages.data.materials.append(mats["paper"])
    covers = [
        box(name + "Back", -w / 2, w / 2, -l / 2, l / 2, 0.0, 0.0016, bevel=0.0007, segments=2),
        box(name + "Front", -w / 2, w / 2, -l / 2, l / 2, t - 0.0016, t, bevel=0.0007, segments=2),
        box(name + "Spine", -w / 2, -w / 2 + 0.0016, -l / 2, l / 2, 0.0, t, bevel=0.0007, segments=2),
    ]
    cover_obj = join(covers, name + "Cover")
    cover_obj.data.materials.append(mats[cover])
    band = box(name + "Band", -w / 2 - 0.0006, w / 2 + 0.0006, l * 0.3, l * 0.3 + 0.004, -0.0006, t + 0.0006)
    band.data.materials.append(mats["shadow"])
    return parent([pages, cover_obj, band], name)


def build_props(mats):
    """The curator's things, left on the cabinet's shelf beside the case: two field notebooks with a
    pencil on top, and a mug of coffee gone cold. Only the first gallery gets them."""
    shelf_z = PLINTH_H

    lower = build_notebook(mats, "kraft", "NotebookKraft")
    lower.location = (0.4, CASE_Y - 0.075, shelf_z)
    lower.rotation_euler.z = math.radians(8)
    upper = build_notebook(mats, "sage", "NotebookSage")
    upper.location = (0.407, CASE_Y - 0.068, shelf_z + 0.0092)
    upper.rotation_euler.z = math.radians(-5)

    # A pencil across the top notebook: hexagonal, painted, with a sharpened cedar tip.
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0036, depth=0.1, location=(0, 0, 0), rotation=(0, math.radians(90), 0))
    body = bpy.context.active_object
    body.data.materials.append(mats["pencil"])
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.0034, radius2=0.0009, depth=0.017, location=(0.0585, 0, 0), rotation=(0, math.radians(90), 0))
    tip = bpy.context.active_object
    tip.data.materials.append(mats["cedar"])
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.001, radius2=0.0001, depth=0.003, location=(0.0682, 0, 0), rotation=(0, math.radians(90), 0))
    lead = bpy.context.active_object
    lead.data.materials.append(mats["shadow"])
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.0038, depth=0.008, location=(-0.054, 0, 0), rotation=(0, math.radians(90), 0))
    ferrule = bpy.context.active_object
    ferrule.data.materials.append(mats["bronze"])
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.0035, depth=0.006, location=(-0.061, 0, 0), rotation=(0, math.radians(90), 0))
    eraser = bpy.context.active_object
    eraser.data.materials.append(mats["clay"])
    pencil = parent([body, tip, lead, ferrule, eraser], "Pencil")
    pencil.location = (0.405, CASE_Y - 0.07, shelf_z + 0.0184 + 0.0034)
    pencil.rotation_euler.z = math.radians(28)

    # The mug: a glazed cylinder with a rolled lip and a loop handle, a little cold coffee inside.
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.037, depth=0.086, location=(0, 0, 0.043))
    cup = bpy.context.active_object
    bm = bmesh.new()
    bm.from_mesh(cup.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.9], context="FACES")
    bm.to_mesh(cup.data)
    bm.free()
    wall = cup.modifiers.new("Wall", "SOLIDIFY")
    wall.thickness = 0.004
    wall.offset = -1
    soft = cup.modifiers.new("Soft", "BEVEL")
    soft.width = 0.0016
    soft.segments = 2
    soft.limit_method = "ANGLE"
    apply_modifiers(cup)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.019, minor_radius=0.0055, major_segments=28, minor_segments=10, location=(0.053, 0, 0.044), rotation=(math.radians(90), 0, 0))
    handle = bpy.context.active_object  # Its inner arc ends inside the cup wall, not in the coffee.
    mug = join([cup, handle], "Mug")
    shade_smooth(mug)
    mug.data.materials.append(mats["glaze"])
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.033, depth=0.002, location=(0, 0, 0.062))
    coffee = bpy.context.active_object
    coffee.name = "Coffee"
    coffee.data.materials.append(mats["coffee"])
    cup_group = parent([mug, coffee], "MugGroup")
    cup_group.location = (0.455, CASE_Y + 0.12, shelf_z)
    cup_group.rotation_euler.z = math.radians(-35)  # Handle turned toward the back corner.

    return parent([lower, upper, pencil, cup_group], "Props")


def build_fern(mats):
    """A potted fern: soft fronds of rounded leaflets, each frond its own node so the web scene can sway it."""
    rng = np.random.default_rng(21)
    fronds = []
    count = 12
    for f in range(count):
        theta = 2 * math.pi * f / count + rng.uniform(-0.25, 0.25)
        length = rng.uniform(0.2, 0.29)
        lift = rng.uniform(1.15, 1.45)
        leaflets = []
        steps = 13
        for i in range(1, steps):
            t = i / steps
            r = length * t
            h = length * lift * (0.95 * t - 0.85 * t * t)
            p = Vector((math.cos(theta) * r, math.sin(theta) * r, h))
            w = 0.05 * (1 - t) + 0.012
            for side in (-1, 1):
                n = Vector((-math.sin(theta), math.cos(theta), 0)) * side
                centre = p + n * (w * 0.55)
                leaf = ellipsoid(tuple(centre), (w * 0.55, 0.015 * (1.1 - t * 0.55), 0.002), 8, 5, "Leaflet")
                leaf.rotation_euler = (0.0, side * 0.35, theta + math.pi / 2)
                leaflets.append(leaf)
        spine = ellipsoid((math.cos(theta) * length * 0.45, math.sin(theta) * length * 0.45, length * lift * 0.2), (length * 0.48, 0.0022, 0.0022), 10, 6, "Spine")
        spine.rotation_euler = (0, -math.atan2(length * lift * 0.25, length * 0.5), theta)
        leaflets.append(spine)
        for leaf in leaflets:
            activate(leaf)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        frond = join(leaflets, "Frond")
        activate(frond)
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")  # Origin at the pot's top: the frond sways from its base.
        shade_smooth(frond)
        frond.data.materials.append(mats["leaf"] if f % 3 else mats["leaf_light"])
        fronds.append(frond)

    # A clay pot with a rolled rim, and dark soil.
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.072, depth=0.12, location=(0, 0, -0.06))
    pot = bpy.context.active_object
    pot.name = "FernPot"
    bm = bmesh.new()
    bm.from_mesh(pot.data)
    for v in bm.verts:
        if v.co.z < -0.05:
            v.co.x *= 0.78
            v.co.y *= 0.78
    bm.to_mesh(pot.data)
    bm.free()
    bpy.ops.mesh.primitive_torus_add(major_radius=0.072, minor_radius=0.011, location=(0, 0, -0.004))
    rim = bpy.context.active_object
    pot = join([pot, rim], "FernPot")
    bevel = pot.modifiers.new("Soft", "BEVEL")
    bevel.width = 0.004
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    apply_modifiers(pot)
    shade_smooth(pot)
    pot.data.materials.append(mats["clay"])
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.064, depth=0.01, location=(0, 0, -0.012))
    soil = bpy.context.active_object
    soil.name = "Soil"
    soil.data.materials.append(mats["shadow"])

    fern = parent(fronds + [pot, soil], "Fern")
    for child in fronds + [pot, soil]:
        child.location.z += 0.12  # The pot stands on z = 0.
    return fern


# ---------------------------------------------------------------- render


def setup_render(skull, case, bay):
    """A still matching the web scene's resting view: amber on the exhibit, cool evening light from the window."""
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 62  # Only one bay exists in Blender, so the still frames the vignette inside it.
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (0.05, CASE_Y - 3.2, 1.42)
    cam.rotation_euler = (Vector((0.05, CASE_Y, 0.86)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    def light(name, kind, location, target, energy, color, size=0.3, spot=None):
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = color
        if kind == "SPOT":
            data.spot_size = spot
            data.spot_blend = 0.7
        if kind == "AREA":
            data.size = size
        elif hasattr(data, "shadow_soft_size"):
            data.shadow_soft_size = size
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
        return obj

    light("Key", "SPOT", (0.4, CASE_Y - 1.1, 2.8), (0, CASE_Y, DECK_Z + 0.06), 300, (1.0, 0.74, 0.45), 0.18, math.radians(26))
    light("Window", "AREA", (WINDOW_X, WALL_Y + 0.05, 1.55), (WINDOW_X + 0.3, WALL_Y - 1.5, 0.6), 60, (0.62, 0.8, 0.9), 0.5)
    light("Sconce", "POINT", (SCONCE_X, WALL_Y - 0.12, SCONCE_Z + 0.03), (SCONCE_X, WALL_Y - 1, SCONCE_Z), 8, (1.0, 0.75, 0.48), 0.05)
    light("Fill", "AREA", (0.0, CASE_Y - 2.6, 2.2), (0, WALL_Y, 1.2), 40, (0.7, 0.82, 0.86), 3.0)
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.12, 0.16, 0.17, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    scene.world = world
    sky = bpy.data.materials.get("EveningSky")  # Let the window glow in the still.
    if sky:
        bsdf = sky.node_tree.nodes["Principled BSDF"]
        tex = next(n for n in sky.node_tree.nodes if n.type == "TEX_IMAGE")
        sky.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 1.4

    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1000
    scene.view_settings.view_transform = "AgX"
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 88
    scene.render.filepath = os.path.join(WEB_DIR, "hall.jpg")


# ---------------------------------------------------------------- main


def main():
    reset_scene()
    oak = oak_image("oak-planks")
    grain = oak_image("oak-grain", size=512, seed=5, seams=False)
    plaster = plaster_image()
    sky = sky_image()
    rug = rug_image()
    note = note_image()
    mats = {
        # Base colors here are for the Blender still. The web scene sets its own tones by material name.
        "paint": principled("PaintTeal", srgb("#8fa59c"), 0.93, image=plaster),
        "paint_cream": principled("PaintCream", srgb("#e4d6bd"), 0.92, image=plaster),
        "skull": principled("SkullPlaster", srgb("#ece4d2"), 0.82),
        "oak": principled("Oak", srgb("#c99f72"), 0.55, image=oak),
        "grain": principled("OakGrain", srgb("#c99f72"), 0.42, image=grain),
        "floor": principled("FloorOak", srgb("#b9946c"), 0.6, image=oak),
        "bronze": principled("Bronze", srgb("#8a6a43"), 0.4, metallic=1.0),
        "linen": principled("Linen", srgb("#d8ccb2"), 0.95),
        "glass": principled("Glass", srgb("#ffffff"), 0.04, alpha=0.08),
        "sky": principled("EveningSky", srgb("#ffffff"), 1.0, image=sky),
        "shade": principled("LinenShade", srgb("#f1dfbd"), 0.9),
        "leaf": principled("Leaf", srgb("#6f8a55"), 0.62),
        "leaf_light": principled("LeafLight", srgb("#86a066"), 0.62),
        "clay": principled("Clay", srgb("#a8735a"), 0.88),
        "shadow": principled("Shadow", srgb("#1d1712"), 1.0),
        "rug": principled("Rug", srgb("#ffffff"), 1.0, image=rug),
        "paper": principled("Paper", srgb("#efe6d2"), 0.9),
        "note": principled("NotePaper", srgb("#ffffff"), 0.9, image=note),
        "kraft": principled("NotebookKraft", srgb("#a5835a"), 0.85),
        "sage": principled("NotebookSage", srgb("#6f8578"), 0.85),
        "pencil": principled("Pencil", srgb("#c9a04a"), 0.5),
        "cedar": principled("Cedar", srgb("#d7b08a"), 0.8),
        "glaze": principled("MugGlaze", srgb("#6f8798"), 0.3),
        "coffee": principled("Coffee", srgb("#2a1a10"), 0.15),
    }

    bay = build_bay(mats)
    case = build_case(mats)
    case_objects = [case, *case.children_recursive]
    # 006's case: wider glass on a wider cabinet, with no shelf. Its parts get a "Wide" suffix, so
    # the glTF keeps both sets of names apart; the web scene strips it to match parts by name.
    wide = build_case(mats, WIDE_X0, WIDE_X1, WIDE_HALF)
    for obj in [wide, *wide.children_recursive]:
        obj.name = obj.name.split(".")[0] + "Wide"
    wide_objects = [wide, *wide.children_recursive]
    for obj in wide_objects:
        obj.hide_render = True
    skull = build_skull(mats["skull"])
    fern = build_fern(mats)
    fern.location = (WINDOW_X, WALL_Y + 0.05, WINDOW_SILL)  # On the window sill, for the still.
    build_props(mats)

    # Bake contact occlusion with everything in place. Glass and the sky pane don't occlude.
    see_through = [bpy.data.objects[name] for name in ("Glass", "WindowGlass") if name in bpy.data.objects]
    for obj in see_through:
        obj.hide_render = True
    bpy.context.view_layer.update()
    bake_ao_vertices(skull, distance=0.035, strength=0.75, floor=0.55)
    bake_ao_texture(bpy.data.objects["Cabinet"], "cabinet", 512, distance=0.1, strength=0.8)
    # The wide cabinet bakes alone in the same niche, with the standard case and its things hidden.
    first_case = case_objects + [skull, *bpy.data.objects["Props"].children_recursive]
    for obj in first_case:
        obj.hide_render = True
    for obj in wide_objects:
        obj.hide_render = obj.name == "GlassWide"
    bake_ao_texture(bpy.data.objects["CabinetWide"], "cabinet-wide", 512, distance=0.1, strength=0.8)
    for obj in wide_objects:
        obj.hide_render = True
    for obj in first_case:
        obj.hide_render = obj.name == "Glass"
    bake_ao_texture(bpy.data.objects["Wainscot"], "wainscot", 512, distance=0.12, strength=0.75)
    bake_ao_texture(bpy.data.objects["Wall"], "wall", 1024, distance=0.3, strength=0.7)
    for obj in see_through:
        obj.hide_render = False

    # Exhibits 002 to 006, the desk and the room's dressing: built after the bakes, so they don't
    # shade the skull or the cabinet (in Blender they all stand in the first case).
    sys.path.insert(0, BLEND_DIR)
    import museum_exhibits

    extras = museum_exhibits.build_all(mats)

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND_DIR, "museum.blend"))

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(WEB_DIR, "museum.glb"),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
        export_image_format="JPEG",
        export_jpeg_quality=88,
        export_vertex_color="ACTIVE",
        export_cameras=False,
        export_lights=False,
    )

    tris = sum(len(p.vertices) - 2 for obj in bpy.data.objects if obj.type == "MESH" for p in obj.data.polygons)
    print(f"[museum] exported, about {tris} triangles; skull {sum(len(p.vertices) - 2 for p in skull.data.polygons)}")

    if RENDER:
        for group in extras + [wide]:  # The still shows the first case only.
            for obj in [group, *group.children_recursive]:
                obj.hide_render = True
        setup_render(skull, case, bay)
        bpy.ops.render.render(write_still=True)
        print("[museum] rendered", bpy.context.scene.render.filepath)


if __name__ == "__main__":  # museum_exhibits.py imports this file's helpers.
    main()
