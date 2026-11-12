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
    """Rounds every hard edge. Hardened normals keep the flats flat, so a rounded edge reads as one
    broad, clean highlight instead of a smeared gradient across the face."""
    mod = obj.modifiers.new("Soft", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.harden_normals = True
    shade_smooth(obj)
    apply_modifiers(obj)
    return obj


def rbox(name, x0, x1, y0, y1, z0, z1, radius, segments=4, mat=None):
    """A box with intentionally rounded edges: the collectibles' basic building block."""
    radius = min(radius, 0.49 * min(x1 - x0, y1 - y0, z1 - z0))
    obj = soften(box(name, x0, x1, y0, y1, z0, z1), radius, segments)
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def rcyl(name, radius, depth, location, rotation=(0, 0, 0), edge=0.002, vertices=40, mat=None):
    """A cylinder with rounded rims."""
    obj = cyl(name, radius, depth, location, rotation=rotation, vertices=vertices, smooth=False)
    obj = soften(obj, min(edge, 0.45 * depth, 0.45 * radius), 3)
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def anchor(name, location):
    """An empty marking where the web scene pins an HTML caption (exported as a glTF node)."""
    empty = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(empty)
    empty.location = location
    return empty


def with_mat(obj, mat):
    obj.data.materials.append(mat)
    return obj


def oak(obj, seed, mats):
    """Oak for props and the desk: the cabinets' grain, which the web scene renders quieter on these
    small, near pieces (material "OakProp"), so the exhibits don't carry loud repeated stripes."""
    grain_uv(obj, seed=seed)
    obj.data.materials.append(mats["oak_prop"])
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
        "lamp_lining": principled("LampLining", srgb("#f3e2c0"), 0.9),
        "printer_slot": principled("PrinterSlot", srgb("#0d0e0f"), 0.8),
        "printer_light": principled("PrinterLight", srgb("#7fd39a"), 0.4),
        "ivory": principled("IvoryLining", srgb("#efe6d4"), 0.95),
        # The drawer discoveries. "Canvas*" faces are drawn by the web scene (text, the chart, the stamp).
        "enamel": principled("ToothEnamel", srgb("#f5efe3"), 0.35),
        "velvet": principled("Velvet", srgb("#eadfca"), 1.0),
        "kraft": principled("FolderKraft", srgb("#b08d62"), 0.85),
        "rubber": principled("StampRubber", srgb("#8d3f33"), 0.8),
        "canvas_chart": principled("CanvasChart", srgb("#ffffff"), 0.9),
        "canvas_cover": principled("CanvasCardCover", srgb("#ffffff"), 0.9),
        "canvas_inside": principled("CanvasCardInside", srgb("#ffffff"), 0.9),
        "canvas_task": principled("CanvasTask", srgb("#ffffff"), 0.9),
        "canvas_ticket": principled("CanvasTicket", srgb("#ffffff"), 0.9),
        "oak_prop": principled("OakProp", srgb("#c99f72"), 0.42, image=next(n.image for n in mats["grain"].node_tree.nodes if n.type == "TEX_IMAGE")),
        "leaf_dark": principled("LeafDark", srgb("#4f6b4a"), 0.55),
        "book_a": principled("BookTerracotta", srgb("#a4573f"), 0.8),
        "book_b": principled("BookTeal", srgb("#3f6466"), 0.8),
        "book_c": principled("BookMustard", srgb("#c19a45"), 0.8),
    }
    mats.update(new)


# ---------------------------------------------------------------- 002: the research years


def sample_tube(mats, x, fill, seed):
    """A chubby, rounded-bottom sample tube: clear glass, a ruby sample, a cream label band and a
    domed cork stopper. Built standing on z 0 at (x, 0)."""
    r, length = 0.0105, 0.07
    parts = []
    glass = join([ellipsoid((x, 0, r), (r, r, r), 28, 14, "TubeEnd"), cyl("TubeWall", r, length, (x, 0, r + length / 2), vertices=28)], "TubeGlass")
    shade_smooth(glass)
    parts.append(with_mat(glass, mats["tube_glass"]))
    s = r * 0.8
    sample = join([ellipsoid((x, 0, r), (s, s, s), 20, 12, "SampleEnd"), cyl("SampleBody", s, fill, (x, 0, r + fill / 2), vertices=20)], "Sample")
    shade_smooth(sample)
    parts.append(with_mat(sample, mats["ruby"]))
    parts.append(rcyl("TubeLabel", r * 1.04, 0.013, (x, 0, r + fill + 0.016), edge=0.0012, vertices=28, mat=mats["sample_label"]))
    top = r + length
    plug = rcyl("Stopper", r * 1.22, 0.011, (x, 0, top + 0.002), edge=0.0035, vertices=28)
    dome = ellipsoid((x, 0, top + 0.0072), (r * 1.08, r * 1.08, 0.0052), 28, 12, "StopperDome")
    stopper = join([plug, dome], "Stopper")
    shade_smooth(stopper)
    parts.append(with_mat(stopper, mats["stopper"]))
    return parts


def build_samples(mats):
    """One small composed grouping: a rounded oak rack holding three chubby sample tubes, and two glass
    slides leaning in a brass holder tucked in front of it. Warm, tidy, nothing a squeamish visitor would mind."""
    z, cy = DECK_Z, CASE_Y
    rack = []
    rack.append(oak(rbox("RackBase", -0.076, 0.076, -0.027, 0.027, 0, 0.014, 0.006), 340, mats))
    for x in (-0.068, 0.068):
        rack.append(oak(rcyl("RackPost", 0.0068, 0.052, (x, 0, 0.04), edge=0.002, vertices=24), 341, mats))
        finial = ellipsoid((x, 0, 0.068), (0.0088, 0.0088, 0.0078), 24, 12, "RackFinial")
        shade_smooth(finial)
        rack.append(oak(finial, 341, mats))
    rack.append(oak(rbox("RackRail", -0.068, 0.068, -0.016, 0.016, 0.05, 0.062, 0.0055), 342, mats))
    for i, (x, fill) in enumerate(((-0.038, 0.032), (0.0, 0.042), (0.038, 0.026))):
        rack += sample_tube(mats, x, fill, i)
    for part in rack:
        part.location.z += 0.014 if part.name.startswith(("Tube", "Sample", "Stopper")) else 0
    rack_group = parent(rack, "TubeRack")
    rack_group.location = (-0.04, cy + 0.03, z)
    rack_group.rotation_euler.z = math.radians(7)

    holder = [rbox("SlideHolder", -0.05, 0.05, -0.018, 0.018, 0, 0.014, 0.006, mat=mats["bronze"])]
    for i, y in enumerate((-0.005, 0.006)):
        slide = []
        slide.append(rbox("SlideGlass", -0.042, 0.042, -0.0008, 0.0008, 0, 0.03, 0.0007, 2, mat=mats["slide_glass"]))
        slide.append(rbox("SlideLabel", -0.042, -0.02, -0.0011, 0.0011, 0.0006, 0.0294, 0.0007, 2, mat=mats["sample_label"]))
        smear = ellipsoid((0.01 - i * 0.006, -0.001, 0.0155), (0.0145, 0.0005, 0.0068), 20, 8, "Smear")
        shade_smooth(smear)
        slide.append(with_mat(smear, mats["ruby"]))
        group = parent(slide, "Slide")
        group.location = (i * 0.004, y, 0.007)
        group.rotation_euler.x = math.radians(-18)  # Leaning back in its slot, face up to the visitor.
        holder.append(group)
    holder_group = parent(holder, "SlideStand")
    holder_group.location = (0.088, cy - 0.06, z)
    holder_group.rotation_euler.z = math.radians(-16)

    return parent([rack_group, holder_group], "Samples")


