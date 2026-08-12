"""Procedurally build a FIBA Asia Cup inspired trophy in Blender.

Run from Blender's Scripting workspace.  The script creates (or replaces) the
``FIBA_ASIA_CUP`` collection and leaves unrelated scene objects untouched.

Target: Blender 4.x (also avoids APIs that commonly break on Blender 3.6).
Units: metres.  Finished trophy height: approximately 0.80 m.
"""

import math

import bpy
from mathutils import Vector


COLLECTION_NAME = "FIBA_ASIA_CUP"
SEGMENTS = 160


# -----------------------------------------------------------------------------
# Scene and data helpers
# -----------------------------------------------------------------------------


def generated_collection():
    """Return a clean collection used only by this generator."""
    collection = bpy.data.collections.get(COLLECTION_NAME)
    if collection is None:
        collection = bpy.data.collections.new(COLLECTION_NAME)
        bpy.context.scene.collection.children.link(collection)
    else:
        for obj in list(collection.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
    return collection


COLLECTION = generated_collection()


def move_to_collection(obj):
    for old_collection in list(obj.users_collection):
        old_collection.objects.unlink(obj)
    COLLECTION.objects.link(obj)
    return obj


def material(name, base_color, metallic=0.0, roughness=0.35):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


BLACK_CHROME = material("Trophy Black Chrome", (0.012, 0.016, 0.022), 0.92, 0.13)
BLACK_RIM = material("Trophy Gloss Black", (0.006, 0.008, 0.012), 0.72, 0.10)
SILVER = material("Trophy Polished Silver", (0.72, 0.78, 0.84), 1.0, 0.10)
BRIGHT_SILVER = material("Trophy Bright Lines", (0.92, 0.96, 1.0), 1.0, 0.16)
GOLD = material("Trophy Gold", (0.78, 0.48, 0.08), 1.0, 0.16)
DARK_LETTERS = material("Trophy Dark Lettering", (0.018, 0.014, 0.010), 0.55, 0.22)
FLOOR_MAT = material("Studio Floor", (0.018, 0.021, 0.027), 0.05, 0.26)


def add_bevel(obj, width=0.002, segments=3):
    modifier = obj.modifiers.new(name="Edge Softening", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"


def smooth(obj):
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True


def add_revolved(name, profile, mat, bevel=0.0015, segments=SEGMENTS):
    """Revolve a closed (radius, z) profile around the Z axis."""
    vertices = []
    faces = []
    count = len(profile)

    for segment in range(segments):
        angle = math.tau * segment / segments
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        for radius, z_value in profile:
            vertices.append((radius * cos_a, radius * sin_a, z_value))

    for segment in range(segments):
        next_segment = (segment + 1) % segments
        for index in range(count):
            next_index = (index + 1) % count
            faces.append(
                (
                    segment * count + index,
                    next_segment * count + index,
                    next_segment * count + next_index,
                    segment * count + next_index,
                )
            )

    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    COLLECTION.objects.link(obj)
    smooth(obj)
    if bevel:
        add_bevel(obj, bevel, 3)
    return obj


def add_torus(name, major_radius, minor_radius, z_value, mat):
    bpy.ops.mesh.primitive_torus_add(
        align="WORLD",
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=160,
        minor_segments=16,
        location=(0.0, 0.0, z_value),
    )
    obj = move_to_collection(bpy.context.object)
    obj.name = name
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def add_curve(name, points, bevel_depth, mat, resolution=2):
    curve_data = bpy.data.curves.new(name=f"{name}_Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = resolution
    curve_data.bevel_depth = bevel_depth
    curve_data.bevel_resolution = 3
    curve_data.resolution_u = 2
    curve_data.materials.append(mat)

    spline = curve_data.splines.new(type="NURBS")
    spline.points.add(len(points) - 1)
    for spline_point, coordinate in zip(spline.points, points):
        spline_point.co = (*coordinate, 1.0)
    spline.order_u = min(3, len(points))
    spline.use_endpoint_u = True

    obj = bpy.data.objects.new(name, curve_data)
    COLLECTION.objects.link(obj)
    return obj


def add_text(name, body, location, rotation, size, extrude, mat, align="CENTER"):
    curve = bpy.data.curves.new(name=f"{name}_Font", type="FONT")
    curve.body = body
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = extrude * 0.22
    curve.bevel_resolution = 3
    curve.materials.append(mat)

    obj = bpy.data.objects.new(name, curve)
    COLLECTION.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def point_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


# -----------------------------------------------------------------------------
# Trophy body: all dimensions are metres
# -----------------------------------------------------------------------------


# Main black pedestal, including a subtly stepped foot and sloping name plate.
base = add_revolved(
    "01_Base_Black_Chrome",
    [
        (0.150, 0.000),
        (0.158, 0.010),
        (0.153, 0.021),
        (0.137, 0.031),
        (0.119, 0.139),
        (0.104, 0.158),
        (0.038, 0.158),
        (0.038, 0.018),
    ],
    BLACK_CHROME,
    bevel=0.0025,
)

# Silver trim around the pedestal.
add_torus("02_Base_Lower_Silver_Trim", 0.151, 0.0060, 0.020, SILVER)
add_torus("03_Base_Upper_Silver_Trim", 0.111, 0.0065, 0.151, SILVER)
add_torus("04_Base_Upper_Black_Lip", 0.113, 0.0090, 0.164, BLACK_RIM)

# Flared black stem flowing out of the pedestal into the cup.
stem = add_revolved(
    "05_Stem_Black_Chrome",
    [
        (0.094, 0.165),
        (0.086, 0.185),
        (0.061, 0.230),
        (0.038, 0.296),
        (0.034, 0.350),
        (0.041, 0.392),
        (0.064, 0.438),
        (0.050, 0.445),
        (0.028, 0.400),
        (0.024, 0.330),
        (0.030, 0.260),
        (0.050, 0.190),
    ],
    BLACK_CHROME,
    bevel=0.0020,
)

# Two gold collars on the narrow stem.
add_torus("06_Stem_Gold_Ring_Lower", 0.035, 0.0032, 0.305, GOLD)
add_torus("07_Stem_Gold_Ring_Upper", 0.042, 0.0034, 0.389, GOLD)

# Hollow upper vessel. The return path on the inside gives the rim real thickness.
cup = add_revolved(
    "08_Upper_Cup_Polished_Silver",
    [
        (0.055, 0.425),
        (0.076, 0.462),
        (0.101, 0.535),
        (0.125, 0.635),
        (0.143, 0.705),
        (0.151, 0.748),
        (0.143, 0.754),
        (0.136, 0.706),
        (0.119, 0.638),
        (0.095, 0.540),
        (0.070, 0.468),
        (0.050, 0.438),
    ],
    SILVER,
    bevel=0.0013,
)

# Gold inscription band and the broad dark lip at the mouth.
gold_band = add_revolved(
    "09_Upper_Gold_Inscription_Band",
    [
        (0.136, 0.684),
        (0.149, 0.684),
        (0.154, 0.717),
        (0.143, 0.720),
    ],
    GOLD,
    bevel=0.0012,
)
add_torus("10_Upper_Black_Rim_Lower", 0.151, 0.0080, 0.731, BLACK_RIM)
add_revolved(
    "11_Upper_Black_Flared_Rim",
    [
        (0.143, 0.724),
        (0.155, 0.731),
        (0.165, 0.772),
        (0.181, 0.786),
        (0.181, 0.795),
        (0.153, 0.800),
        (0.148, 0.792),
        (0.155, 0.780),
        (0.143, 0.740),
    ],
    BLACK_RIM,
    bevel=0.0022,
)
add_torus("12_Top_Rim_Silver_Highlight", 0.171, 0.0030, 0.796, SILVER)


# -----------------------------------------------------------------------------
# Diamond lattice fitted to the tapered cup surface
# -----------------------------------------------------------------------------


LATTICE_Z_MIN = 0.465
LATTICE_Z_MAX = 0.677
LATTICE_LINES = 14
LATTICE_STEPS = 54
LATTICE_TURNS = 0.56


def cup_outer_radius(z_value):
    # A close linear fit to the visible conical area of the upper cup.
    ratio = (z_value - LATTICE_Z_MIN) / (LATTICE_Z_MAX - LATTICE_Z_MIN)
    return 0.078 + ratio * (0.132 - 0.078)


for direction, family_name in ((1.0, "Rising"), (-1.0, "Falling")):
    for line_index in range(LATTICE_LINES):
        phase = math.tau * line_index / LATTICE_LINES
        points = []
        for step in range(LATTICE_STEPS):
            t = step / (LATTICE_STEPS - 1)
            z_value = LATTICE_Z_MIN + t * (LATTICE_Z_MAX - LATTICE_Z_MIN)
            angle = phase + direction * math.tau * LATTICE_TURNS * t
            radius = cup_outer_radius(z_value) + 0.0017
            points.append(
                (radius * math.cos(angle), radius * math.sin(angle), z_value)
            )
        add_curve(
            f"13_Lattice_{family_name}_{line_index + 1:02d}",
            points,
            bevel_depth=0.00075,
            mat=BRIGHT_SILVER,
        )


# Fine silver rings visually terminate the lattice cleanly.
add_torus("14_Lattice_Bottom_Trim", cup_outer_radius(LATTICE_Z_MIN), 0.0022, LATTICE_Z_MIN, SILVER)
add_torus("15_Lattice_Top_Trim", cup_outer_radius(LATTICE_Z_MAX), 0.0022, LATTICE_Z_MAX, SILVER)


# -----------------------------------------------------------------------------
# Lettering
# -----------------------------------------------------------------------------


# Flat lettering sits slightly proud of the front (-Y) side of the pedestal.
base_text = add_text(
    "16_Base_Text_FIBA_ASIA_CUP",
    "FIBA ASIA CUP",
    location=(0.0, -0.1375, 0.077),
    rotation=(math.radians(90.0), 0.0, 0.0),
    size=0.018,
    extrude=0.0007,
    mat=BRIGHT_SILVER,
)
base_text.data.space_character = 1.15


def add_curved_band_text(text):
    """Lay individual characters around the front arc of the gold band."""
    visible_chars = [character for character in text]
    arc_width = math.radians(132.0)
    start_angle = -arc_width * 0.5
    step_angle = arc_width / max(1, len(visible_chars) - 1)
    radius = 0.1554

    for index, character in enumerate(visible_chars):
        angle = start_angle + index * step_angle
        display_character = character if character != " " else "·"
        letter = add_text(
            f"17_Band_Letter_{index + 1:02d}",
            display_character,
            location=(
                radius * math.sin(angle),
                -radius * math.cos(angle),
                0.701,
            ),
            rotation=(math.radians(90.0), 0.0, angle),
            size=0.0092,
            extrude=0.00035,
            mat=DARK_LETTERS,
        )
        if character == " ":
            letter.hide_render = True
            letter.hide_viewport = True


add_curved_band_text("INTERNATIONAL BASKETBALL")


# -----------------------------------------------------------------------------
# Studio floor, lighting and camera
# -----------------------------------------------------------------------------


bpy.ops.mesh.primitive_plane_add(size=5.0, location=(0.0, 0.0, -0.004))
floor = move_to_collection(bpy.context.object)
floor.name = "18_Studio_Floor"
floor.data.materials.append(FLOOR_MAT)


def add_area_light(name, location, energy, size, color, target=(0.0, 0.0, 0.42)):
    light_data = bpy.data.lights.new(name=f"{name}_Data", type="AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light_data.color = color
    light = bpy.data.objects.new(name, light_data)
    COLLECTION.objects.link(light)
    light.location = location
    point_at(light, target)
    return light


add_area_light(
    "19_Key_Light",
    location=(-1.15, -1.25, 1.55),
    energy=850.0,
    size=0.75,
    color=(1.0, 0.89, 0.78),
)
add_area_light(
    "20_Fill_Light",
    location=(1.15, -0.55, 1.05),
    energy=620.0,
    size=0.65,
    color=(0.72, 0.84, 1.0),
)
add_area_light(
    "21_Rim_Light",
    location=(0.15, 1.10, 1.45),
    energy=1050.0,
    size=0.55,
    color=(1.0, 0.94, 0.84),
)
add_area_light(
    "22_Top_Softbox",
    location=(0.0, 0.0, 2.1),
    energy=700.0,
    size=0.9,
    color=(1.0, 1.0, 1.0),
)


camera_data = bpy.data.cameras.new("FIBA_Trophy_Camera_Data")
camera = bpy.data.objects.new("23_FIBA_Trophy_Camera", camera_data)
COLLECTION.objects.link(camera)
camera.location = (0.92, -1.62, 0.72)
camera.data.lens = 62.0
camera.data.sensor_width = 36.0
point_at(camera, (0.0, 0.0, 0.405))
bpy.context.scene.camera = camera


# Render setup. Use the engine available in the running Blender version.
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.length_unit = "METERS"
scene.unit_settings.scale_length = 1.0
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = "//fiba_asia_cup_trophy.png"

available_engines = {
    item.identifier
    for item in scene.render.bl_rna.properties["engine"].enum_items
}
if "BLENDER_EEVEE_NEXT" in available_engines:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
elif "BLENDER_EEVEE" in available_engines:
    scene.render.engine = "BLENDER_EEVEE"

world = scene.world
if world is None:
    world = bpy.data.worlds.new("FIBA Studio World")
    scene.world = world
world.use_nodes = True
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.006, 0.008, 0.013, 1.0)
background.inputs["Strength"].default_value = 0.20

# Select the generated trophy body and leave the camera view ready for inspection.
bpy.ops.object.select_all(action="DESELECT")
base.select_set(True)
stem.select_set(True)
cup.select_set(True)
gold_band.select_set(True)
bpy.context.view_layer.objects.active = cup

print("FIBA Asia Cup inspired trophy created successfully.")
print("Overall height: approximately 0.80 m")
print("Render output:", bpy.path.abspath(scene.render.filepath))
