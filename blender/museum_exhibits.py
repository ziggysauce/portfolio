"""
Specimens for exhibits 002 to 006, the Information desk, and the room's varied dressing (plants and a
book stack), built from primitives like everything else. Imported by build_museum.py after its bakes,
so none of this darkens the skull's or the cabinet's baked occlusion.

Every specimen is built around the case centre (x 0, y CASE_Y) standing on the deck (z DECK_Z), inside
the glass (about +-0.22 m across, 0.32 m tall). The web scene clones each one into its own case.
"""

import math

import bmesh
import bpy
import numpy as np

from build_museum import (
    CASE_Y,
    DECK_Z,
    activate,
    apply_modifiers,
    box,
    ellipsoid,
    grain_uv,
    join,
    parent,
    periodic_noise,
    principled,
    save_image,
    shade_smooth,
    srgb,
)


# ---------------------------------------------------------------- helpers


def cyl(name, radius, depth, location, rotation=(0, 0, 0), vertices=24, mat=None, smooth=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    if smooth:
        shade_smooth(obj)
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def cone(name, r1, r2, depth, location, rotation=(0, 0, 0), vertices=20, mat=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    shade_smooth(obj)
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def soften(obj, width=0.002, segments=2):
    mod = obj.modifiers.new("Soft", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    apply_modifiers(obj)
    shade_smooth(obj)
    return obj


def with_mat(obj, mat):
    obj.data.materials.append(mat)
    return obj


def plane_uv(obj, axis_u, axis_v):
    """Planar UVs from two world axes (0 x, 1 y, 2 z), normalised to the object's own bounds."""
    mesh = obj.data
    if not mesh.uv_layers:
        mesh.uv_layers.new(name="UVMap")
    coords = np.array([v.co[:] for v in mesh.vertices])
    lo, hi = coords.min(axis=0), coords.max(axis=0)
    span = np.maximum(hi - lo, 1e-6)
    uv = mesh.uv_layers[0].data
    for loop in mesh.loops:
        co = mesh.vertices[loop.vertex_index].co
        uv[loop.index].uv = ((co[axis_u] - lo[axis_u]) / span[axis_u], (co[axis_v] - lo[axis_v]) / span[axis_v])


def pivot(group, point):
    """Moves an empty to point without moving its children, so rotating it turns them about point
    (parent() leaves empties at the world origin, which would swing children built in place)."""
    for child in group.children:
        child.location = (child.location[0] - point[0], child.location[1] - point[1], child.location[2] - point[2])
    group.location = point
    return group


def place(group, location=(0, 0, 0), rotation_z=0.0):
    group.location = location
    group.rotation_euler.z = rotation_z
    return group


# ---------------------------------------------------------------- textures (painted in code, top row first)


def save_top_first(name, rgb):
    return save_image(name, rgb[::-1].copy())


def kds_screen_image(width=512, height=320, seed=31):
    """A kitchen display mid-service: dark screen, a header strip, four columns of order tickets with
    coloured timer bands and item lines. No text, no product UI copied."""
    rng = np.random.default_rng(seed)
    img = np.ones((height, width, 3)) * np.array([0.11, 0.15, 0.16])
    img[:24] = np.array([0.17, 0.22, 0.23])
    for i, x in enumerate(range(18, width - 20, 92)):
        img[9:15, x : x + 6] = np.array([0.55, 0.62, 0.6]) if i % 2 else np.array([0.84, 0.66, 0.34])
    bands = [np.array([0.47, 0.62, 0.52]), np.array([0.88, 0.66, 0.30]), np.array([0.80, 0.42, 0.32]), np.array([0.47, 0.62, 0.52])]
    for col in range(4):
        x0 = 14 + col * 124
        y = 36
        for _ in range(2):
            h = int(rng.integers(96, 150))
            if y + h > height - 12:
                break
            img[y : y + h, x0 : x0 + 112] = np.array([0.91, 0.87, 0.77])
            img[y : y + 16, x0 : x0 + 112] = bands[(col + y // 100) % 4]
            for row in range(y + 26, y + h - 10, 15):
                w = int(rng.integers(40, 96))
                img[row : row + 5, x0 + 10 : x0 + 10 + w] = np.array([0.52, 0.52, 0.49])
            y += h + 12
    return save_top_first("kds-screen", img)


def whiteboard_image(width=384, height=256, seed=37):
    """A release diagram drawn with a marker that is nearly dry: four boxes and arrows, a checklist,
    all in streaky, broken strokes over a ghost of older drawings."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    img = np.ones((height, width, 3)) * np.array([0.95, 0.95, 0.93])
    ghost = periodic_noise(rng, width, 4, 0.012)[:height, :width]
    img += ghost[..., None]
    ink = np.zeros((height, width))

    def stroke(mask, strength=1.0):
        nonlocal ink
        dry = np.sin(u * 0.9 + v * 0.35 + rng.uniform(0, 6)) * 0.5 + 0.5  # streaks along the stroke
        ink = np.maximum(ink, mask * strength * np.clip(dry * 1.6 - 0.25, 0, 1))

    def rect(x0, y0, x1, y1, t=2.2):
        inside = (u > x0 - t) & (u < x1 + t) & (v > y0 - t) & (v < y1 + t)
        hollow = (u > x0 + t) & (u < x1 - t) & (v > y0 + t) & (v < y1 - t)
        return (inside & ~hollow).astype(float)

    def hline(x0, x1, y, t=2.0):
        return ((u > x0) & (u < x1) & (np.abs(v - y) < t)).astype(float)

    for i in range(4):
        x0 = 22 + i * 90
        stroke(rect(x0, 56, x0 + 62, 100), 0.95 - i * 0.18)  # fading as the marker runs dry
        if i < 3:
            stroke(hline(x0 + 64, x0 + 88, 78), 0.85 - i * 0.2)
            stroke(((np.abs(u - (x0 + 84)) + np.abs(v - 78) * 1.2) < 6).astype(float) * ((u < x0 + 88)), 0.8 - i * 0.2)
    for j in range(3):
        y = 150 + j * 30
        stroke(rect(30, y - 8, 46, y + 8, 1.6), 0.8)
        stroke(hline(58, 58 + rng.integers(90, 170), y, 1.6), 0.7 - j * 0.15)
        if j < 2:  # ticked
            stroke(((np.abs((u - 33) - (v - y) * 0.9) < 2.2) & (u > 31) & (u < 38) & (v > y - 2) & (v < y + 6)).astype(float), 0.85)
            stroke(((np.abs((u - 38) + (v - y) * 1.4) < 2.2) & (u > 36) & (u < 50) & (v > y - 12) & (v < y + 6)).astype(float), 0.85)
    blue = np.array([0.22, 0.32, 0.58])
    img = img * (1 - ink[..., None] * 0.75) + blue * ink[..., None] * 0.75
    return save_top_first("whiteboard", img)


def roadmap_image(width=384, height=256, seed=41):
    """A roadmap on parchment: quarter ticks along the top, four swimlanes of rounded bars, and a
    dashed 'today' line. No text."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    img = np.ones((height, width, 3)) * np.array([0.90, 0.85, 0.72])
    img += periodic_noise(rng, width, 4, 0.02)[:height, :width, None]
    for x in range(40, width, 86):
        img[14:28, x : x + 2] = np.array([0.55, 0.48, 0.38])
    lanes = [np.array([0.47, 0.60, 0.52]), np.array([0.85, 0.66, 0.34]), np.array([0.76, 0.44, 0.34]), np.array([0.40, 0.52, 0.66])]
    for lane in range(4):
        y0 = 40 + lane * 52
        img[y0 + 46 : y0 + 47, 12 : width - 12] = np.array([0.72, 0.66, 0.54])
        x = 16 + int(rng.integers(0, 30))
        while x < width - 50:
            w = int(rng.integers(50, 120))
            x1 = min(x + w, width - 16)
            cy, half = y0 + 22, 11
            bar = (u > x) & (u < x1) & (np.abs(v - cy) < half)
            cap = ((u - x) ** 2 + (v - cy) ** 2 < half**2) | ((u - x1) ** 2 + (v - cy) ** 2 < half**2)
            mask = (bar | cap)[..., None]
            img = np.where(mask, lanes[lane] * rng.uniform(0.9, 1.05), img)
            x = x1 + int(rng.integers(18, 40))
    today = (np.abs(u - 150) < 1.5) & ((v // 8) % 2 == 0) & (v > 30)
    img = np.where(today[..., None], np.array([0.72, 0.30, 0.24]), img)
    return save_top_first("roadmap", img)


def scarf_image(width=64, height=256):
    """Maize and blue blocks along the scarf, with a fine knit rib."""
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    maize, blue = np.array([0.89, 0.71, 0.24]), np.array([0.13, 0.20, 0.36])
    band = ((v // 32) % 2 == 0)[..., None]
    img = np.where(band, blue, maize)
    rib = 1 + 0.06 * np.sin(u * 1.6)
    return save_top_first("scarf", img * rib[..., None])


# ---------------------------------------------------------------- materials


def add_materials(mats):
    images = {
        "kds": kds_screen_image(),
        "board": whiteboard_image(),
        "roadmap": roadmap_image(),
        "scarf": scarf_image(),
    }
    new = {
        "plastic": principled("LabPlastic", srgb("#e9e5dc"), 0.45),
        "plunger": principled("PlungerBlue", srgb("#5f7fa0"), 0.4),
        "grey": principled("LabGrey", srgb("#b4b8b8"), 0.4),
        "tip": principled("TipPlastic", srgb("#efe8d4"), 0.3),
        "rack": principled("RackBlue", srgb("#8aa3b8"), 0.5),
        "bezel": principled("Bezel", srgb("#2b2c2e"), 0.45),
        "screen": principled("KDSScreen", srgb("#ffffff"), 0.4, image=images["kds"]),
        "board": principled("Whiteboard", srgb("#ffffff"), 0.25, image=images["board"]),
        "alu": principled("Aluminium", srgb("#c3c5c4"), 0.35, metallic=1.0),
        "marker": principled("MarkerBody", srgb("#ece6da"), 0.4),
        "marker_cap": principled("MarkerCap", srgb("#9a4436"), 0.4),
        "felt": principled("Felt", srgb("#2f3a52"), 1.0),
        "velvet": principled("Velvet", srgb("#3c4f6a"), 1.0),
        "roadmap": principled("RoadmapPaper", srgb("#ffffff"), 0.9, image=images["roadmap"]),
        "keyboard": principled("KeyboardCase", srgb("#d8d0bf"), 0.5),
        "keycap": principled("Keycap", srgb("#ece6d8"), 0.5),
        "key_accent": principled("KeycapAccent", srgb("#6f8578"), 0.5),
        "enamel": principled("Enamel", srgb("#c76a46"), 0.25),
        "scarf": principled("Scarf", srgb("#ffffff"), 1.0, image=images["scarf"]),
        "leather": principled("Leather", srgb("#3e5a4a"), 0.6),
        "lamp_glass": principled("LampGlass", srgb("#3f7a5a"), 0.2),
        "leaflet_a": principled("LeafletCream", srgb("#efe4c8"), 0.9),
        "leaflet_b": principled("LeafletSage", srgb("#a9b9a2"), 0.9),
        "leaflet_c": principled("LeafletRose", srgb("#d6a88f"), 0.9),
        "ceramic": principled("Ceramic", srgb("#ddd3c2"), 0.35),
        "leaf_dark": principled("LeafDark", srgb("#4f6b4a"), 0.55),
        "book_a": principled("BookTerracotta", srgb("#a4573f"), 0.8),
        "book_b": principled("BookTeal", srgb("#3f6466"), 0.8),
        "book_c": principled("BookMustard", srgb("#c19a45"), 0.8),
    }
    mats.update(new)


# ---------------------------------------------------------------- 002: the micropipette


def build_pipette(mats):
    """A single-channel micropipette hanging on a brass stand, a rack of tips beside it."""
    z, cy = DECK_Z, CASE_Y
    parts = []
    # Stand: an oak foot, a brass post and an arm with a cradle for the pipette.
    foot = cyl("StandFoot", 0.055, 0.014, (0.035, cy + 0.01, z + 0.007), mat=None)
    grain_uv(foot, seed=300)
    foot = soften(foot, 0.004, 3)
    foot.data.materials.append(mats["grain"])
    parts.append(foot)
    parts.append(cyl("StandPost", 0.0045, 0.25, (0.06, cy + 0.03, z + 0.139), mat=mats["bronze"]))
    parts.append(with_mat(soften(box("StandArm", 0.02, 0.064, cy + 0.024, cy + 0.036, z + 0.248, z + 0.256), 0.002), mats["bronze"]))

    # The pipette, tip down: tip, shaft, ejector collar, grip, display window, finger hook, plunger.
    px, py = 0.025, cy + 0.03
    p = []
    p.append(cone("Tip", 0.0013, 0.0034, 0.055, (px, py, z + 0.0525), mat=mats["tip"]))
    p.append(cone("Shaft", 0.0034, 0.0062, 0.05, (px, py, z + 0.105), mat=mats["grey"]))
    p.append(cyl("Collar", 0.0078, 0.012, (px, py, z + 0.136), mat=mats["grey"]))
    grip = soften(cyl("Grip", 0.0118, 0.08, (px, py, z + 0.182), vertices=28, smooth=False), 0.003, 3)
    grip.data.materials.append(mats["plastic"])
    p.append(grip)
    p.append(with_mat(box("Window", px - 0.004, px + 0.004, py - 0.0125, py - 0.0105, z + 0.19, z + 0.208), mats["shadow"]))
    p.append(with_mat(soften(box("Hook", px - 0.005, px + 0.005, py + 0.008, py + 0.03, z + 0.212, z + 0.22), 0.002), mats["plastic"]))
    p.append(cyl("Plunger", 0.0042, 0.022, (px, py, z + 0.233), mat=mats["grey"]))
    p.append(soften(cyl("Button", 0.0088, 0.011, (px, py, z + 0.249), mat=mats["plunger"], smooth=False), 0.002))
    p.append(cyl("Ejector", 0.0042, 0.014, (px + 0.013, py, z + 0.225), mat=mats["plunger"]))
    pipette = pivot(parent(p, "PipetteBody"), (px, py, z + 0.22))  # Turns about the finger hook on the arm.
    pipette.rotation_euler.y = math.radians(-4)  # Hangs a hair off plumb.

    # A rack of tips: a blue box with a grid of tips standing up out of it.
    rack = []
    rx, ry = -0.105, cy - 0.01
    rack.append(with_mat(soften(box("Rack", rx - 0.05, rx + 0.05, ry - 0.033, ry + 0.033, z, z + 0.04), 0.003), mats["rack"]))
    tips = []
    for i in range(8):
        for j in range(5):
            tips.append(cone("RackTip", 0.0016, 0.0034, 0.03, (rx - 0.042 + i * 0.012, ry - 0.024 + j * 0.012, z + 0.052), vertices=8))
    rack_tips = join(tips, "RackTips")
    rack_tips.data.materials.append(mats["tip"])
    rack.append(rack_tips)
    rack_group = pivot(parent(rack, "TipRack"), (rx, ry, z))
    rack_group.rotation_euler.z = math.radians(9)

    return parent(parts + [pipette, rack_group], "Pipette")


# ---------------------------------------------------------------- 003: the first KDS


def build_kds(mats):
    """An early kitchen display on an oak stand, mid-service, with its bump bar in front."""
    z, cy = DECK_Z, CASE_Y
    w, h, d = 0.25, 0.165, 0.02
    screen = []
    screen.append(with_mat(soften(box("Bezel", -w / 2, w / 2, -d / 2, d / 2, -h / 2, h / 2), 0.006, 3), mats["bezel"]))
    glass = box("Screen", -w / 2 + 0.012, w / 2 - 0.012, -d / 2 - 0.0012, -d / 2 + 0.001, -h / 2 + 0.012, h / 2 - 0.016)
    plane_uv(glass, 0, 2)
    glass.data.materials.append(mats["screen"])
    screen.append(glass)
    screen.append(with_mat(ellipsoid((0, -d / 2 - 0.0005, -h / 2 + 0.008), (0.0025, 0.001, 0.0025), 10, 6, "Power"), mats["key_accent"]))
    display = parent(screen, "Display")
    display.location = (0.0, cy + 0.03, z + 0.165)
    display.rotation_euler.x = math.radians(-14)  # Tilted back, as if for a cook to read.

    stand = []
    stand.append(with_mat(soften(box("StandArm", -0.012, 0.012, cy + 0.035, cy + 0.06, z + 0.01, z + 0.11), 0.003), mats["bronze"]))
    base = soften(box("StandBase", -0.07, 0.07, cy - 0.01, cy + 0.09, z, z + 0.014), 0.004, 3)
    grain_uv(base, seed=301)
    base.data.materials.append(mats["grain"])
    stand.append(base)

    # The bump bar: a dark strip of square keys, angled a little toward the visitor.
    bar = [with_mat(soften(box("BumpBar", -0.095, 0.095, cy - 0.17, cy - 0.125, z, z + 0.014), 0.004), mats["bezel"])]
    keys = []
    for i in range(10):
        x = -0.084 + i * 0.0187
        keys.append(box("BumpKey", x - 0.007, x + 0.007, cy - 0.158, cy - 0.137, z + 0.014, z + 0.02))
    bump_keys = join(keys, "BumpKeys")
    bump_keys.data.materials.append(mats["keycap"])
    bar.append(bump_keys)
    bump = pivot(parent(bar, "Bump"), (0.0, cy - 0.1475, z))
    bump.rotation_euler.z = math.radians(-3)

    return parent([display] + stand + [bump], "KDS")


# ---------------------------------------------------------------- 004: the whiteboard marker


def build_marker(mats):
    """The marker, cap off, on a navy cushion like a precious specimen; its cap and a felt eraser
    beside it; a small whiteboard leaning at the back with the last diagram it drew."""
    z, cy = DECK_Z, CASE_Y
    parts = []
    cushion = soften(box("Cushion", -0.115, 0.115, cy - 0.11, cy + 0.03, z, z + 0.03), 0.012, 5)
    cushion.data.materials.append(mats["velvet"])
    parts.append(cushion)

    m = []
    m.append(cyl("MarkerBody", 0.0095, 0.12, (0, 0, 0), rotation=(0, math.radians(90), 0), vertices=24, mat=mats["marker"]))
    m.append(cyl("MarkerBand", 0.0098, 0.014, (-0.05, 0, 0), rotation=(0, math.radians(90), 0), vertices=24, mat=mats["marker_cap"]))
    m.append(cone("MarkerTaper", 0.0095, 0.005, 0.016, (0.068, 0, 0), rotation=(0, math.radians(90), 0), mat=mats["marker"]))
    m.append(with_mat(box("Nib", 0.075, 0.083, -0.0032, 0.0032, -0.0022, 0.0022), mats["felt"]))
    marker = parent(m, "MarkerPen")
    marker.location = (0.0, cy - 0.045, z + 0.03 + 0.0095)
    marker.rotation_euler.z = math.radians(16)

    c = []
    c.append(cyl("CapBody", 0.0108, 0.05, (0, 0, 0), rotation=(0, math.radians(90), 0), vertices=24, mat=mats["marker_cap"]))
    c.append(with_mat(soften(box("Clip", -0.02, 0.016, -0.003, 0.003, 0.0095, 0.0135), 0.0012), mats["marker_cap"]))
    cap = parent(c, "MarkerCap")
    cap.location = (0.13, cy - 0.12, z + 0.0108)
    cap.rotation_euler.z = math.radians(-28)

    eraser = []
    eraser.append(with_mat(soften(box("EraserTop", -0.032, 0.032, -0.015, 0.015, 0.008, 0.026), 0.004), mats["grain"]))
    eraser.append(with_mat(box("EraserFelt", -0.031, 0.031, -0.014, 0.014, 0.0, 0.009), mats["felt"]))
    grain_uv(eraser[0], seed=302)
    eraser_group = parent(eraser, "Eraser")
    eraser_group.location = (-0.15, cy - 0.12, z)
    eraser_group.rotation_euler.z = math.radians(12)

    board = []
    face = box("Board", -0.115, 0.115, -0.003, 0.003, 0.0, 0.15)
    plane_uv(face, 0, 2)
    face.data.materials.append(mats["board"])
    board.append(face)
    rails = [
        box("BoardRail", -0.121, 0.121, -0.005, 0.005, -0.006, 0.003, bevel=0.002, segments=2),
        box("BoardRail", -0.121, 0.121, -0.005, 0.005, 0.147, 0.156, bevel=0.002, segments=2),
        box("BoardRail", -0.121, -0.112, -0.005, 0.005, 0.0, 0.15, bevel=0.002, segments=2),
        box("BoardRail", 0.112, 0.121, -0.005, 0.005, 0.0, 0.15, bevel=0.002, segments=2),
    ]
    board.append(with_mat(join(rails, "BoardFrame"), mats["alu"]))
    whiteboard = parent(board, "MiniBoard")
    whiteboard.location = (0.03, cy + 0.15, z + 0.006)
    whiteboard.rotation_euler.x = math.radians(12)  # Leaning back against the glass.

    return parent(parts + [marker, cap, eraser_group, whiteboard], "Marker")


# ---------------------------------------------------------------- 005: the current roadmap


def build_roadmap(mats):
    """A roadmap scroll unrolled on a slanted oak lectern, held with brass map pins."""
    z, cy = DECK_Z, CASE_Y
    tilt = math.radians(24)
    lectern = []
    top = soften(box("LecternTop", -0.135, 0.135, -0.09, 0.09, -0.008, 0.0), 0.004, 3)
    grain_uv(top, seed=303)
    top.data.materials.append(mats["grain"])
    lectern.append(top)
    lip = soften(box("LecternLip", -0.135, 0.135, -0.098, -0.088, -0.008, 0.012), 0.003)
    grain_uv(lip, seed=304)
    lip.data.materials.append(mats["grain"])
    lectern.append(lip)
    paper = box("Scroll", -0.112, 0.112, -0.074, 0.074, 0.0, 0.0012)
    plane_uv(paper, 0, 1)
    paper.data.materials.append(mats["roadmap"])
    lectern.append(paper)
    for y in (-0.078, 0.078):
        lectern.append(cyl("Roller", 0.0075, 0.24, (0, y, 0.006), rotation=(0, math.radians(90), 0), mat=mats["grain"]))
        for x in (-0.124, 0.124):
            lectern.append(with_mat(ellipsoid((x, y, 0.006), (0.009, 0.009, 0.009), 14, 10, "RollerKnob"), mats["bronze"]))
    for x, y in ((-0.06, 0.03), (0.035, -0.012), (0.08, 0.04)):
        lectern.append(cyl("PinStem", 0.0011, 0.014, (x, y, 0.007), mat=mats["grey"]))
        lectern.append(with_mat(ellipsoid((x, y, 0.016), (0.0045, 0.0045, 0.0045), 12, 8, "PinHead"), mats["bronze"]))
    board = parent(lectern, "Lectern")
    board.location = (0.0, cy - 0.01, z + 0.075)
    board.rotation_euler.x = tilt

    legs = []
    block = soften(box("LecternBlock", -0.06, 0.06, cy - 0.02, cy + 0.06, z, z + 0.11), 0.006, 3)
    grain_uv(block, seed=305)
    block.data.materials.append(mats["grain"])
    legs.append(block)
    return parent([board] + legs, "Roadmap")


# ---------------------------------------------------------------- 006: after hours


def build_after_hours(mats):
    """Off the clock: a compact keyboard, a small enamel saucepan with a wooden spoon, and a folded
    maize-and-blue scarf. Symbols for the site's own words, not claims about particular gear."""
    z, cy = DECK_Z, CASE_Y
    kb = []
    kb.append(with_mat(soften(box("KeyboardCase", -0.1, 0.1, -0.036, 0.036, 0.0, 0.014), 0.004, 3), mats["keyboard"]))
    keys, accents = [], []
    for row in range(4):
        for col in range(13):
            x = -0.088 + col * 0.0147
            y = 0.024 - row * 0.0155
            target = accents if (row, col) in ((0, 0), (3, 12), (3, 0)) else keys
            target.append(box("Key", x - 0.0058, x + 0.0058, y - 0.0058, y + 0.0058, 0.014, 0.0205))
    kb.append(with_mat(join(keys, "Keycaps"), mats["keycap"]))
    kb.append(with_mat(join(accents, "Accents"), mats["key_accent"]))
    keyboard = parent(kb, "Keyboard")
    keyboard.location = (-0.07, cy - 0.07, z)
    keyboard.rotation_euler.z = math.radians(-8)

    # The saucepan: a hollow enamel pot with a rolled rim and an oak handle.
    bpy.ops.mesh.primitive_cylinder_add(vertices=36, radius=0.042, depth=0.04, location=(0, 0, 0.02))
    pot = bpy.context.active_object
    bm = bmesh.new()
    bm.from_mesh(pot.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.9], context="FACES")
    bm.to_mesh(pot.data)
    bm.free()
    wall = pot.modifiers.new("Wall", "SOLIDIFY")
    wall.thickness = 0.003
    wall.offset = -1
    apply_modifiers(pot)
    pot = soften(pot, 0.0012)
    pot.data.materials.append(mats["enamel"])
    handle = soften(box("PanHandle", 0.04, 0.115, -0.006, 0.006, 0.03, 0.038), 0.003, 3)
    grain_uv(handle, seed=306)
    handle.data.materials.append(mats["grain"])
    spoon = []
    spoon.append(with_mat(ellipsoid((0.0, 0.0, 0.0), (0.012, 0.018, 0.004), 16, 8, "SpoonBowl"), mats["cedar"]))
    spoon.append(cyl("SpoonHandle", 0.0028, 0.13, (0, 0.074, 0.004), rotation=(math.radians(90), 0, 0), mat=mats["cedar"]))
    spoon_group = parent(spoon, "Spoon")
    spoon_group.location = (-0.012, -0.004, 0.034)
    spoon_group.rotation_euler = (math.radians(-12), 0, math.radians(30))  # Resting across the rim.
    pan = parent([pot, handle, spoon_group], "Saucepan")
    pan.location = (0.075, cy + 0.075, z)
    pan.rotation_euler.z = math.radians(55)  # Handle toward the back corner, inside the glass.

    # The scarf: folded twice, draped over the keyboard's corner toward the front.
    scarf_parts = []
    for i, (zl, y0, y1) in enumerate(((0.0, -0.09, 0.09), (0.011, -0.09, 0.03))):
        layer = soften(box("ScarfLayer", -0.034, 0.034, y0, y1, zl, zl + 0.011), 0.005, 3)
        plane_uv(layer, 0, 1)
        layer.data.materials.append(mats["scarf"])
        scarf_parts.append(layer)
    scarf = parent(scarf_parts, "ScarfFold")
    scarf.location = (0.065, cy - 0.08, z)  # Clear of the glass even at the case's display scale.
    scarf.rotation_euler.z = math.radians(62)

    return parent([keyboard, pan, scarf], "AfterHours")


# ---------------------------------------------------------------- the information desk


def build_desk(mats):
    """The last stop: an oak information counter with a green leather top, a brass service bell, a
    tiered brochure stand and a banker's lamp. It stands where a cabinet would, centred in the niche."""
    cy = CASE_Y
    h = 0.9
    oak = []
    oak.append(box("DeskBase", -0.47, 0.47, cy - 0.26, cy + 0.2, 0.0, 0.08, bevel=0.025, segments=5))
    oak.append(box("DeskBody", -0.44, 0.44, cy - 0.23, cy + 0.18, 0.06, h - 0.03, bevel=0.045, segments=7))
    oak.append(box("DeskTop", -0.48, 0.48, cy - 0.27, cy + 0.21, h - 0.04, h, bevel=0.02, segments=5))
    front = cy - 0.23
    for x0, x1 in ((-0.38, -0.13), (-0.11, 0.11), (0.13, 0.38)):
        oak.append(box("DeskPanel", x0, x1, front - 0.012, front + 0.004, 0.16, h - 0.14, bevel=0.012, segments=4))
    for i, part in enumerate(oak):
        grain_uv(part, seed=320 + i)
    desk = join(oak, "DeskOak")
    desk.data.materials.append(mats["grain"])
    shade_smooth(desk)
    leather = box("DeskLeather", -0.43, 0.43, cy - 0.22, cy + 0.17, h, h + 0.003, bevel=0.002, segments=2)
    leather.data.materials.append(mats["leather"])

    # Brass service bell: a dome on a round base with a little plunger.
    bell = []
    bell.append(cyl("BellBase", 0.038, 0.012, (0, 0, 0.006), mat=mats["bronze"]))
    bell.append(with_mat(ellipsoid((0, 0, 0.014), (0.033, 0.033, 0.03), 28, 14, "BellDome"), mats["bronze"]))
    bell.append(cyl("BellStem", 0.0025, 0.012, (0, 0, 0.048), mat=mats["bronze"]))
    bell.append(with_mat(ellipsoid((0, 0, 0.056), (0.006, 0.006, 0.004), 12, 8, "BellButton"), mats["bronze"]))
    bell_group = parent(bell, "Bell")
    bell_group.location = (-0.24, cy - 0.12, h + 0.003)

    # A tiered brochure stand with three stacks of leaflets in different papers.
    stand = []
    for tier in range(3):
        step = soften(box("BrochureTier", -0.08, 0.08, -0.02 + tier * 0.035, 0.015 + tier * 0.035, 0, 0.03 + tier * 0.03), 0.003)
        grain_uv(step, seed=330 + tier)
        step.data.materials.append(mats["grain"])
        stand.append(step)
    for tier, mat in enumerate((mats["leaflet_a"], mats["leaflet_b"], mats["leaflet_c"])):
        leaf = box("Leaflets", -0.06, 0.06, -0.014 + tier * 0.035, -0.006 + tier * 0.035, 0.03 + tier * 0.03, 0.105 + tier * 0.03)
        leaf.rotation_euler.x = math.radians(-8)
        leaf.data.materials.append(mat)
        stand.append(leaf)
    brochures = parent(stand, "Brochures")
    brochures.location = (0.27, cy + 0.02, h + 0.003)
    brochures.rotation_euler.z = math.radians(-10)

    # A banker's lamp: brass foot and stem, a green glass shade (the web scene makes it glow).
    lamp = []
    lamp.append(soften(cyl("LampFoot", 0.05, 0.016, (0, 0, 0.008), smooth=False, mat=mats["bronze"]), 0.004))
    lamp.append(cyl("LampStem", 0.006, 0.2, (0, 0.02, 0.11), mat=mats["bronze"]))
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.06, depth=0.2, location=(0, 0, 0), rotation=(0, math.radians(90), 0))
    shade = bpy.context.active_object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)  # Axis along x before the cut.
    bm = bmesh.new()
    bm.from_mesh(shade.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0.0), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(shade.data)
    bm.free()
    solid = shade.modifiers.new("Glass", "SOLIDIFY")
    solid.thickness = 0.004
    apply_modifiers(shade)
    shade.name = "LampShade"
    shade.scale = (1, 0.75, 0.55)
    activate(shade)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    shade_smooth(shade)
    shade.data.materials.append(mats["lamp_glass"])
    shade.location = (0, -0.005, 0.21)
    lamp.append(shade)
    lamp_group = parent(lamp, "BankersLamp")
    lamp_group.location = (0.02, cy + 0.08, h + 0.003)

    return parent([desk, leather, bell_group, brochures, lamp_group], "Desk")


# ---------------------------------------------------------------- the room's dressing


def build_snake_plant(mats):
    """Tall, stiff, pointed leaves in a cream ceramic pot: a vertical accent, unlike the fern."""
    rng = np.random.default_rng(51)
    pot = soften(cyl("SnakePot", 0.058, 0.11, (0, 0, 0.055), vertices=32, smooth=False), 0.006, 3)
    pot.data.materials.append(mats["ceramic"])
    soil = cyl("Soil", 0.052, 0.008, (0, 0, 0.106), mat=mats["shadow"])
    leaves = []
    for i in range(8):
        a = i / 8 * 2 * math.pi + rng.uniform(-0.3, 0.3)
        height = rng.uniform(0.2, 0.34)
        leaf = ellipsoid((0, 0, 0), (0.013, 0.0035, height / 2), 12, 10, "Leaf")
        leaf.location = (math.cos(a) * 0.018, math.sin(a) * 0.018, 0.105 + height / 2 - 0.01)
        leaf.rotation_euler = (math.radians(rng.uniform(-9, 9)), math.radians(rng.uniform(-9, 9)), a)
        leaves.append(leaf)
    for leaf in leaves:
        activate(leaf)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    blades = join(leaves, "Blades")
    shade_smooth(blades)
    blades.data.materials.append(mats["leaf_dark"])
    return parent([pot, soil, blades], "SnakePlant")


def build_pothos(mats):
    """A small pot whose vines trail over the front edge of a sill. Each vine sways a little."""
    rng = np.random.default_rng(57)
    pot = soften(cyl("PothosPot", 0.05, 0.075, (0, 0, 0.0375), vertices=32, smooth=False), 0.004, 3)
    pot.data.materials.append(mats["clay"])
    soil = cyl("Soil", 0.045, 0.008, (0, 0, 0.072), mat=mats["shadow"])
    vines = []
    for v in range(5):
        a = math.radians(-150 + v * 28 + rng.uniform(-8, 8))  # Mostly toward the front (-y) and sides.
        leaves = []
        steps = int(rng.integers(6, 10))
        for s in range(steps):
            t = s / steps
            r = 0.02 + t * 0.13
            height = 0.085 - max(0.0, r - 0.07) * 1.6  # Over the pot's rim, then down past the sill's edge.
            x, y = math.cos(a) * r, math.sin(a) * r
            leaf = ellipsoid((x, y, height), (0.016 * (1.1 - t * 0.4), 0.012 * (1.1 - t * 0.4), 0.002), 10, 6, "Leaf")
            leaf.rotation_euler = (math.radians(rng.uniform(-40, 40)), math.radians(rng.uniform(-30, 30)), a + rng.uniform(-0.6, 0.6))
            leaves.append(leaf)
        for leaf in leaves:
            activate(leaf)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        vine = join(leaves, "Frond")
        activate(vine)
        bpy.context.scene.cursor.location = (0, 0, 0.08)
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        bpy.context.scene.cursor.location = (0, 0, 0)
        shade_smooth(vine)
        vine.data.materials.append(mats["leaf"] if v % 2 else mats["leaf_light"])
        vines.append(vine)
    return parent([pot, soil] + vines, "Pothos")


def build_books(mats):
    """Three cloth-bound books stacked on a sill, the top one turned a little."""
    books = []
    z = 0.0
    for i, (mat, w, l, t, turn) in enumerate(((mats["book_b"], 0.15, 0.21, 0.028, 4), (mats["book_a"], 0.14, 0.2, 0.022, -6), (mats["book_c"], 0.12, 0.17, 0.02, 14))):
        cover = soften(box("BookCover", -w / 2, w / 2, -l / 2, l / 2, 0, t), 0.0025, 2)
        cover.data.materials.append(mat)
        pages = box("BookPages", -w / 2 + 0.004, w / 2 + 0.0005, -l / 2 + 0.004, l / 2 - 0.004, 0.003, t - 0.003)
        pages.data.materials.append(mats["paper"])
        book = parent([cover, pages], "Book")
        book.location = (0.004 * i, 0.003 * i, z)
        book.rotation_euler.z = math.radians(turn)
        books.append(book)
        z += t
    return parent(books, "Books")


def build_all(mats):
    """Builds every exhibit specimen, the desk and the dressing. Returns them, so the caller can hide
    them from the Blender still (they all stand in the same spot there)."""
    add_materials(mats)
    return [
        build_pipette(mats),
        build_kds(mats),
        build_marker(mats),
        build_roadmap(mats),
        build_after_hours(mats),
        build_desk(mats),
        build_snake_plant(mats),
        build_pothos(mats),
        build_books(mats),
    ]