# ---------------------------------------------------------------- 004: the nearly dry marker


def build_laptop(mats):
    """An open laptop with a code review on screen, the main object: a little chunky, with soft edges
    and a visible hinge. A small whiteboard on an oak foot behind it, and the nearly dry marker lying
    uncapped on the deck in front, its cap beside it."""
    z, cy = DECK_Z, CASE_Y
    w, d, t = 0.1, 0.0675, 0.011
    base = [rbox("LaptopBase", -w, w, -d, d, 0, t, 0.0045, mat=mats["alu"])]
    keys = []
    for row in range(5):
        for col in range(12):
            x = -0.0825 + col * 0.015
            y = 0.047 - row * 0.0125
            keys.append(rbox("Key", x - 0.0058, x + 0.0058, y - 0.005, y + 0.005, t - 0.0004, t + 0.0011, 0.0011, 1))
    base.append(with_mat(join(keys, "LaptopKeys"), mats["laptop_key"]))
    base.append(rbox("Trackpad", -0.036, 0.036, -0.061, -0.02, t - 0.0003, t + 0.0003, 0.0025, 3, mat=mats["trackpad"]))
    # The hinge: a dark barrel along the back edge, the lid turning about it.
    base.append(rcyl("Hinge", 0.0042, 2 * w - 0.05, (0, d - 0.0035, t + 0.0012), rotation=(0, math.radians(90), 0), edge=0.0015, vertices=24, mat=mats["bezel"]))
    lid_t = 0.0065
    lid = [rbox("LaptopLid", -w, w, 0, lid_t, 0, 0.13, 0.003, mat=mats["alu"])]
    lid.append(rbox("LaptopBezel", -w + 0.003, w - 0.003, -0.0006, 0.0006, 0.003, 0.127, 0.0025, 3, mat=mats["bezel"]))
    display = box("LaptopScreen", -0.091, 0.091, -0.0012, -0.0002, 0.009, 0.12)
    plane_uv(display, 0, 2)
    lid.append(with_mat(display, mats["laptop_screen"]))
    lid_group = parent(lid, "Lid")
    lid_group.location = (0, d - 0.004, t + 0.001)
    lid_group.rotation_euler.x = math.radians(-14)  # Opened a little past upright, as if mid-review.
    laptop = parent(base + [lid_group], "LaptopBody")
    laptop.location = (-0.045, cy - 0.02, z)
    laptop.rotation_euler.z = math.radians(6)

    # The whiteboard: a small framed board on an oak foot, a tray along its bottom edge.
    bw, bh = 0.05, 0.072
    board = []
    face = box("Board", -bw, bw, -0.002, 0.002, 0, bh)
    plane_uv(face, 0, 2)
    board.append(with_mat(face, mats["board"]))
    rails = [
        rbox("BoardRail", -bw - 0.005, bw + 0.005, -0.0045, 0.0045, bh - 0.002, bh + 0.005, 0.0022, 3),
        rbox("BoardRail", -bw - 0.005, -bw + 0.002, -0.0045, 0.0045, 0, bh, 0.0022, 3),
        rbox("BoardRail", bw - 0.002, bw + 0.005, -0.0045, 0.0045, 0, bh, 0.0022, 3),
        rbox("BoardTray", -bw - 0.005, bw + 0.005, -0.016, 0.0045, -0.005, 0.002, 0.0022, 3),
        rbox("TrayLip", -bw - 0.005, bw + 0.005, -0.018, -0.0135, 0.0015, 0.0065, 0.0016, 2),
    ]
    board.append(with_mat(join(rails, "BoardFrame"), mats["alu"]))
    board_group = parent(board, "MiniBoard")
    board_group.rotation_euler.x = math.radians(-10)  # Leaning back in its foot.
    foot = [oak(rbox("BoardFoot", -0.054, 0.054, -0.015, 0.015, 0, 0.013, 0.005), 343, mats), board_group]
    board_group.location = (0, 0.004, 0.013)
    stand = parent(foot, "BoardStand")
    stand.location = (0.118, cy + 0.11, z)
    stand.rotation_euler.z = math.radians(-12)

    # The nearly dry marker, big enough to read at gallery distance: a cream barrel with a rounded end,
    # a red band, a short taper and a pale felt nib. Lying on the deck, uncapped.
    r = 0.0072
    m = []
    m.append(cyl("MarkerBody", r, 0.064, (0, 0, 0), rotation=(0, math.radians(90), 0), vertices=28, mat=mats["marker"]))
    end = ellipsoid((-0.032, 0, 0), (0.006, r, r), 28, 14, "MarkerEnd")
    shade_smooth(end)
    m.append(with_mat(end, mats["marker"]))
    m.append(rcyl("MarkerBand", r * 1.04, 0.009, (-0.024, 0, 0), rotation=(0, math.radians(90), 0), edge=0.0012, vertices=28, mat=mats["marker_cap"]))
    m.append(cone("MarkerTaper", r, 0.0034, 0.011, (0.0375, 0, 0), rotation=(0, math.radians(90), 0), vertices=28, mat=mats["marker"]))
    nib = ellipsoid((0.045, 0, 0), (0.0045, 0.0027, 0.0027), 16, 10, "Nib")
    shade_smooth(nib)
    m.append(with_mat(nib, mats["felt"]))
    marker = parent(m, "MarkerPen")
    marker.location = (0.112, cy - 0.08, z + r)
    marker.rotation_euler.z = math.radians(-24)

    rc = 0.0088
    c = []
    c.append(cyl("CapBody", rc, 0.032, (0, 0, 0), rotation=(0, math.radians(90), 0), vertices=28, mat=mats["marker_cap"]))
    cap_end = ellipsoid((0.016, 0, 0), (0.005, rc, rc), 28, 14, "CapEnd")
    shade_smooth(cap_end)
    c.append(with_mat(cap_end, mats["marker_cap"]))
    c.append(rbox("Clip", -0.013, 0.012, -0.0022, 0.0022, rc - 0.0012, rc + 0.0024, 0.0011, 2, mat=mats["marker_cap"]))
    cap = parent(c, "MarkerCap")
    cap.location = (0.158, cy - 0.03, z + rc)
    cap.rotation_euler.z = math.radians(-64)

    return parent([laptop, stand, marker, cap], "Laptop")


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
    # A chunky rounded frame, like a well-handled school pinboard.
    frame = [
        rbox("BoardFrame", -bw - 0.011, bw + 0.011, -0.006, 0.011, -0.011, 0.001, 0.0045, 3),
        rbox("BoardFrame", -bw - 0.011, bw + 0.011, -0.006, 0.011, bh - 0.001, bh + 0.011, 0.0045, 3),
        rbox("BoardFrame", -bw - 0.011, -bw + 0.001, -0.006, 0.011, 0, bh, 0.0045, 3),
        rbox("BoardFrame", bw - 0.001, bw + 0.011, -0.006, 0.011, 0, bh, 0.0045, 3),
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
        pin = ellipsoid((x, y - 0.002, zc), (0.0038, 0.0038, 0.0038), 16, 10, "PinHead")
        shade_smooth(pin)
        board.append(with_mat(pin, mats["bronze"]))
    for a, b in (((0, 1), (1, 2)), ((1, 2), (2, 3)), ((0, 3), (1, 2))):
        pa, pb = pins[a], pins[b]
        board.append(rod("Thread", (pa[0], pa[1] - 0.003, pa[2]), (pb[0], pb[1] - 0.003, pb[2]), 0.0007, mats["thread"], vertices=6))
    # The easel: two front legs behind the board, a ledge it stands on, a back leg.
    for x in (-0.08, 0.08):
        leg = rcyl("EaselLeg", 0.0062, bh + 0.08, (x, 0.013, (bh + 0.035 - 0.045) / 2), edge=0.003, vertices=20)
        board.append(oak(leg, 345, mats))
    board.append(oak(rbox("EaselLedge", -bw - 0.016, bw + 0.016, -0.018, 0.012, -0.024, -0.01, 0.005), 346, mats))
    easel = pivot(parent(board, "Easel"), (0, 0.013, -0.045))
    easel.location = (0, 0.013, 0)  # Legs on the deck.
    easel.rotation_euler.x = math.radians(-11)
    top = (0, 0.013 + (bh + 0.08) * math.sin(math.radians(11)), (bh + 0.08) * math.cos(math.radians(11)) - 0.005)
    back_leg = oak(rod("EaselBack", top, (0, 0.13, 0.0), 0.0052, None, vertices=16), 347, mats)
    easel_group = parent([easel, back_leg], "PlanningBoard")
    easel_group.location = (-0.045, cy + 0.035, z)

    # The flip calendar: an A-frame of two boards meeting under brass rings; the front carries the
    # pages, with three muted tabs along their edge.
    ch, cw, splay = 0.072, 0.043, math.radians(17)
    front = [rbox("CalBack", -cw, cw, 0, 0.0035, 0, ch, 0.0016, 3, mat=mats["calendar_board"])]
    front.append(rbox("CalPages", -cw + 0.002, cw - 0.002, -0.0045, 0.0, 0.002, ch - 0.004, 0.0012, 2, mat=mats["paper"]))
    page = box("CalPage", -cw + 0.0025, cw - 0.0025, -0.0052, -0.0046, 0.0025, ch - 0.0045)  # Proud of the page block, so they never z-fight.
    plane_uv(page, 0, 2)
    front.append(with_mat(page, mats["calendar_page"]))
    for i, mat in enumerate(tabs):
        front.append(rbox("CalTab", cw - 0.002, cw + 0.0065, -0.0038, -0.001, 0.012 + i * 0.016, 0.0225 + i * 0.016, 0.0012, 2, mat=mat))
    front_group = parent(front, "CalFront")
    front_group.location = (0, -ch * math.sin(splay), 0)
    front_group.rotation_euler.x = -splay
    back = [rbox("CalRear", -cw, cw, 0, 0.0035, 0, ch, 0.0016, 3, mat=mats["calendar_board"])]
    back_group = parent(back, "CalRearGroup")
    back_group.location = (0, ch * math.sin(splay) + 0.003, 0)
    back_group.rotation_euler.x = splay
    rings = []
    apex = ch * math.cos(splay)
    for x in np.linspace(-cw + 0.008, cw - 0.008, 5):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.0044, minor_radius=0.0009, major_segments=24, minor_segments=8, location=(x, 0.0015, apex - 0.001), rotation=(0, math.radians(90), 0))
        rings.append(bpy.context.active_object)
    ring_obj = with_mat(join(rings, "CalRings"), mats["bronze"])
    shade_smooth(ring_obj)
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
        # Soft, pillowy cloth boards over a cream page block, with a rounded spine on the left.
        cover = rbox("BookCover", -w / 2, w / 2, -l / 2, l / 2, 0, t, 0.0055, 4)
        cover.data.materials.append(mat)
        pages = rbox("BookPages", -w / 2 + 0.006, w / 2 + 0.0008, -l / 2 + 0.005, l / 2 - 0.005, 0.0035, t - 0.0035, 0.0012, 2)
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
    sleeve = rbox("Sleeve", -sw, sw, -0.0024, 0.0024, 0, 2 * sw, 0.0016, 3)
    plane_uv(sleeve, 0, 2)
    rec = [with_mat(sleeve, mats["sleeve"])]
    disc = soften(cyl("Disc", 0.08, 0.0018, (0.07, 0, sw), rotation=(math.radians(90), 0, 0), vertices=72, smooth=False), 0.0007, 2)
    plane_uv(disc, 0, 2)
    rec.append(with_mat(disc, mats["vinyl"]))
    record = parent(rec, "Record")
    record.location = (0, 0, 0.008)
    record.rotation_euler.x = math.radians(-8)
    stand = parent([oak(rbox("RecordStand", -0.095, 0.095, -0.017, 0.017, 0, 0.015, 0.006), 348, mats), record], "RecordStand")
    stand.location = (-0.035, cy + 0.12, z)
    stand.rotation_euler.z = math.radians(4)

    # The pan: a small cast-iron skillet, hollow, with a long handle and a helper lip.
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.066, depth=0.024, location=(0, 0, 0.012))
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
    skillet = soften(skillet, 0.0021, 3)  # A rolled rim and a soft base edge.
    handle = soften(box("PanHandle", 0.06, 0.135, -0.0078, 0.0078, 0.0135, 0.0245), 0.0045, 3)
    hole = ellipsoid((0.124, 0, 0.019), (0.009, 0.004, 0.02), 12, 8, "HandleHole")
    cut = handle.modifiers.new("Hole", "BOOLEAN")
    cut.operation = "DIFFERENCE"
    cut.object = hole
    cut.solver = "EXACT"
    apply_modifiers(handle)
    bpy.data.objects.remove(hole, do_unlink=True)
    lip = ellipsoid((-0.07, 0, 0.02), (0.012, 0.016, 0.0042), 20, 10, "HelperLip")
    pan = join([skillet, handle, lip], "Skillet")
    shade_smooth(pan)
    pan.data.materials.append(mats["cast_iron"])
    pan_group = parent([pan], "CastIronPan")
    pan_group.location = (-0.14, cy - 0.075, z)
    pan_group.rotation_euler.z = math.radians(-128)  # Handle toward the front left, clear of the glass and the plaque.

    # The camera: a compact rangefinder shape, leatherette body under a satin top plate. No maker's marks.
    cam = []
    # A chubby little rangefinder: soft corners, a satin top plate, a short rounded lens.
    cam.append(rbox("CameraBody", -0.05, 0.05, -0.016, 0.016, 0, 0.041, 0.0085, 4, mat=mats["leatherette"]))
    cam.append(rbox("TopPlate", -0.05, 0.05, -0.016, 0.016, 0.039, 0.056, 0.0072, 4, mat=mats["alu"]))
    lx, lz = 0.008, 0.026
    rx = (math.radians(90), 0, 0)
    cam.append(rcyl("LensMount", 0.0195, 0.007, (lx, -0.019, lz), rotation=rx, edge=0.0018, mat=mats["alu"]))
    cam.append(rcyl("LensBarrel", 0.017, 0.02, (lx, -0.032, lz), rotation=rx, edge=0.002, mat=mats["leatherette"]))
    cam.append(rcyl("FocusRing", 0.018, 0.005, (lx, -0.04, lz), rotation=rx, edge=0.0016, mat=mats["alu"]))
    lens = ellipsoid((lx, -0.0425, lz), (0.0125, 0.0022, 0.0125), 28, 12, "LensGlass")
    shade_smooth(lens)
    cam.append(with_mat(lens, mats["lens_glass"]))
    cam.append(rbox("Viewfinder", -0.042, -0.027, -0.0168, -0.0152, 0.0435, 0.0515, 0.0012, 2, mat=mats["lens_glass"]))
    cam.append(rbox("Rangefinder", 0.03, 0.041, -0.0168, -0.0152, 0.0435, 0.0515, 0.0012, 2, mat=mats["lens_glass"]))
    cam.append(rcyl("Shutter", 0.0045, 0.006, (0.032, 0, 0.0585), edge=0.0016, vertices=24, mat=mats["alu"]))
    cam.append(rcyl("Dial", 0.009, 0.006, (-0.03, 0, 0.0585), edge=0.0018, mat=mats["alu"]))
    camera = parent(cam, "Camera")
    camera.location = (0.19, cy + 0.02, z)
    camera.rotation_euler.z = math.radians(-14)

    # The empty spot: a low oak block where the shoes would stand, and at its front a larger brass plaque
    # leaning back toward the visitor on a little rear leg. Its words are crisp HTML in the web scene,
    # pinned to the plaque ("CaptionAnchor"), so they read at gallery distance on any screen.
    spot = [oak(rbox("ShoeBlock", -0.068, 0.068, -0.045, 0.045, 0, 0.01, 0.004, 3), 349, mats)]
    pw, ph = 0.064, 0.0165
    plate = [rbox("Plaque", -pw, pw, -ph, ph, 0, 0.0028, 0.0012, 2, mat=mats["bronze"])]
    plate.append(anchor("CaptionAnchor", (0, 0, 0.003)))
    plaque = pivot(parent(plate, "PlaqueFace"), (0, -ph, 0))
    plaque.rotation_euler.x = math.radians(52)  # Leaning back, face up to the visitor.
    plaque.location = (0, -0.044, 0.01)  # Its front edge on the block's front edge.
    leg = rod("PlaqueLeg", (0, -0.044 + 2 * ph * math.cos(math.radians(52)) - 0.002, 0.01), (0, -0.044 + 2 * ph * math.cos(math.radians(52)) - 0.002, 0.01 + 2 * ph * math.sin(math.radians(52)) - 0.001), 0.0022, mats["bronze"], vertices=12)
    spot += [plaque, leg]
    empty = parent(spot, "EmptySpot")
    empty.location = (0.07, cy - 0.075, z)
    empty.rotation_euler.z = math.radians(3)

    return parent([stack, stand, pan_group, camera, empty], "AfterHours")


