"""
Builds the museum's 3D assets from scratch: no downloaded models or textures.

    blender -b --factory-startup --python blender/build_museum.py            # build + export
    blender -b --factory-startup --python blender/build_museum.py -- --render  # also render a still

Writes:
    blender/museum.blend           editable source (open it in Blender to tweak)
    blender/textures/oak.png       generated oak plank texture (tileable)
    public/museum/museum.glb       web asset: nodes "Bay", "Case", "Skull"
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
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
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
    t = 0.55 + 0.11 * grain + 0.05 * fine + tone

    light = np.array([0.80, 0.62, 0.42])
    dark = np.array([0.55, 0.38, 0.22])
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

    coarse = skull.modifiers.new("Merge", "REMESH")
    coarse.mode = "VOXEL"
    coarse.voxel_size = 0.0042
    relax = skull.modifiers.new("Relax", "LAPLACIANSMOOTH")
    relax.iterations = 14
    relax.lambda_factor = 0.9
    relax.use_volume_preserve = True
    fine = skull.modifiers.new("Refine", "REMESH")
    fine.mode = "VOXEL"
    fine.voxel_size = 0.0018
    apply_modifiers(skull)
    print(f"[skull] merged: {len(skull.data.polygons)} faces, dims {tuple(round(d, 3) for d in skull.dimensions)}")

    cutters = []
    for s in (-1, 1):
        cutters.append(ellipsoid((s * 0.026, -0.088, 0.082 + lift), (0.0195, 0.03, 0.0175)))  # orbits
    cutters.append(ellipsoid((0, -0.094, 0.058 + lift), (0.0105, 0.03, 0.016)))  # nasal aperture
    cutters.append(ellipsoid((0, -0.094, 0.047 + lift), (0.0135, 0.025, 0.007)))  # its wider base
    cutters.append(ellipsoid((0, -0.09, 0.017 + lift), (0.032, 0.03, 0.0016)))  # the bite line, barely open
    # One cutter at a time: overlapping cutters joined into one object confuse the exact solver.
    for cutter in cutters:
        boolean = skull.modifiers.new("Carve", "BOOLEAN")
        boolean.operation = "DIFFERENCE"
        boolean.object = cutter
        boolean.solver = "EXACT"
        apply_modifiers(skull)
        bpy.data.objects.remove(cutter, do_unlink=True)
    print(f"[skull] carved: {len(skull.data.polygons)} faces")

    # Round the carved edges, settle the surface, then trim for the web.
    remesh = skull.modifiers.new("Remesh", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = 0.0022
    smooth = skull.modifiers.new("Smooth", "LAPLACIANSMOOTH")
    smooth.iterations = 10
    smooth.lambda_factor = 0.8
    smooth.use_volume_preserve = True
    decimate = skull.modifiers.new("Decimate", "DECIMATE")
    decimate.ratio = 0.45
    apply_modifiers(skull)
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
    plinth = box("Plinth", -0.24, 0.24, CASE_Y - 0.24, CASE_Y + 0.24, 0.0, PLINTH_H, bevel=0.018)
    smart_uv(plinth)
    plinth.data.materials.append(mats["grain"])

    trim = box("Trim", -0.255, 0.255, CASE_Y - 0.255, CASE_Y + 0.255, PLINTH_H, PLINTH_H + 0.028, bevel=0.008)
    trim.data.materials.append(mats["bronze"])

    deck = box("Deck", -0.225, 0.225, CASE_Y - 0.225, CASE_Y + 0.225, PLINTH_H + 0.028, DECK_Z, bevel=0.004)
    deck.data.materials.append(mats["linen"])

    riser = box("Riser", -0.085, 0.085, CASE_Y - 0.07, CASE_Y + 0.08, DECK_Z, DECK_Z + 0.035, bevel=0.006)
    smart_uv(riser)
    riser.data.materials.append(mats["grain"])

    # Glass: four sides and a lid, single-sided, no thickness. Cheap to draw and to sort.
    top = DECK_Z + 0.36
    half = 0.232
    bm = bmesh.new()
    corners = [(-half, -half), (half, -half), (half, half), (-half, half)]
    low = [bm.verts.new((x, CASE_Y + y, DECK_Z)) for x, y in corners]
    high = [bm.verts.new((x, CASE_Y + y, top)) for x, y in corners]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((low[i], low[j], high[j], high[i]))
    bm.faces.new(high)
    bm.normal_update()
    for face in bm.faces:  # Point every pane outward.
        centre = face.calc_center_median()
        if face.normal.dot(centre - Vector((0, CASE_Y, (DECK_Z + top) / 2))) < 0:
            face.normal_flip()
    mesh = bpy.data.meshes.new("Glass")
    bm.to_mesh(mesh)
    bm.free()
    glass = bpy.data.objects.new("Glass", mesh)
    bpy.context.scene.collection.objects.link(glass)
    glass.data.materials.append(mats["glass"])

    # Bronze frame: corner posts and a ring around the lid.
    frame_parts = []
    for x, y in corners:
        frame_parts.append(box("Post", x - 0.006, x + 0.006, CASE_Y + y - 0.006, CASE_Y + y + 0.006, DECK_Z, top, bevel=0.003, segments=2))
    for (x0, y0), (x1, y1) in zip(corners, corners[1:] + corners[:1]):
        frame_parts.append(
            box(
                "Rail",
                min(x0, x1) - 0.006,
                max(x0, x1) + 0.006,
                CASE_Y + min(y0, y1) - 0.006,
                CASE_Y + max(y0, y1) + 0.006,
                top - 0.004,
                top + 0.008,
                bevel=0.003,
                segments=2,
            )
        )
    frame = join(frame_parts, "Frame")
    frame.data.materials.append(mats["bronze"])

    for obj in (trim, deck, frame):
        shade_smooth(obj)
    return parent([plinth, trim, deck, riser, glass, frame], "Case")


# ---------------------------------------------------------------- the bay


def build_bay(mats):
    half = BAY_WIDTH / 2
    floor_depth = 3.6

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

    # Back wall with an arched niche, its edges rounded like plaster over a former.
    wall = box("Wall", -half, half, WALL_Y, WALL_Y + 0.3, 0.0, 3.4)
    niche_w, niche_spring, niche_depth = 1.5, 1.85, 0.16
    cut_box = box("NicheBox", -niche_w / 2, niche_w / 2, WALL_Y - 0.05, WALL_Y + niche_depth, -0.1, niche_spring)
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=niche_w / 2, depth=niche_depth + 0.05, location=(0, WALL_Y + (niche_depth - 0.05) / 2, niche_spring), rotation=(math.radians(90), 0, 0))
    cut_arch = bpy.context.active_object
    for cutter in (cut_box, cut_arch):
        boolean = wall.modifiers.new("Niche", "BOOLEAN")
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
    shade_smooth(wall)
    wall.data.materials.append(mats["plaster"])

    # Oak baseboards with a rounded cap: either side of the niche, and along its back.
    boards = []
    for x0, x1, y in ((-half, -niche_w / 2 - 0.03, WALL_Y), (niche_w / 2 + 0.03, half, WALL_Y), (-niche_w / 2 + 0.035, niche_w / 2 - 0.035, WALL_Y + niche_depth)):
        boards.append(box("Board", x0, x1, y - 0.028, y + 0.002, 0.0, 0.15, bevel=0.012))
    baseboard = join(boards, "Baseboard")
    smart_uv(baseboard)
    baseboard.data.materials.append(mats["oak"])

    # Half pilasters at each edge: two bays side by side make one full pilaster.
    pilasters = []
    for s in (-1, 1):
        x_out, x_in = s * half, s * (half - 0.14)
        pilasters.append(box("Pilaster", min(x_out, x_in), max(x_out, x_in), WALL_Y - 0.1, WALL_Y + 0.01, 0.0, 3.4, bevel=0.03))
    pilaster = join(pilasters, "Pilaster")
    shade_smooth(pilaster)
    pilaster.data.materials.append(mats["plaster_light"])

    return parent([floor, wall, baseboard, pilaster], "Bay")


# ---------------------------------------------------------------- render


def setup_render(skull, case, bay):
    scene = bpy.context.scene
    # A second bay to the right, so the still shows the gallery continuing.
    bpy.ops.object.select_all(action="DESELECT")

    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 50
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (0.0, CASE_Y - 2.1, 1.38)
    direction = Vector((0.0, CASE_Y, 1.05)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam

    def light(name, kind, location, target, energy, color, size=0.3, spot=None):
        data = bpy.data.lights.new(name, kind)
        data.energy = energy
        data.color = color
        if kind == "SPOT":
            data.spot_size = spot
            data.spot_blend = 0.6
        if hasattr(data, "shadow_soft_size"):
            data.shadow_soft_size = size
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
        return obj

    light("Key", "SPOT", (0.35, CASE_Y - 1.0, 2.7), (0, CASE_Y, 1.0), 320, (1.0, 0.78, 0.52), 0.2, math.radians(30))
    light("Wash", "AREA", (0, CASE_Y - 1.6, 3.2), (0, WALL_Y, 1.4), 45, (1.0, 0.86, 0.7), 2.0)
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.09, 0.075, 0.06, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.18
    scene.world = world

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
    mats = {
        "plaster": principled("Plaster", srgb("#e7dccb"), 0.92),
        "plaster_light": principled("PlasterLight", srgb("#efe6d6"), 0.9),
        "skull": principled("SkullPlaster", srgb("#ece4d2"), 0.82),
        "oak": principled("Oak", srgb("#b88a5a"), 0.55, image=oak),
        "grain": principled("OakGrain", srgb("#b88a5a"), 0.5, image=grain),
        "floor": principled("FloorOak", srgb("#b88a5a"), 0.48, image=oak),
        "bronze": principled("Bronze", srgb("#9a7444"), 0.32, metallic=1.0),
        "linen": principled("Linen", srgb("#d8ccb2"), 0.95),
        "glass": principled("Glass", srgb("#ffffff"), 0.04, alpha=0.08),
    }

    bay = build_bay(mats)
    case = build_case(mats)
    skull = build_skull(mats["skull"])

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
