"""
Builds the museum's 3D assets from scratch: no downloaded models or textures.

    blender -b --factory-startup --python blender/build_museum.py            # build + export
    blender -b --factory-startup --python blender/build_museum.py -- --render  # also render a still

Writes:
    blender/museum.blend           editable source (open it in Blender to tweak)
    blender/textures/*.png         generated textures: oak planks and grain, painted plaster, evening sky
    public/museum/museum.glb       web asset: nodes "Bay", "Case", "Skull", "Fern"
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

BAY_WIDTH = 3.2  # One exhibit per bay; the web app spaces exhibits by this much.
WALL_Y = 1.0  # Front face of the back wall.
CASE_Y = 0.2  # Center of the display case, in front of the niche.
PLINTH_H = 0.92
DECK_Z = PLINTH_H + 0.045


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


def smart_uv(obj, angle=66):
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")


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


def sky_image(width=256, height=512, seed=8):
    """The view through the window: a calm evening sky over a soft tree line. Original, painted in code."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    t = v / height  # 0 at the bottom row (Blender images start at the bottom), 1 at the top.
    top, mid, low = np.array([0.20, 0.33, 0.42]), np.array([0.42, 0.60, 0.66]), np.array([0.86, 0.72, 0.58])
    k = np.clip((t - 0.22) / 0.78, 0, 1)[..., None]
    sky = np.where(k > 0.45, mid + (top - mid) * ((k - 0.45) / 0.55), low + (mid - low) * (k / 0.45))
    cloud = periodic_noise(rng, max(width, height), 4, 0.5)[:height, :width]
    band = np.exp(-((t - 0.62) ** 2) / 0.004)[..., None]
    sky = sky + band * np.clip(cloud, 0, None)[..., None] * np.array([0.10, 0.08, 0.07])
    # A soft tree line: rounded crowns, dusky teal.
    ridge = 0.19 + 0.03 * np.sin(u / width * 2 * np.pi * 2 + 0.4) + 0.012 * np.sin(u / width * 2 * np.pi * 5 + 1.3)
    cell = (u / width * 7) % 1.0  # Rounded crowns, one soft dome per tree.
    crowns = 0.04 * np.sqrt(np.clip(1 - ((cell - 0.5) / 0.5) ** 2, 0, 1))
    trees = (t < ridge + crowns)[..., None]
    sky = np.where(trees, np.array([0.13, 0.22, 0.24]) + 0.03 * t[..., None], sky)
    return save_image("evening-sky", sky)


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

    add((0, 0.004, 0.124), (0.068, 0.098, 0.077), 48, 32)  # vault, forehead included
    add((0, 0.06, 0.098), (0.05, 0.04, 0.046))  # occipital
    add((0, -0.071, 0.097), (0.057, 0.016, 0.014))  # brow ridge
    add((0, -0.061, 0.052), (0.040, 0.031, 0.040))  # maxilla
    for s in (-1, 1):
        add((s * 0.046, -0.058, 0.066), (0.016, 0.015, 0.018))  # cheekbone
        add((s * 0.059, -0.02, 0.066), (0.0075, 0.038, 0.0095))  # zygomatic arch
        add((s * 0.05, 0.03, 0.06), (0.014, 0.016, 0.022))  # mastoid
        for k in range(6):  # ramus, rising toward the temporal bone
            f = k / 5
            add((s * (0.046 + 0.004 * f), 0.002 + 0.006 * f, 0.004 + 0.044 * f), (0.0105, 0.013, 0.012), 20, 12)
    # Mandible body: a U of overlapping volumes, chin forward.
    for s in np.linspace(-1, 1, 19):
        add((0.045 * s, -0.079 + 0.077 * s * s, -0.009 + 0.008 * s * s), (0.0105, 0.011, 0.0155), 20, 12)
    # Teeth, upper and lower, along the dental arch.
    for z, back in ((0.024, 0.0), (0.010, 0.002)):
        for s in np.linspace(-0.92, 0.92, 10):
            add((0.034 * s, -0.087 + back + 0.05 * s * s, z), (0.0058, 0.0052, 0.0072), 16, 10)

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
    relax.iterations = 20
    relax.lambda_factor = 0.85
    relax.use_volume_preserve = True
    fine = skull.modifiers.new("Refine", "REMESH")
    fine.mode = "VOXEL"
    fine.voxel_size = 0.0017
    apply_modifiers(skull)

    # Plaster tooth: a fraction of a millimeter of irregularity, enough to catch the light.
    tooth = bpy.data.textures.new("PlasterTooth", "CLOUDS")
    tooth.noise_scale = 0.0045
    tooth.noise_depth = 2
    displace = skull.modifiers.new("Tooth", "DISPLACE")
    displace.texture = tooth
    displace.strength = 0.0009
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
    bake_cavity(skull)
    skull.data.materials.append(material)

    # Seated on its riser, turned a little toward the visitor's left for a three-quarter view.
    skull.location = (0, CASE_Y + 0.01, DECK_Z + 0.035)
    skull.rotation_euler = (0, 0, math.radians(-18))
    return skull