# ---------------------------------------------------------------- fatherhood


def build_plinth(mats):
    """A small oak plinth, finished like the cabinets: softer and a little smaller than a cabinet, with a
    shallow ivory-lined recess in its top, a space prepared for an exhibit still to come. Kept empty on
    purpose; the web scene gives it a warm pool of light and its card. Built at the origin on z 0."""
    parts = []
    parts.append(box("PlinthBase", -0.165, 0.165, -0.165, 0.165, 0, 0.06, bevel=0.024, segments=5))
    parts.append(box("PlinthBody", -0.135, 0.135, -0.135, 0.135, 0.045, 0.62, bevel=0.036, segments=8))
    cap = box("PlinthCap", -0.157, 0.157, -0.157, 0.157, 0.605, 0.655, bevel=0.02, segments=6)
    # The recess: a rounded tray sunk 9 mm into the cap, its rim softened.
    cutter = box("RecessCutter", -0.112, 0.112, -0.112, 0.112, 0.646, 0.7, bevel=0.012, segments=4)
    carve = cap.modifiers.new("Recess", "BOOLEAN")
    carve.operation = "DIFFERENCE"
    carve.object = cutter
    carve.solver = "EXACT"
    apply_modifiers(cap)
    bpy.data.objects.remove(cutter, do_unlink=True)
    cap = soften(cap, 0.0025, 3)
    parts.append(cap)
    parts.append(box("PlinthPanel", -0.088, 0.088, -0.147, -0.133, 0.13, 0.53, bevel=0.012, segments=4))
    for i, part in enumerate(parts):
        grain_uv(part, seed=360 + i)
    body = join(parts, "PlinthOak")
    body.data.materials.clear()
    body.data.materials.append(mats["grain"])
    shade_smooth(body)
    lining = box("PlinthLining", -0.111, 0.111, -0.111, 0.111, 0.6455, 0.6475, bevel=0.0105, segments=4)
    lining.data.materials.append(mats["ivory"])
    shade_smooth(lining)
    return parent([body, lining], "Plinth")


