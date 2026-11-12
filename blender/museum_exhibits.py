"""
Specimens for exhibits 002 to 006, the Information desk, the fatherhood plinth and the room's varied
dressing (plants and a book stack), built from primitives like everything else. Imported by
build_museum.py after its bakes, so none of this darkens the skull's or the cabinet's baked occlusion.

Every specimen is built around the case centre (x 0, y CASE_Y) standing on the deck (z DECK_Z), inside
the glass (about +-0.22 m across, 0.32 m tall; 006's wider case is about +-0.3 m across). The web scene
clones each one into its own case and scales it about the deck's centre.
"""

import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector

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


def oak(obj, seed, mats):
    """Grain-mapped oak, as on the cabinets."""
    grain_uv(obj, seed=seed)
    obj.data.materials.append(mats["grain"])
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


def rod(name, p0, p1, radius, mat, vertices=10):
    """A round rod from p0 to p1: easel legs, threads between pins."""
    a, b = Vector(p0), Vector(p1)
    d = b - a
    obj = cyl(name, radius, d.length, (a + b) / 2, vertices=vertices, mat=mat)
    obj.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return obj


def text_mesh(name, body, size, mat, extrude=0.00025):
    """Flat lettering in Blender's built-in font, lying in the XY plane, centred, read from -Y."""
    bpy.ops.object.text_add(location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.data.body = body
    obj.data.size = size
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.extrude = extrude
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def pivot(group, point):
    """Moves an empty to point without moving its children, so rotating it turns them about point
    (parent() leaves empties at the world origin, which would swing children built in place)."""
    for child in group.children:
        child.location = (child.location[0] - point[0], child.location[1] - point[1], child.location[2] - point[2])
    group.location = point
    return group


# ---------------------------------------------------------------- textures (painted in code, top row first)


def save_top_first(name, rgb):
    return save_image(name, rgb[::-1].copy())


def rounded(u, v, x0, y0, x1, y1, r):
    """A rounded-rectangle mask."""
    dx = np.maximum(np.maximum(x0 + r - u, u - (x1 - r)), 0)
    dy = np.maximum(np.maximum(y0 + r - v, v - (y1 - r)), 0)
    return (dx**2 + dy**2 <= r**2) & (u >= x0) & (u <= x1) & (v >= y0) & (v <= y1)


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


def laptop_screen_image(width=512, height=320, seed=43):
    """An abstract code review, light theme: a file list, a diff with added and removed rows, an
    inline review comment and an approval button. Bars stand in for text; nothing is readable."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    img = np.ones((height, width, 3)) * np.array([0.95, 0.945, 0.93])
    img[:22] = [0.86, 0.85, 0.82]
    for i in range(3):
        img[((u - (14 + i * 14)) ** 2 + (v - 11) ** 2) < 16] = [0.66, 0.65, 0.62]
    # The file list.
    img[22:, :112] = [0.9, 0.895, 0.87]
    img[22:, 112:113] = [0.8, 0.79, 0.76]
    for r in range(11):
        y = 38 + r * 22
        if r == 3:
            img[y - 7 : y + 11, 4:108] = [0.8, 0.86, 0.91]
        indent = 12 + (10 if r in (2, 3, 4, 7, 8) else 0)
        img[y : y + 5, indent : indent + int(rng.integers(36, 78))] = [0.58, 0.58, 0.56]
    # The pull request's title and the approval button.
    img[34:44, 128:318] = [0.27, 0.28, 0.3]
    img[51:56, 128:226] = [0.64, 0.64, 0.62]
    img[rounded(u, v, 418, 30, 498, 54, 10)] = [0.33, 0.58, 0.41]
    img[(np.abs(v - 42) < 2.5) & (u > 438) & (u < 478)] = [0.9, 0.96, 0.91]
    # The diff.
    x0, x1, y0 = 124, 500, 68
    img[y0 : height - 8, x0:x1] = [0.995, 0.99, 0.98]
    img[y0 : y0 + 16, x0:x1] = [0.9, 0.895, 0.875]
    img[y0 + 6 : y0 + 10, x0 + 10 : x0 + 150] = [0.45, 0.45, 0.44]
    tokens = [np.array([0.3, 0.42, 0.64]), np.array([0.53, 0.36, 0.58]), np.array([0.7, 0.4, 0.28]), np.array([0.46, 0.46, 0.45])]
    y = y0 + 20
    for kind in ["", "", "-", "-", "+", "+", "+", "", "c", "", "-", "+", "", "", ""]:
        if y > height - 22:
            break
        if kind == "c":  # An inline review comment.
            img[rounded(u, v, x0 + 44, y + 2, x1 - 12, y + 46, 5)] = [0.86, 0.8, 0.7]
            img[rounded(u, v, x0 + 45, y + 3, x1 - 13, y + 45, 4)] = [1.0, 0.975, 0.93]
            img[((u - (x0 + 62)) ** 2 + (v - (y + 16)) ** 2) < 49] = [0.5, 0.62, 0.53]
            img[y + 13 : y + 18, x0 + 76 : x0 + 250] = [0.52, 0.5, 0.47]
            img[y + 27 : y + 32, x0 + 76 : x0 + 196] = [0.68, 0.66, 0.62]
            y += 52
            continue
        h = 13
        if kind == "+":
            img[y : y + h, x0:x1] = [0.86, 0.94, 0.86]
            img[y : y + h, x0 + 34 : x0 + 37] = [0.36, 0.62, 0.42]
        elif kind == "-":
            img[y : y + h, x0:x1] = [0.98, 0.87, 0.85]
            img[y : y + h, x0 + 34 : x0 + 37] = [0.78, 0.38, 0.34]
        img[y + 4 : y + 8, x0 + 8 : x0 + 22] = [0.74, 0.74, 0.72]  # line number
        x = x0 + 46 + int(rng.integers(0, 3)) * 14
        for _ in range(int(rng.integers(2, 4))):
            w = int(rng.integers(18, 72))
            if x + w > x1 - 10:
                break
            img[y + 4 : y + 9, x : x + w] = tokens[int(rng.integers(0, 4))]
            x += w + 7
        y += h
    return save_top_first("laptop-screen", img)


def whiteboard_image(width=256, height=176, seed=37):
    """A restrained diagram from a marker that is nearly dry: three boxes joined by two arrows, each
    fainter than the last, over the ghost of older drawings."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:height, 0:width].astype(np.float64)
    img = np.ones((height, width, 3)) * np.array([0.95, 0.95, 0.93])
    img += periodic_noise(rng, width, 4, 0.012)[:height, :width][..., None]
    ink = np.zeros((height, width))

    def stroke(mask, strength):
        nonlocal ink
        dry = np.sin(u * 0.9 + v * 0.35 + rng.uniform(0, 6)) * 0.5 + 0.5  # streaks along the stroke
        ink = np.maximum(ink, mask * strength * np.clip(dry * 1.6 - 0.25, 0, 1))

    def rect(x0, y0, x1, y1, t=2.6):
        inside = (u > x0 - t) & (u < x1 + t) & (v > y0 - t) & (v < y1 + t)
        hollow = (u > x0 + t) & (u < x1 - t) & (v > y0 + t) & (v < y1 - t)
        return (inside & ~hollow).astype(float)

    for i in range(3):
        x0 = 22 + i * 78
        stroke(rect(x0, 62, x0 + 56, 112), 0.95 - i * 0.3)  # fading as the marker runs dry
        if i < 2:
            stroke(((u > x0 + 60) & (u < x0 + 74) & (np.abs(v - 87) < 2.2)).astype(float), 0.85 - i * 0.3)
            stroke(((np.abs(u - (x0 + 70)) + np.abs(v - 87) * 1.2) < 6).astype(float) * (u < x0 + 75), 0.8 - i * 0.3)
    blue = np.array([0.22, 0.32, 0.58])
    img = img * (1 - ink[..., None] * 0.75) + blue * ink[..., None] * 0.75
    return save_top_first("whiteboard", img)


def cork_image(width=256, height=176, seed=45):
    """Pinboard cork: warm tan with fine light and dark granules."""
    rng = np.random.default_rng(seed)
    img = np.ones((height, width, 3)) * np.array([0.74, 0.58, 0.4])
    grain = rng.normal(0, 1, (height, width))
    img *= (1 + 0.07 * grain)[..., None]
    img += periodic_noise(rng, width, 3, 0.03)[:height, :width][..., None]
    return save_top_first("cork", np.clip(img, 0, 1))


def card_image(width=128, height=88, seed=47):
    """An index card on the planning board: cream, two lines of pencil, no words."""
    img = np.ones((height, width, 3)) * np.array([0.95, 0.92, 0.84])
    img[36:44, 14:104] = [0.6, 0.58, 0.54]
    img[56:63, 14:76] = [0.72, 0.7, 0.66]
    return save_top_first("plan-card", img)


def code_card_image(width=128, height=88):
    """The one code change on the board: a diff in miniature, two lines added and one removed."""
    img = np.ones((height, width, 3)) * np.array([0.96, 0.94, 0.89])
    img[:, :14] = [0.88, 0.86, 0.8]
    rows = [("", 54), ("-", 70), ("+", 86), ("+", 62), ("", 44)]
    for i, (kind, w) in enumerate(rows):
        y = 12 + i * 14
        if kind == "+":
            img[y - 3 : y + 9, 14:] = [0.84, 0.93, 0.84]
            img[y - 3 : y + 9, 2:12] = [0.36, 0.62, 0.42]
        elif kind == "-":
            img[y - 3 : y + 9, 14:] = [0.97, 0.85, 0.83]
            img[y - 3 : y + 9, 2:12] = [0.78, 0.38, 0.34]
        img[y : y + 6, 22 : 22 + w] = [0.36, 0.38, 0.44]
    return save_top_first("code-card", img)


def calendar_page_image(width=160, height=136):
    """A flip calendar's page: a muted header band and a month of blank days, a few of them marked.
    No numbers, no month."""
    img = np.ones((height, width, 3)) * np.array([0.95, 0.92, 0.85])
    img[:30] = [0.56, 0.42, 0.36]
    marks = {(1, 2): [0.56, 0.66, 0.56], (2, 4): [0.46, 0.55, 0.66], (3, 1): [0.72, 0.5, 0.4], (3, 5): [0.56, 0.66, 0.56]}
    for row in range(5):
        for col in range(7):
            x0, y0 = 8 + col * 21, 38 + row * 19
            img[y0 : y0 + 15, x0 : x0 + 17] = marks.get((row, col), [0.88, 0.85, 0.78])
    return save_top_first("calendar-page", img)


def sleeve_image(size=256, seed=53):
    """An original record sleeve: an abstract low sun over two bands, in muted inks on oatmeal card."""
    rng = np.random.default_rng(seed)
    v, u = np.mgrid[0:size, 0:size].astype(np.float64)
    img = np.ones((size, size, 3)) * np.array([0.86, 0.82, 0.73])
    img += periodic_noise(rng, size, 4, 0.02)[:size, :size][..., None]
    sun = (u - 128) ** 2 + (v - 120) ** 2 < 62**2
    img[sun] = [0.74, 0.45, 0.32]
    img[(v > 150) & (v < 178)] = [0.32, 0.46, 0.46]
    img[(v > 186) & (v < 196)] = [0.32, 0.46, 0.46]
    return save_top_first("record-sleeve", np.clip(img, 0, 1))


def vinyl_image(size=256):
    """A record seen face on: fine grooves, a plain cream centre label and the spindle hole."""
    v, u = np.mgrid[0:size, 0:size].astype(np.float64)
    r = np.hypot(u - size / 2 + 0.5, v - size / 2 + 0.5) / (size / 2)
    img = np.ones((size, size, 3)) * 0.055
    img += (0.018 * np.sin(r * 420) + 0.025 * (np.abs(r - 0.66) < 0.012))[..., None]
    img[r < 0.34] = [0.86, 0.8, 0.68]
    img[(r < 0.34) & (r > 0.31)] = [0.7, 0.44, 0.32]
    img[r < 0.04] = [0.12, 0.1, 0.09]
    return save_top_first("vinyl", np.clip(img, 0, 1))


# ---------------------------------------------------------------- materials


def add_materials(mats):
    images = {
        "kds": kds_screen_image(),
        "laptop": laptop_screen_image(),
        "board": whiteboard_image(),
        "cork": cork_image(),
        "card": card_image(),
        "code": code_card_image(),
        "calendar": calendar_page_image(),
        "sleeve": sleeve_image(),
        "vinyl": vinyl_image(),
    }
    new = {
        # 002: sample tubes and slides.
        "tube_glass": principled("SampleGlass", srgb("#e8eef0"), 0.08, alpha=0.28),
        "ruby": principled("Ruby", srgb("#8a2d34"), 0.25),
        "stopper": principled("Stopper", srgb("#a98a64"), 0.75),  # cork
        "sample_label": principled("SampleLabel", srgb("#f1e8d6"), 0.85),
        "slide_glass": principled("SlideGlass", srgb("#eef2f0"), 0.06, alpha=0.32),
        # 003: the KDS.
        "bezel": principled("Bezel", srgb("#2b2c2e"), 0.45),
        "screen": principled("KDSScreen", srgb("#ffffff"), 0.4, image=images["kds"]),
        "keycap": principled("Keycap", srgb("#ece6d8"), 0.5),
        "key_accent": principled("KeycapAccent", srgb("#6f8578"), 0.5),
        # 004: the laptop, the whiteboard and the marker.
        "alu": principled("Aluminium", srgb("#c3c5c4"), 0.35, metallic=1.0),
        "trackpad": principled("Trackpad", srgb("#b3b6b6"), 0.3, metallic=1.0),
        "laptop_key": principled("LaptopKey", srgb("#303133"), 0.5),
        "laptop_screen": principled("LaptopDisplay", srgb("#ffffff"), 0.4, image=images["laptop"]),
        "board": principled("Whiteboard", srgb("#ffffff"), 0.25, image=images["board"]),
        "marker": principled("MarkerBody", srgb("#ece6da"), 0.4),
        "marker_cap": principled("MarkerCap", srgb("#9a4436"), 0.4),
        "felt": principled("Felt", srgb("#2f3a52"), 1.0),
        # 005: the planning board and the flip calendar.
        "cork": principled("Cork", srgb("#ffffff"), 0.95, image=images["cork"]),
        "card": principled("PlanCard", srgb("#ffffff"), 0.9, image=images["card"]),
        "code_card": principled("CodeCard", srgb("#ffffff"), 0.9, image=images["code"]),
        "tab_sage": principled("TabSage", srgb("#8fa38f"), 0.8),
        "tab_rust": principled("TabRust", srgb("#b9775c"), 0.8),
        "tab_slate": principled("TabSlate", srgb("#7488a0"), 0.8),
        "thread": principled("Thread", srgb("#9c4a3c"), 0.8),
        "calendar_page": principled("CalendarPage", srgb("#ffffff"), 0.9, image=images["calendar"]),
        "calendar_board": principled("CalendarBoard", srgb("#4c5256"), 0.7),
        # 006: a cast-iron pan, books, a record and a camera.
        "cast_iron": principled("CastIron", srgb("#2a2928"), 0.55, metallic=0.6),
        "sleeve": principled("RecordSleeve", srgb("#ffffff"), 0.85, image=images["sleeve"]),
        "vinyl": principled("Vinyl", srgb("#ffffff"), 0.35, image=images["vinyl"]),
        "leatherette": principled("Leatherette", srgb("#2c2b29"), 0.85),
        "lens_glass": principled("LensGlass", srgb("#1b2228"), 0.08),
        "ink": principled("PlaqueInk", srgb("#2a2520"), 0.7),
        "book_oat": principled("BookOat", srgb("#cdbf9f"), 0.8),
        "book_slate": principled("BookSlate", srgb("#56646e"), 0.8),
        "book_olive": principled("BookOlive", srgb("#7b7a52"), 0.8),
        # The desk and the dressing.
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


# ---------------------------------------------------------------- 002: the research years


def sample_tube(mats, x, fill, seed):
    """A rounded-bottom sample tube: clear glass, a ruby sample, a cream label band and a stopper.
    Built standing on z 0 at (x, 0)."""
    r, length = 0.0085, 0.088
    parts = []
    glass = join([ellipsoid((x, 0, r), (r, r, r), 20, 12, "TubeEnd"), cyl("TubeWall", r, length, (x, 0, r + length / 2), vertices=20)], "TubeGlass")
    shade_smooth(glass)
    parts.append(with_mat(glass, mats["tube_glass"]))
    s = r * 0.8
    sample = join([ellipsoid((x, 0, r), (s, s, s), 16, 10, "SampleEnd"), cyl("SampleBody", s, fill, (x, 0, r + fill / 2), vertices=16)], "Sample")
    shade_smooth(sample)
    parts.append(with_mat(sample, mats["ruby"]))
    parts.append(cyl("TubeLabel", r * 1.03, 0.014, (x, 0, r + fill + 0.017), vertices=20, mat=mats["sample_label"]))
    stopper = soften(cyl("Stopper", r * 1.18, 0.013, (x, 0, r + length + 0.004), vertices=20, smooth=False), 0.0025, 2)
    parts.append(with_mat(stopper, mats["stopper"]))
    return parts


def build_samples(mats):
    """A small oak rack holding three rounded sample tubes, and two glass slides in a brass holder.
    Warm, tidy, and nothing a squeamish visitor would mind."""
    z, cy = DECK_Z, CASE_Y
    rack = []
    rack.append(oak(soften(box("RackBase", -0.072, 0.072, -0.024, 0.024, 0, 0.012), 0.003, 3), 340, mats))
    for x in (-0.066, 0.066):
        rack.append(oak(soften(box("RackPost", x - 0.006, x + 0.006, -0.012, 0.012, 0.012, 0.064), 0.002, 2), 341, mats))
    rack.append(oak(soften(box("RackRail", -0.072, 0.072, -0.014, 0.014, 0.052, 0.062), 0.0025, 2), 342, mats))
    for i, (x, fill) in enumerate(((-0.038, 0.034), (0.0, 0.044), (0.038, 0.028))):
        rack += sample_tube(mats, x, fill, i)
    for part in rack:
        part.location.z += 0.012 if part.name.startswith(("Tube", "Sample", "Stopper")) else 0
    rack_group = parent(rack, "TubeRack")
    rack_group.location = (-0.042, cy + 0.03, z)
    rack_group.rotation_euler.z = math.radians(7)

    holder = [with_mat(soften(box("SlideHolder", -0.046, 0.046, -0.016, 0.016, 0, 0.012), 0.003, 3), mats["bronze"])]
    for i, y in enumerate((-0.005, 0.006)):
        slide = []
        slide.append(with_mat(box("SlideGlass", -0.038, 0.038, -0.0006, 0.0006, 0, 0.026), mats["slide_glass"]))
        slide.append(with_mat(box("SlideLabel", -0.038, -0.018, -0.0009, 0.0009, 0.0005, 0.0255), mats["sample_label"]))
        slide.append(with_mat(ellipsoid((0.008 - i * 0.006, -0.0008, 0.014), (0.012, 0.0004, 0.0055), 16, 8, "Smear"), mats["ruby"]))
        group = parent(slide, "Slide")
        group.location = (i * 0.004, y, 0.006)
        group.rotation_euler.x = math.radians(-12)  # Leaning back in its slot, face to the visitor.
        holder.append(group)
    holder_group = parent(holder, "SlideStand")
    holder_group.location = (0.1, cy - 0.075, z)
    holder_group.rotation_euler.z = math.radians(-14)

    return parent([rack_group, holder_group], "Samples")


# ---------------------------------------------------------------- 004: the nearly dry marker


def build_laptop(mats):
    """An open laptop with a code review on screen, the main object; a small whiteboard on an oak
    foot behind it, the nearly dry marker resting in its tray, and the marker's cap on the deck."""
    z, cy = DECK_Z, CASE_Y
    w, d, t = 0.1, 0.0675, 0.007
    base = [with_mat(soften(box("LaptopBase", -w, w, -d, d, 0, t), 0.003, 3), mats["alu"])]
    keys = []
    for row in range(5):
        for col in range(12):
            x = -0.0825 + col * 0.015
            y = 0.049 - row * 0.0125
            keys.append(box("Key", x - 0.0058, x + 0.0058, y - 0.005, y + 0.005, t - 0.0004, t + 0.0007))
    base.append(with_mat(join(keys, "LaptopKeys"), mats["laptop_key"]))
    base.append(with_mat(box("Trackpad", -0.036, 0.036, -0.06, -0.018, t - 0.0002, t + 0.0003), mats["trackpad"]))
    lid = [with_mat(soften(box("LaptopLid", -w, w, 0, 0.005, 0, 0.13), 0.0025, 3), mats["alu"])]
    lid.append(with_mat(box("LaptopBezel", -w + 0.003, w - 0.003, -0.0006, 0.0005, 0.003, 0.127), mats["bezel"]))
    display = box("LaptopScreen", -0.091, 0.091, -0.0012, -0.0002, 0.009, 0.12)
    plane_uv(display, 0, 2)
    lid.append(with_mat(display, mats["laptop_screen"]))
    lid_group = parent(lid, "Lid")
    lid_group.location = (0, d - 0.003, t)
    lid_group.rotation_euler.x = math.radians(-14)  # Opened a little past upright, as if mid-review.
    laptop = parent(base + [lid_group], "LaptopBody")
    laptop.location = (-0.045, cy - 0.02, z)
    laptop.rotation_euler.z = math.radians(6)

    # The whiteboard: a small framed board on an oak foot, a tray along its bottom edge.
    bw, bh = 0.046, 0.068
    board = []
    face = box("Board", -bw, bw, -0.002, 0.002, 0, bh)
    plane_uv(face, 0, 2)
    board.append(with_mat(face, mats["board"]))
    rails = [
        box("BoardRail", -bw - 0.004, bw + 0.004, -0.004, 0.004, bh - 0.002, bh + 0.004, bevel=0.0015, segments=2),
        box("BoardRail", -bw - 0.004, -bw + 0.002, -0.004, 0.004, 0, bh),
        box("BoardRail", bw - 0.002, bw + 0.004, -0.004, 0.004, 0, bh),
        box("BoardTray", -bw - 0.004, bw + 0.004, -0.016, 0.004, -0.004, 0.002, bevel=0.0015, segments=2),
        box("TrayLip", -bw - 0.004, bw + 0.004, -0.017, -0.014, 0.002, 0.006, bevel=0.001, segments=2),
    ]
    board.append(with_mat(join(rails, "BoardFrame"), mats["alu"]))
    # The marker in the tray: a short body, a coloured band at the back, a felt nib gone pale.
    m = []
    m.append(cyl("MarkerBody", 0.0052, 0.064, (0, 0, 0), rotation=(0, math.radians(90), 0), vertices=20, mat=mats["marker"]))
    m.append(cyl("MarkerBand", 0.0054, 0.008, (-0.026, 0, 0), rotation=(0, math.radians(90), 0), vertices=20, mat=mats["marker_cap"]))
    m.append(cone("MarkerTaper", 0.0052, 0.0028, 0.009, (0.0365, 0, 0), rotation=(0, math.radians(90), 0), mat=mats["marker"]))
    m.append(with_mat(box("Nib", 0.041, 0.0455, -0.0018, 0.0018, -0.0012, 0.0012), mats["felt"]))
    marker = parent(m, "MarkerPen")
    marker.location = (0.004, -0.0095, 0.002 + 0.0052)
    board.append(marker)
    board_group = parent(board, "MiniBoard")
    board_group.rotation_euler.x = math.radians(-10)  # Leaning back in its foot.
    foot = [oak(soften(box("BoardFoot", -0.05, 0.05, -0.014, 0.014, 0, 0.012), 0.003, 3), 343, mats), board_group]
    board_group.location = (0, 0.004, 0.012)
    stand = parent(foot, "BoardStand")
    stand.location = (0.118, cy + 0.11, z)
    stand.rotation_euler.z = math.radians(-12)

    c = []
    c.append(cyl("CapBody", 0.0064, 0.03, (0, 0, 0), rotation=(0, math.radians(90), 0), vertices=20, mat=mats["marker_cap"]))
    c.append(with_mat(soften(box("Clip", -0.012, 0.01, -0.0018, 0.0018, 0.0058, 0.0084), 0.0008), mats["marker_cap"]))
    cap = parent(c, "MarkerCap")
    cap.location = (0.125, cy - 0.085, z + 0.0064)
    cap.rotation_euler.z = math.radians(-32)

    return parent([laptop, stand, cap], "Laptop")


# ---------------------------------------------------------------- 005: plans & pull requests


def build_planning(mats):
    """A cork planning board on an oak easel: three lanes of cards, each lane with its own muted tab
    colour (clients, stakeholders, teams), milestones pinned and joined with thread, and one small
    code-change card among them. A freestanding flip calendar beside it."""
    z, cy = DECK_Z, CASE_Y
    rng = np.random.default_rng(61)
    bw, bh = 0.118, 0.16  # half width, height of the cork
    face = box("Cork", -bw, bw, 0, 0.008, 0, bh)
    plane_uv(face, 0, 2)
    board = [with_mat(face, mats["cork"])]
    frame = [
        box("BoardFrame", -bw - 0.01, bw + 0.01, -0.004, 0.01, -0.01, 0.0, bevel=0.002, segments=2),
        box("BoardFrame", -bw - 0.01, bw + 0.01, -0.004, 0.01, bh, bh + 0.01, bevel=0.002, segments=2),
        box("BoardFrame", -bw - 0.01, -bw, -0.004, 0.01, 0, bh, bevel=0.002, segments=2),
        box("BoardFrame", bw, bw + 0.01, -0.004, 0.01, 0, bh, bevel=0.002, segments=2),
    ]
    board.append(oak(join(frame, "CorkFrame"), 344, mats))
    # Cards: lanes top to bottom, columns left to right. (lane, column) -> material; the code change
    # sits in the bottom lane, with the team doing the work.
    tabs = [mats["tab_sage"], mats["tab_rust"], mats["tab_slate"]]
    xs, zs = (-0.083, -0.028, 0.027, 0.082), (0.118, 0.074, 0.03)
    layout = {(0, 0), (0, 1), (0, 3), (1, 0), (1, 2), (1, 3), (2, 1), (2, 2), (2, 3)}
    pins = {}
    for lane, col in sorted(layout):
        x, zc = xs[col], zs[lane]
        code = (lane, col) == (2, 2)
        hw, hh = (0.024, 0.017) if code else (0.021, 0.015)
        card = box("PlanCard", x - hw, x + hw, -0.0012, 0.0, zc - hh, zc + hh)
        plane_uv(card, 0, 2)
        card.data.materials.append(mats["code_card"] if code else mats["card"])
        tab = box("CardTab", x - hw + 0.004, x - hw + 0.016, -0.0013, -0.0001, zc + hh - 0.002, zc + hh + 0.005)
        tab.data.materials.append(tabs[lane])
        tilt = math.radians(rng.uniform(-3, 3))
        for part in (card, tab):  # A hand-pinned card is never quite square.
            activate(part)
            bpy.context.scene.cursor.location = (x, 0, zc)
            bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
            part.rotation_euler.y = tilt
            board.append(part)
        bpy.context.scene.cursor.location = (0, 0, 0)
        pins[(lane, col)] = (x + 0.006, -0.002, zc + hh - 0.004)
    # Milestones: a brass pin on each, joined across the lanes with red thread.
    milestones = [(0, 1), (1, 2), (2, 3), (0, 3)]
    for key in milestones:
        x, y, zc = pins[key]
        board.append(with_mat(ellipsoid((x, y - 0.002, zc), (0.0034, 0.0034, 0.0034), 12, 8, "PinHead"), mats["bronze"]))
    for a, b in (((0, 1), (1, 2)), ((1, 2), (2, 3)), ((0, 3), (1, 2))):
        pa, pb = pins[a], pins[b]
        board.append(rod("Thread", (pa[0], pa[1] - 0.003, pa[2]), (pb[0], pb[1] - 0.003, pb[2]), 0.0007, mats["thread"], vertices=6))
    # The easel: two front legs behind the board, a ledge it stands on, a back leg.
    for x in (-0.08, 0.08):
        board.append(oak(box("EaselLeg", x - 0.0055, x + 0.0055, 0.008, 0.018, -0.045, bh + 0.035), 345, mats))
    board.append(oak(soften(box("EaselLedge", -bw - 0.014, bw + 0.014, -0.016, 0.012, -0.022, -0.01), 0.002), 346, mats))
    easel = pivot(parent(board, "Easel"), (0, 0.013, -0.045))
    easel.location = (0, 0.013, 0)  # Legs on the deck.
    easel.rotation_euler.x = math.radians(-11)
    top = (0, 0.013 + (bh + 0.08) * math.sin(math.radians(11)), (bh + 0.08) * math.cos(math.radians(11)) - 0.005)
    back_leg = oak(rod("EaselBack", top, (0, 0.13, 0.0), 0.0045, None, vertices=8), 347, mats)
    easel_group = parent([easel, back_leg], "PlanningBoard")
    easel_group.location = (-0.045, cy + 0.035, z)

    # The flip calendar: an A-frame of two boards meeting under brass rings; the front carries the
    # pages, with three muted tabs along their edge.
    ch, cw, splay = 0.072, 0.043, math.radians(17)
    front = [with_mat(soften(box("CalBack", -cw, cw, 0, 0.003, 0, ch), 0.0012), mats["calendar_board"])]
    front.append(with_mat(box("CalPages", -cw + 0.002, cw - 0.002, -0.004, 0.0, 0.002, ch - 0.004), mats["paper"]))
    page = box("CalPage", -cw + 0.002, cw - 0.002, -0.0045, -0.0039, 0.002, ch - 0.004)
    plane_uv(page, 0, 2)
    front.append(with_mat(page, mats["calendar_page"]))
    for i, mat in enumerate(tabs):
        front.append(with_mat(box("CalTab", cw - 0.002, cw + 0.006, -0.0038, -0.001, 0.012 + i * 0.016, 0.022 + i * 0.016), mat))
    front_group = parent(front, "CalFront")
    front_group.location = (0, -ch * math.sin(splay), 0)
    front_group.rotation_euler.x = -splay
    back = [with_mat(soften(box("CalRear", -cw, cw, 0, 0.003, 0, ch), 0.0012), mats["calendar_board"])]
    back_group = parent(back, "CalRearGroup")
    back_group.location = (0, ch * math.sin(splay) + 0.003, 0)
    back_group.rotation_euler.x = splay
    rings = []
    apex = ch * math.cos(splay)
    for x in np.linspace(-cw + 0.008, cw - 0.008, 5):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.0042, minor_radius=0.0007, major_segments=16, minor_segments=6, location=(x, 0.0015, apex - 0.001), rotation=(0, math.radians(90), 0))
        rings.append(bpy.context.active_object)
    ring_obj = with_mat(join(rings, "CalRings"), mats["bronze"])
    calendar = parent([front_group, back_group, ring_obj], "FlipCalendar")
    calendar.location = (0.128, cy - 0.085, z)
    calendar.rotation_euler.z = math.radians(-20)

    return parent([easel_group, calendar], "Planning")


# ---------------------------------------------------------------- 006: after hours


def build_after_hours(mats):
    """Off the clock, a wide still life: a cast-iron pan, a few books, a record sliding from its
    sleeve, a camera, and an empty spot with a small plaque where the running shoes would be."""
    z, cy = DECK_Z, CASE_Y
    # Books, stacked flat: plain cloth covers, no titles.
    books = []
    zb = 0.0
    for mat, w, l, t, turn in ((mats["book_slate"], 0.13, 0.17, 0.026, 3), (mats["book_oat"], 0.12, 0.16, 0.02, -5), (mats["book_olive"], 0.105, 0.15, 0.022, 9)):
        cover = soften(box("BookCover", -w / 2, w / 2, -l / 2, l / 2, 0, t), 0.0025, 2)
        cover.data.materials.append(mat)
        pages = box("BookPages", -w / 2 + 0.004, w / 2 + 0.0005, -l / 2 + 0.004, l / 2 - 0.004, 0.003, t - 0.003)
        pages.data.materials.append(mats["paper"])
        book = parent([cover, pages], "Book")
        book.location = (0, 0, zb)
        book.rotation_euler.z = math.radians(turn)
        books.append(book)
        zb += t
    stack = parent(books, "BookStack")
    stack.location = (-0.2, cy + 0.085, z)
    stack.rotation_euler.z = math.radians(-6)

    # The record: its sleeve upright in an oak stand, the disc slid halfway out of the open side.
    sw = 0.085
    sleeve = box("Sleeve", -sw, sw, -0.002, 0.002, 0, 2 * sw)
    plane_uv(sleeve, 0, 2)
    rec = [with_mat(sleeve, mats["sleeve"])]
    disc = cyl("Disc", 0.08, 0.0014, (0.07, 0, sw), rotation=(math.radians(90), 0, 0), vertices=48, smooth=False)
    plane_uv(disc, 0, 2)
    rec.append(with_mat(disc, mats["vinyl"]))
    record = parent(rec, "Record")
    record.location = (0, 0, 0.008)
    record.rotation_euler.x = math.radians(-8)
    stand = parent([oak(soften(box("RecordStand", -0.095, 0.095, -0.016, 0.016, 0, 0.014), 0.003, 3), 348, mats), record], "RecordStand")
    stand.location = (-0.035, cy + 0.12, z)
    stand.rotation_euler.z = math.radians(4)

    # The pan: a small cast-iron skillet, hollow, with a long handle and a helper lip.
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.066, depth=0.024, location=(0, 0, 0.012))
    skillet = bpy.context.active_object
    bm = bmesh.new()
    bm.from_mesh(skillet.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.9], context="FACES")
    bm.to_mesh(skillet.data)
    bm.free()
    wall = skillet.modifiers.new("Wall", "SOLIDIFY")
    wall.thickness = 0.0045
    wall.offset = -1
    apply_modifiers(skillet)
    skillet = soften(skillet, 0.0016, 2)
    handle = soften(box("PanHandle", 0.06, 0.135, -0.0075, 0.0075, 0.014, 0.024), 0.004, 3)
    hole = ellipsoid((0.124, 0, 0.019), (0.009, 0.004, 0.02), 12, 8, "HandleHole")
    cut = handle.modifiers.new("Hole", "BOOLEAN")
    cut.operation = "DIFFERENCE"
    cut.object = hole
    cut.solver = "EXACT"
    apply_modifiers(handle)
    bpy.data.objects.remove(hole, do_unlink=True)
    lip = ellipsoid((-0.07, 0, 0.02), (0.012, 0.016, 0.004), 14, 8, "HelperLip")
    pan = join([skillet, handle, lip], "Skillet")
    shade_smooth(pan)
    pan.data.materials.append(mats["cast_iron"])
    pan_group = parent([pan], "CastIronPan")
    pan_group.location = (-0.14, cy - 0.075, z)
    pan_group.rotation_euler.z = math.radians(-128)  # Handle toward the front left, clear of the glass and the plaque.

    # The camera: a compact rangefinder shape, leatherette body under a satin top plate. No maker's marks.
    cam = []
    cam.append(with_mat(soften(box("CameraBody", -0.05, 0.05, -0.015, 0.015, 0, 0.04), 0.004, 3), mats["leatherette"]))
    cam.append(with_mat(soften(box("TopPlate", -0.05, 0.05, -0.015, 0.015, 0.04, 0.055), 0.004, 3), mats["alu"]))
    lx, lz = 0.008, 0.026
    cam.append(cyl("LensMount", 0.019, 0.006, (lx, -0.018, lz), rotation=(math.radians(90), 0, 0), vertices=28, mat=mats["alu"]))
    cam.append(cyl("LensBarrel", 0.017, 0.022, (lx, -0.032, lz), rotation=(math.radians(90), 0, 0), vertices=28, mat=mats["leatherette"]))
    cam.append(cyl("FocusRing", 0.0175, 0.004, (lx, -0.04, lz), rotation=(math.radians(90), 0, 0), vertices=28, mat=mats["alu"]))
    cam.append(cyl("LensGlass", 0.012, 0.001, (lx, -0.0435, lz), rotation=(math.radians(90), 0, 0), vertices=24, mat=mats["lens_glass"]))
    cam.append(with_mat(box("Viewfinder", -0.042, -0.028, -0.0158, -0.0148, 0.044, 0.051), mats["lens_glass"]))
    cam.append(with_mat(box("Rangefinder", 0.03, 0.04, -0.0158, -0.0148, 0.044, 0.051), mats["lens_glass"]))
    cam.append(cyl("Shutter", 0.0042, 0.005, (0.032, 0, 0.0575), vertices=16, mat=mats["alu"]))
    cam.append(cyl("Dial", 0.0085, 0.005, (-0.03, 0, 0.0575), vertices=24, mat=mats["alu"]))
    camera = parent(cam, "Camera")
    camera.location = (0.19, cy + 0.02, z)
    camera.rotation_euler.z = math.radians(-14)

    # The empty spot: a low oak block where the shoes would stand, and a small brass plaque.
    spot = [oak(soften(box("ShoeBlock", -0.055, 0.055, -0.032, 0.032, 0, 0.01), 0.0025, 2), 349, mats)]
    plate = [with_mat(soften(box("Plaque", -0.032, 0.032, -0.0095, 0.0095, 0, 0.002), 0.0008), mats["bronze"])]
    lettering = text_mesh("PlaqueText", "Running shoes", 0.0082, mats["ink"])
    lettering.location = (0, 0, 0.0021)
    plate.append(lettering)
    plaque = pivot(parent(plate, "PlaqueFace"), (0, -0.0095, 0))
    plaque.rotation_euler.x = math.radians(34)  # Tilted up toward the visitor.
    spot.append(plaque)
    plaque.location = (0, -0.046, 0)  # Its back edge rests on the block's front edge.
    empty = parent(spot, "EmptySpot")
    empty.location = (0.07, cy - 0.085, z)
    empty.rotation_euler.z = math.radians(3)

    return parent([stack, stand, pan_group, camera, empty], "AfterHours")