def bake_cavity(obj, iterations=6, strength=95.0):
    """Darkens hollows (orbits, under the brow, between teeth) into vertex colors, like dust in a cast."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    bm.normal_update()
    count = len(bm.verts)
    concave = np.zeros(count)
    for vert in bm.verts:
        if not vert.link_edges:
            continue
        mean = Vector((0, 0, 0))
        for edge in vert.link_edges:
            mean += edge.other_vert(vert).co
        mean /= len(vert.link_edges)
        concave[vert.index] = vert.normal.dot(mean - vert.co)
    neighbors = [[e.other_vert(v).index for e in v.link_edges] for v in bm.verts]
    for _ in range(iterations):
        concave = np.array([(concave[i] + concave[n].mean()) / 2 if n else concave[i] for i, n in enumerate(neighbors)])
    shade = np.clip(1.0 - np.maximum(concave, 0) * strength * 1000, 0.62, 1.0)
    bm.free()

    attr = obj.data.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    colors = np.repeat(shade[:, None], 4, axis=1)
    colors[:, 3] = 1.0
    attr.data.foreach_set("color", colors.astype(np.float32).ravel())
    obj.data.color_attributes.active_color = attr


# ---------------------------------------------------------------- the case


def build_case(mats):
    """An oak specimen cabinet: bun feet, a base moulding, a raised front panel, a bronze escutcheon,
    then the glass case on top. Edges are softened as if handled for decades."""
    cx, cy = 0.0, CASE_Y
    parts_oak = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            foot = ellipsoid((cx + sx * 0.2, cy + sy * 0.2, 0.034), (0.036, 0.036, 0.034), 24, 14, "Foot")
            parts_oak.append(foot)
    parts_oak.append(box("Base", cx - 0.255, cx + 0.255, cy - 0.255, cy + 0.255, 0.058, 0.122, bevel=0.014, segments=4))
    body = box("Body", cx - 0.235, cx + 0.235, cy - 0.235, cy + 0.235, 0.12, 0.884, bevel=0.022, segments=5)
    parts_oak.append(body)
    parts_oak.append(box("Cornice", cx - 0.252, cx + 0.252, cy - 0.252, cy + 0.252, 0.872, PLINTH_H, bevel=0.012, segments=4))
    # A raised panel on the front, with a slim bead around it: the joint lines that make it read as built.
    front = cy - 0.235
    parts_oak.append(box("Panel", cx - 0.168, cx + 0.168, front - 0.012, front + 0.004, 0.2, 0.79, bevel=0.009, segments=3))
    parts_oak.append(box("Bead", cx - 0.19, cx + 0.19, front - 0.004, front + 0.004, 0.178, 0.812, bevel=0.004, segments=2))
    cabinet = join(parts_oak, "Cabinet")
    smart_uv(cabinet)
    cabinet.data.materials.append(mats["grain"])
    shade_smooth(cabinet)

    plate = box("Escutcheon", cx - 0.021, cx + 0.021, front - 0.019, front - 0.011, 0.64, 0.69, bevel=0.006, segments=3)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.004, depth=0.006, location=(cx, front - 0.019, 0.668), rotation=(math.radians(90), 0, 0))
    keyhole = bpy.context.active_object
    keyhole.data.materials.append(mats["shadow"])
    plate.data.materials.append(mats["bronze"])
    shade_smooth(plate)

    trim = box("Trim", cx - 0.258, cx + 0.258, cy - 0.258, cy + 0.258, PLINTH_H, PLINTH_H + 0.028, bevel=0.008)
    trim.data.materials.append(mats["bronze"])

    deck = box("Deck", cx - 0.225, cx + 0.225, cy - 0.225, cy + 0.225, PLINTH_H + 0.028, DECK_Z, bevel=0.004)
    deck.data.materials.append(mats["linen"])

    riser = box("Riser", cx - 0.085, cx + 0.085, cy - 0.07, cy + 0.08, DECK_Z, DECK_Z + 0.035, bevel=0.008)
    smart_uv(riser)
    riser.data.materials.append(mats["grain"])

    # Glass: four sides and a lid, single-sided, no thickness. Cheap to draw and to sort.
    top = DECK_Z + 0.36
    half = 0.232
    bm = bmesh.new()
    corners = [(-half, -half), (half, -half), (half, half), (-half, half)]
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
    case = parent([cabinet, plate, keyhole, trim, deck, riser, glass, frame], "Case")
    case.rotation_euler.z = math.radians(0.6)  # Not quite square to the wall: someone moved it once.
    return case


# ---------------------------------------------------------------- the bay


# Window and sconce positions, shared with src/components/museum/scene.ts (which converts to Y-up).
WINDOW_X, WINDOW_W, WINDOW_SILL, WINDOW_SPRING = -1.03, 0.42, 1.0, 1.86
SCONCE_X, SCONCE_Z = 0.98, 1.74


def build_bay(mats):
    half = BAY_WIDTH / 2
    floor_depth = 3.6
    niche_w, niche_spring, niche_depth = 1.5, 1.85, 0.16

    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, WALL_Y - floor_depth / 2, 0))
    floor = bpy.context.active_object
    floor.name = "Floor"
    floor.scale = (BAY_WIDTH, floor_depth, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # One texture tile per 1.6 m, so a bay holds exactly two and bays tile seamlessly.
    for loop in floor.data.loops:
        co = floor.data.vertices[loop.vertex_index].co
        floor.data.uv_layers.active.data[loop.index].uv = ((co.x + half) / 1.6, (co.y - WALL_Y) / 1.6)
    floor.data.materials.append(mats["floor"])

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
    # The niche and window recess get warm cream paint; the rest of the wall the dusty teal.
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
        in_window = abs(c.x - WINDOW_X) < WINDOW_W / 2 + 0.02 and c.y > WALL_Y + 0.005 and WINDOW_SILL - 0.02 < c.z < WINDOW_SPRING + WINDOW_W / 2 + 0.02
        poly.material_index = 1 if (in_niche or in_window) else 0

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
    oak_parts.append(box("Sill", WINDOW_X - WINDOW_W / 2 - 0.05, WINDOW_X + WINDOW_W / 2 + 0.05, WALL_Y - 0.09, WALL_Y + 0.17, WINDOW_SILL - 0.035, WINDOW_SILL, bevel=0.012, segments=3))
    wainscot = join(oak_parts, "Wainscot")
    smart_uv(wainscot, angle=45)
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
    block = join(blocks, "PilasterBase")
    smart_uv(block)
    block.data.materials.append(mats["grain"])

    return parent([floor, wall, wainscot, window_frame, window_glass, sconce, shade, pilaster, block], "Bay")


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
    cam_data.lens = 46
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (0.1, CASE_Y - 2.75, 1.42)
    cam.rotation_euler = (Vector((0.1, CASE_Y, 1.04)) - cam.location).to_track_quat("-Z", "Y").to_euler()
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

    light("Key", "SPOT", (0.4, CASE_Y - 1.1, 2.8), (0, CASE_Y, 1.0), 300, (1.0, 0.74, 0.45), 0.18, math.radians(26))
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
    }

    bay = build_bay(mats)
    case = build_case(mats)
    skull = build_skull(mats["skull"])
    fern = build_fern(mats)
    fern.location = (WINDOW_X, WALL_Y + 0.05, WINDOW_SILL)  # On the window sill, for the still.

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
        setup_render(skull, case, bay)
        bpy.ops.render.render(write_still=True)
        print("[museum] rendered", bpy.context.scene.render.filepath)


main()