# ---------------------------------------------------------------- 003: the first KDS


def build_kds(mats):
    """An early kitchen display on an oak stand, mid-service, with its bump bar in front: chunky
    restaurant hardware with a soft, rounded casing."""
    z, cy = DECK_Z, CASE_Y
    w, h, d = 0.25, 0.165, 0.024
    screen = []
    screen.append(rbox("Bezel", -w / 2, w / 2, -d / 2, d / 2, -h / 2, h / 2, 0.012, 5, mat=mats["bezel"]))
    # The rear housing: a smaller rounded block, so the display has some body behind the bezel.
    screen.append(rbox("Housing", -w / 2 + 0.03, w / 2 - 0.03, d / 2 - 0.004, d / 2 + 0.018, -h / 2 + 0.025, h / 2 - 0.03, 0.009, 4, mat=mats["bezel"]))
    glass = box("Screen", -w / 2 + 0.014, w / 2 - 0.014, -d / 2 - 0.0012, -d / 2 + 0.001, -h / 2 + 0.014, h / 2 - 0.018)
    plane_uv(glass, 0, 2)
    glass.data.materials.append(mats["screen"])
    screen.append(glass)
    # Two blank ticket slots on the screen, for 003's drawer: the web scene draws a ticket into each when
    # the bell rings, and hides them otherwise. Placed over the image's two empty columns.
    def screen_xz(px, py):
        return -w / 2 + 0.014 + px * (w - 0.028) / 512, h / 2 - 0.018 - py * (h - 0.032) / 320
    for n, (px0, px1, py0, py1) in enumerate(((140, 248, 187, 298), (264, 372, 199, 298)), start=1):
        (x0, z1), (x1, z0) = screen_xz(px0, py0), screen_xz(px1, py1)
        ticket = box(f"KdsTicket{n}", x0, x1, -d / 2 - 0.0022, -d / 2 - 0.0016, z0, z1)
        plane_uv(ticket, 0, 2)
        ticket.data.materials.append(mats["canvas_ticket"])
        screen.append(ticket)
    power = ellipsoid((0, -d / 2 - 0.0005, -h / 2 + 0.0085), (0.003, 0.0012, 0.003), 16, 8, "Power")
    shade_smooth(power)
    screen.append(with_mat(power, mats["key_accent"]))
    display = parent(screen, "Display")
    display.location = (0.0, cy + 0.03, z + 0.165)
    display.rotation_euler.x = math.radians(-14)  # Tilted back, as if for a cook to read.

    stand = []
    stand.append(rcyl("StandArm", 0.0125, 0.1, (0, cy + 0.05, z + 0.062), edge=0.003, vertices=32, mat=mats["bronze"]))
    collar = ellipsoid((0, cy + 0.05, z + 0.016), (0.019, 0.019, 0.007), 32, 12, "StandCollar")
    shade_smooth(collar)
    stand.append(with_mat(collar, mats["bronze"]))
    base = rbox("StandBase", -0.072, 0.072, cy - 0.012, cy + 0.092, z, z + 0.014, 0.0065)
    grain_uv(base, seed=301)
    base.data.materials.append(mats["oak_prop"])
    stand.append(base)

    # The bump bar: a chunky dark wedge whose cream keys slope toward the cook (and the visitor), the
    # first key in sage. Tilted up on two rubber feet at the back, so its key face reads from the gallery.
    bd = 0.026
    bar = [rbox("BumpBar", -0.098, 0.098, -bd, bd, 0, 0.017, 0.0075, mat=mats["bezel"])]
    keys = []
    for i in range(10):
        x = -0.0846 + i * 0.0188
        keys.append(rbox("BumpKey", x - 0.0074, x + 0.0074, -0.0125, 0.0125, 0.012, 0.0235, 0.003, 3))
    accent = keys.pop(0)
    accent.data.materials.append(mats["key_accent"])
    bump_keys = join(keys, "BumpKeys")
    bump_keys.data.materials.append(mats["keycap"])
    bar += [bump_keys, accent]
    tilt = pivot(parent(bar, "BumpTilt"), (0.0, -bd, 0.0))
    tilt.rotation_euler.x = math.radians(18)  # Key face toward the front.
    feet = [rcyl("BumpFoot", 0.0058, 0.0128, (x, 0.012, 0.0064), edge=0.002, vertices=20, mat=mats["bezel"]) for x in (-0.078, 0.078)]
    caption = anchor("CaptionAnchor", (0.0, -bd - 0.03, 0.0))  # On the deck in front: "Bump bar".
    bump = parent([tilt, caption] + feet, "Bump")
    bump.location = (0.0, cy - 0.1475, z)
    bump.rotation_euler.z = math.radians(-3)

    # A small thermal kitchen printer at the front right, clear of the bump bar: a rounded dark casing,
    # a paper slot on top, a small status light and an output tray in front. The web scene feeds the
    # chits from "ChitSlot" and lays the torn first chit at "ChitTrayAnchor".
    printer = [rbox("PrinterBody", -0.032, 0.032, -0.03, 0.03, 0, 0.044, 0.01, 5, mat=mats["bezel"])]
    printer.append(rbox("PrinterSlot", -0.026, 0.026, -0.016, -0.009, 0.041, 0.0448, 0.0025, 2, mat=mats["printer_slot"]))
    printer.append(rbox("PrinterLid", -0.028, 0.028, -0.006, 0.026, 0.043, 0.0465, 0.006, 3, mat=mats["bezel"]))
    light = ellipsoid((0.02, -0.0302, 0.03), (0.0026, 0.0012, 0.0026), 16, 8, "PrinterLight")
    shade_smooth(light)
    printer.append(with_mat(light, mats["printer_light"]))
    printer.append(anchor("ChitSlot", (0, -0.0125, 0.0448)))
    printer.append(rbox("ChitTray", -0.03, 0.03, -0.112, -0.03, 0, 0.004, 0.002, 2, mat=mats["bezel"]))
    printer.append(rbox("ChitTrayLip", -0.03, 0.03, -0.114, -0.108, 0.003, 0.009, 0.002, 2, mat=mats["bezel"]))
    printer.append(anchor("ChitTrayAnchor", (0, -0.104, 0.0045)))
    kitchen = parent(printer, "ChitPrinter")
    kitchen.scale = (1.25, 1.25, 1.25)  # Big enough for its chits to read at gallery distance.
    kitchen.location = (0.152, cy - 0.055, z)
    kitchen.rotation_euler.z = math.radians(-8)

    return parent([display] + stand + [bump, kitchen], "KDS")