# ---------------------------------------------------------------- fatherhood


def build_plinth(mats):
    """A small oak plinth, finished like the cabinets, with a linen top. Kept empty on purpose: the
    web scene gives it a warm pool of light and a card. Built at the origin, standing on z 0."""
    parts = []
    parts.append(box("PlinthBase", -0.185, 0.185, -0.185, 0.185, 0, 0.07, bevel=0.02, segments=4))
    parts.append(box("PlinthBody", -0.16, 0.16, -0.16, 0.16, 0.05, 0.72, bevel=0.028, segments=6))
    parts.append(box("PlinthCap", -0.18, 0.18, -0.18, 0.18, 0.7, 0.74, bevel=0.013, segments=4))
    parts.append(box("PlinthPanel", -0.112, 0.112, -0.172, -0.158, 0.14, 0.62, bevel=0.01, segments=3))
    for i, part in enumerate(parts):
        grain_uv(part, seed=360 + i)
    body = join(parts, "PlinthOak")
    body.data.materials.append(mats["grain"])
    shade_smooth(body)
    top = box("PlinthTop", -0.152, 0.152, -0.152, 0.152, 0.74, 0.744, bevel=0.002, segments=2)
    top.data.materials.append(mats["linen"])
    return parent([body, top], "Plinth")


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
    """Builds every exhibit specimen, the desk, the plinth and the dressing. Returns them, so the
    caller can hide them from the Blender still (they all stand in the same spot there)."""
    add_materials(mats)
    return [
        build_samples(mats),
        build_kds(mats),
        build_laptop(mats),
        build_planning(mats),
        build_after_hours(mats),
        build_desk(mats),
        build_plinth(mats),
        build_snake_plant(mats),
        build_pothos(mats),
        build_books(mats),
    ]