# ---------------------------------------------------------------- the information desk


def banker_hood(length=0.105, depth=0.047, height=0.046):
    """The open surface of a banker's lamp shade: the top half of a superellipsoid, long along x, with
    ends that are rounded but fuller than an egg's. Built at the origin with its rim on z 0."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=40, radius=1, location=(0, 0, 0), rotation=(0, math.radians(90), 0))
    hood = bpy.context.active_object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)  # Poles at the ends, along x.
    for v in hood.data.vertices:
        x, y, z = v.co
        v.co = (math.copysign(abs(x) ** 0.55, x) * length, y * depth, z * height)
    bm = bmesh.new()
    bm.from_mesh(hood.data)
    # Cut a hair above the equator, not through it: the end poles lie on the equator, and a cut through
    # them left a sliver hanging below the rim once the glass was given thickness.
    cut = 0.03 * height
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, cut), plane_no=(0, 0, 1), clear_inner=True)
    bmesh.ops.translate(bm, verts=bm.verts[:], vec=(0, 0, -cut))
    bm.to_mesh(hood.data)
    bm.free()
    hood.name = "LampHood"
    shade_smooth(hood)
    return hood


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
    desk.data.materials.append(mats["oak_prop"])  # Supporting furniture: the quieter oak.
    shade_smooth(desk)
    leather = box("DeskLeather", -0.43, 0.43, cy - 0.22, cy + 0.17, h, h + 0.003, bevel=0.002, segments=2)
    leather.data.materials.append(mats["leather"])

    # Brass service bell: a smooth dome on a rounded base with a little plunger. Dense and smooth-shaded,
    # so its highlights are clean arcs rather than facets.
    bell = []
    bell.append(rcyl("BellBase", 0.039, 0.012, (0, 0, 0.006), edge=0.0035, vertices=64, mat=mats["bronze"]))
    dome = ellipsoid((0, 0, 0.0135), (0.033, 0.033, 0.03), 48, 24, "BellDome")
    shade_smooth(dome)
    bell.append(with_mat(dome, mats["bronze"]))
    bell.append(cyl("BellStem", 0.0026, 0.012, (0, 0, 0.048), vertices=16, mat=mats["bronze"]))
    button = ellipsoid((0, 0, 0.056), (0.0065, 0.0065, 0.0045), 24, 12, "BellButton")
    shade_smooth(button)
    bell.append(with_mat(button, mats["bronze"]))
    bell_group = parent(bell, "Bell")
    bell_group.location = (-0.24, cy - 0.12, h + 0.003)

    # A tiered brochure stand with three stacks of leaflets in different papers.
    stand = []
    for tier in range(3):
        step = rbox("BrochureTier", -0.08, 0.08, -0.02 + tier * 0.035, 0.015 + tier * 0.035, 0, 0.03 + tier * 0.03, 0.004, 3)
        grain_uv(step, seed=330 + tier)
        step.data.materials.append(mats["oak_prop"])
        stand.append(step)
    for tier, mat in enumerate((mats["leaflet_a"], mats["leaflet_b"], mats["leaflet_c"])):
        leaf = box("Leaflets", -0.06, 0.06, -0.014 + tier * 0.035, -0.006 + tier * 0.035, 0.03 + tier * 0.03, 0.105 + tier * 0.03)
        leaf.rotation_euler.x = math.radians(-8)
        leaf.data.materials.append(mat)
        stand.append(leaf)
    brochures = parent(stand, "Brochures")
    brochures.location = (0.27, cy + 0.02, h + 0.003)
    brochures.rotation_euler.z = math.radians(-10)

    # A banker's lamp: a domed brass foot and stem, and a proper banker's shade: a long, softly domed
    # green glass hood with rounded ends and a rolled rim, lined in warm opal glass. (The web scene lights
    # the lining from the bulb and gives the green glass gloss and a faint glow.)
    lamp = []
    lamp.append(rcyl("LampFoot", 0.05, 0.014, (0, 0, 0.007), edge=0.005, vertices=64, mat=mats["bronze"]))
    foot_dome = ellipsoid((0, 0, 0.014), (0.034, 0.034, 0.012), 48, 16, "LampFootDome")
    shade_smooth(foot_dome)
    lamp.append(with_mat(foot_dome, mats["bronze"]))
    lamp.append(cyl("LampStem", 0.0062, 0.19, (0, 0.02, 0.105), vertices=24, mat=mats["bronze"]))
    hood = banker_hood()
    lining = hood.copy()
    lining.data = hood.data.copy()
    bpy.context.scene.collection.objects.link(lining)
    lining.name = "LampLining"
    lining.scale = (0.96, 0.92, 0.9)  # Clear of the glass, which is solidified 2.8 mm inward.
    activate(lining)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    lining.data.materials.append(mats["lamp_lining"])
    # The glass: given thickness inward, then its rim rolled.
    glass = hood.modifiers.new("Glass", "SOLIDIFY")
    glass.thickness = 0.0028
    glass.offset = -1
    apply_modifiers(hood)
    hood = soften(hood, 0.0011, 2)
    hood.name = "LampShade"
    hood.data.materials.append(mats["lamp_glass"])
    for part in (hood, lining):
        part.location = (0, -0.004, 0.193)
        lamp.append(part)
    finial = ellipsoid((0, -0.004, 0.193 + 0.046), (0.0062, 0.0062, 0.005), 24, 12, "LampFinial")
    shade_smooth(finial)
    lamp.append(with_mat(finial, mats["bronze"]))
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


# ---------------------------------------------------------------- the drawer discoveries
#
# One small set of props per cabinet drawer, each built around its own origin: the drawer's floor, 9 cm in
# from its front, front toward -Y. The web scene parents each into its case's drawer and animates the named
# nodes (lifts, hinges, the bell's plunger, the stamp, the task cards). Closed, everything stays below the
# drawer's rim (10 cm); the lifts are hidden inside the drawer.


def face(name, x0, x1, y0, y1, z, mat):
    """A thin textured face lying in the XY plane, UVs across its bounds (read from -Y)."""
    obj = box(name, x0, x1, y0, y1, z, z + 0.0004)
    plane_uv(obj, 0, 1)
    obj.data.materials.append(mat)
    return obj


TRAY_TOP = 0.02  # Where a discovery's tray top rests, above the drawer floor, with the drawer shut.


def on_tray(n, props, half_w, half_d, mats):
    """A discovery on its oak tray, over a short brass column. The scene lifts "DiscoveryLift" (the tray
    and its props) clear of the drawer front, and stretches "DiscoveryColumn" up from the drawer floor
    beneath it, so it rises out of the drawer like a little museum lift."""
    tray = oak(rbox("DiscoveryTray", -half_w, half_w, -half_d, half_d, TRAY_TOP - 0.012, TRAY_TOP, 0.004), 380 + n, mats)
    for prop in props:
        prop.location.z += TRAY_TOP
    lift = parent([tray] + props, "DiscoveryLift")
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.011, depth=TRAY_TOP - 0.012, location=(0, 0, (TRAY_TOP - 0.012) / 2))
    column = bpy.context.active_object
    column.name = "DiscoveryColumn"
    activate(column)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")  # Its foot, so the scene can stretch it upward.
    shade_smooth(column)
    column.data.materials.append(mats["bronze"])
    return parent([lift, column], f"Discovery{n}")


def molar():
    """A cute, stylized molar as one continuous form: a softly squared crown with four cusps worked into
    its top and a shallow cross groove, a gentle waist below the crown, and two long roots that flow out of
    it, taper to rounded tips and part around a clear central split. Volumes are fused by a voxel remesh and
    smoothed well, so there's no seam between crown and roots; the split and groove are carved."""
    parts = []
    # The crown: a superellipsoid, squarish in plan and softly rounded.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=1, location=(0, 0, 0))
    crown = bpy.context.active_object
    for v in crown.data.vertices:
        x, y, z = v.co
        # Squared top, rounder underside, so it flows into the waist instead of sitting on it like a lid.
        zz = math.copysign(abs(z) ** 0.8, z) if z > 0 else z
        v.co = (math.copysign(abs(x) ** 0.62, x) * 0.0215, math.copysign(abs(y) ** 0.62, y) * 0.0175, zz * 0.0135 + 0.05)
    parts.append(crown)
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(ellipsoid((sx * 0.0088, sy * 0.0068, 0.0598), (0.0102, 0.0088, 0.0042), 24, 16, "Cusp"))
    # The waist: narrower than the crown, carrying it down into the roots.
    parts.append(ellipsoid((0, 0, 0.04), (0.0178, 0.0148, 0.0125), 32, 20, "Waist"))
    # Two roots, each one tapered, gently bent form from inside the waist to a rounded tip.
    for sx in (-1, 1):
        root = ellipsoid((0, 0, 0), (0.0088, 0.0094, 0.0215), 32, 24, "Root")
        for v in root.data.vertices:
            x, y, z = v.co
            u = (0.0215 - z) / 0.043  # 0 at the top, 1 at the tip.
            taper = 1.0 - 0.34 * u
            v.co = (x * taper + sx * 0.0075 * u * u, y * taper, z)
        root.location = (sx * 0.0098, 0, 0.0215)
        activate(root)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        parts.append(root)
    tooth = join(parts, "Tooth")
    merge = tooth.modifiers.new("Merge", "REMESH")
    merge.mode = "VOXEL"
    merge.voxel_size = 0.0007
    apply_modifiers(tooth)
    # The central split between the roots, and the chewing groove: carved.
    cutters = [
        ellipsoid((0, 0, 0.004), (0.0046, 0.03, 0.022), 24, 16, "Split"),
        ellipsoid((0, 0, 0.0655), (0.019, 0.0018, 0.0028), 24, 12, "Groove"),
        ellipsoid((0, 0, 0.0655), (0.0018, 0.015, 0.0028), 24, 12, "Groove"),
    ]
    for cutter in cutters:
        carve = tooth.modifiers.new("Carve", "BOOLEAN")
        carve.operation = "DIFFERENCE"
        carve.object = cutter
        carve.solver = "EXACT"
        try:
            apply_modifiers(tooth)
        except RuntimeError:
            tooth.modifiers.remove(carve)
        bpy.data.objects.remove(cutter, do_unlink=True)
    soft = tooth.modifiers.new("Soft", "REMESH")
    soft.mode = "VOXEL"
    soft.voxel_size = 0.0008
    smooth = tooth.modifiers.new("Smooth", "LAPLACIANSMOOTH")
    smooth.iterations = 18
    smooth.lambda_factor = 0.8
    smooth.use_volume_preserve = True
    decimate = tooth.modifiers.new("Decimate", "DECIMATE")
    decimate.ratio = 0.3
    apply_modifiers(tooth)
    tooth.data.materials.clear()
    shade_smooth(tooth)
    return tooth


def build_tooth(mats):
    """001: a small, smoothly sculpted molar standing upright on its roots on an ivory cushion, turned so
    its crown-and-roots silhouette faces the gallery, with a small paper tag."""
    props = [rbox("Cushion", -0.05, 0.05, -0.038, 0.038, 0, 0.016, 0.0075, 4, mat=mats["velvet"])]
    tooth = molar()
    tooth.data.materials.append(mats["enamel"])
    tooth.location = (-0.004, 0.004, 0.0145)  # Root tips just into the velvet.
    tooth.rotation_euler = (math.radians(3), 0, math.radians(-6))  # Upright, its silhouette to the visitor.
    props.append(tooth)
    tag = rbox("ToothTag", -0.013, 0.013, -0.0075, 0.0075, 0, 0.0012, 0.0012, 2, mat=mats["sample_label"])
    tag.location = (0.035, -0.027, 0.0162)
    tag.rotation_euler.z = math.radians(18)
    props.append(tag)
    return on_tray(1, props, 0.06, 0.046, mats)


def build_folder(mats):
    """002: an archived-results folder lying flat on its tray; the scene stands it up and opens its cover
    on the chart (drawn on "ChartPage")."""
    fw, fl = 0.09, 0.066  # half width, half length
    stand = [rbox("FolderBack", -fw, fw, -fl, fl, 0, 0.002, 0.0015, 2, mat=mats["kraft"])]
    stand.append(face("ChartPage", -fw + 0.005, fw - 0.005, -fl + 0.005, fl - 0.005, 0.0021, mats["canvas_chart"]))
    cover = [rbox("FolderCover", -fw, fw, -fl, fl, 0.0028, 0.0046, 0.0015, 2, mat=mats["kraft"])]
    cover.append(rbox("FolderLabel", -0.04, 0.04, 0.026, 0.046, 0.0046, 0.0052, 0.001, 2, mat=mats["sample_label"]))
    cover.append(rbox("FolderTab", 0.028, 0.072, fl, fl + 0.011, 0.0028, 0.0046, 0.002, 2, mat=mats["kraft"]))
    hinge = pivot(parent(cover, "FolderHinge"), (-fw, 0, 0.0037))
    stand.append(hinge)
    folder = pivot(parent(stand, "FolderStand"), (0, -fl, 0))
    return on_tray(2, [folder], 0.1, 0.04, mats)


def build_drawer_bell(mats):
    """003: a small brass service bell; its plunger ("BellPlunger") presses."""
    props = [rcyl("DrawerBellBase", 0.031, 0.009, (0, 0, 0.0045), edge=0.003, vertices=48, mat=mats["bronze"])]
    dome = ellipsoid((0, 0, 0.009), (0.026, 0.026, 0.023), 48, 24, "DrawerBellDome")
    shade_smooth(dome)
    props.append(with_mat(dome, mats["bronze"]))
    plunger = [cyl("PlungerStem", 0.0022, 0.009, (0, 0, 0.0355), vertices=16, mat=mats["bronze"])]
    button = ellipsoid((0, 0, 0.0412), (0.0055, 0.0055, 0.0038), 24, 12, "PlungerButton")
    shade_smooth(button)
    plunger.append(with_mat(button, mats["bronze"]))
    props.append(parent(plunger, "BellPlunger"))
    return on_tray(3, props, 0.045, 0.042, mats)


def build_card(mats):
    """004: a folded card lying flat; the scene stands it up, and opens its cover ("CardHinge") on request.
    Its cover and inside faces are drawn by the scene."""
    cw, cl = 0.06, 0.042
    stand = [rbox("CardBack", -cw, cw, -cl, cl, 0, 0.0016, 0.001, 2, mat=mats["paper"])]
    stand.append(face("CardInside", -cw + 0.004, cw - 0.004, -cl + 0.004, cl - 0.004, 0.0017, mats["canvas_inside"]))
    cover = [rbox("CardCoverBoard", -cw, cw, -cl, cl, 0.0024, 0.004, 0.001, 2, mat=mats["paper"])]
    cover.append(face("CardCoverFace", -cw + 0.003, cw - 0.003, -cl + 0.003, cl - 0.003, 0.0041, mats["canvas_cover"]))
    hinge = pivot(parent(cover, "CardHinge"), (-cw, 0, 0.002))
    stand.append(hinge)
    card = pivot(parent(stand, "CardStand"), (0, -cl, 0))
    card.location.x = 0.03  # Opens to the left, so it sits a little right of centre.
    return on_tray(4, [card], 0.09, 0.03, mats)


def build_stamp_station(mats):
    """005: a small slanted oak board with a tray for finished cards (left), four task cards (centre)
    and a rubber stamp (right). The scene moves the stamp and slides each stamped card to the tray."""
    board = [oak(rbox("StampBoardTop", -0.135, 0.135, -0.05, 0.05, 0, 0.008, 0.004), 372, mats)]
    lips = [
        rbox("TrayLip", -0.128, -0.04, -0.046, -0.04, 0.008, 0.014, 0.002, 2),
        rbox("TrayLip", -0.128, -0.04, 0.04, 0.046, 0.008, 0.014, 0.002, 2),
        rbox("TrayLip", -0.128, -0.122, -0.046, 0.046, 0.008, 0.014, 0.002, 2),
    ]
    board.append(with_mat(join(lips, "TrayLips"), mats["bronze"]))
    for n in range(4):
        z = 0.008 + (3 - n) * 0.0016  # Card 1 on top.
        card = [rbox(f"TaskCardBody{n + 1}", -0.032, 0.032, -0.022, 0.022, z, z + 0.0014, 0.0008, 2, mat=mats["paper"])]
        card.append(face(f"TaskFace{n + 1}", -0.03, 0.03, -0.02, 0.02, z + 0.00145, mats["canvas_task"]))
        board.append(parent(card, f"TaskCard{n + 1}"))
    stamp = [rbox("StampPad", -0.017, 0.017, -0.013, 0.013, 0.008, 0.012, 0.0015, 2, mat=mats["rubber"])]
    stamp.append(oak(rbox("StampBlock", -0.018, 0.018, -0.014, 0.014, 0.012, 0.024, 0.0035), 373, mats))
    stamp.append(rcyl("StampNeck", 0.0058, 0.016, (0, 0, 0.031), edge=0.002, vertices=20, mat=mats["bronze"]))
    knob = ellipsoid((0, 0, 0.044), (0.0115, 0.0115, 0.0095), 32, 16, "StampKnob")
    shade_smooth(knob)
    stamp.append(oak(knob, 374, mats))
    for part in stamp:
        part.location.x += 0.098
    board.append(parent(stamp, "Stamp"))
    tilt = pivot(parent(board, "StampBoard"), (0, -0.05, 0))
    tilt.rotation_euler.x = math.radians(28)  # Leaning back, face up to the visitor.
    return on_tray(5, [tilt], 0.14, 0.05, mats)


def build_book_stack(mats):
    """006: nine chunky rounded books ("ListBook1" to "ListBook9"), each with its origin at its centre so
    the scene can stack, add, wobble and spill them; it poses every one. A wider tray to hold the pile."""
    books = []
    colors = (mats["book_slate"], mats["book_a"], mats["book_oat"], mats["book_b"], mats["book_c"], mats["book_olive"])
    t = 0.016
    for n in range(9):
        w, l = 0.06 - (n % 3) * 0.004, 0.044 - (n % 2) * 0.003
        cover = rbox("ListCover", -w, w, -l, l, -t / 2, t / 2 - 0.0006, 0.005, 4, mat=colors[n % len(colors)])
        pages = rbox("ListPages", -w + 0.005, w + 0.0008, -l + 0.004, l - 0.004, -t / 2 + 0.003, t / 2 - 0.0036, 0.0012, 2, mat=mats["paper"])
        book = parent([cover, pages], f"ListBook{n + 1}")
        book.location.z = t / 2 + n * t
        books.append(book)
    return on_tray(6, books, 0.11, 0.058, mats)


def build_discoveries(mats):
    return [build_tooth(mats), build_folder(mats), build_drawer_bell(mats), build_card(mats), build_stamp_station(mats), build_book_stack(mats)]


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
        *build_discoveries(mats),
    ]
