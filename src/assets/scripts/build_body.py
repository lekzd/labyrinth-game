"""
Симметричное тело Journey в T-позе (Blender 5.x). Запускать после straighten_rest.py.

Запуск:
  blender -b public/model/characters.blend --python src/assets/scripts/build_body.py -- [-X|X]
Дальше: rebuild_cloak.py -> экспорт (bake_cloth.py + export_journey.py).

Что делает:
  1. "Тело" строится заново по костям Skin-модификатором: тонкие конечности, острые кончики ног,
     округлые окончания рук, строго симметрично. Веса — автоматические, веса кисти переносятся
     на предплечье (рука не загибается крюком при сгибе запястья), затем чистятся: без влияния
     костей чужой стороны, не больше 4 костей на вершину, сумма 1.
  2. "Голова", "Глаза" и исходник капюшона "Шапка_src" переводятся в пространство арматуры,
     центрируются по X и зеркалятся по одной половине (SIDE).
Исходники хранятся как меши "<имя>_src" (fake user) — повторный запуск строит от них.
"""
import sys
import bmesh
import bpy
from mathutils import Matrix, Vector

argv = [a for a in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []) if not a.startswith("--")]
SIDE = argv[0] if argv else "-X"   # направление симметризации: "-X" копирует +X половину на -X, "X" наоборот

ARMATURE = "Journey"
NO_DEFORM = ("breast", "pelvis", "foot", "toe", "heel", "weapon")   # у тела нет этих частей
HAND_TO_FOREARM = True

# (кость, точка, радиус): head/tail кости, floor — под концом кости на уровне пола
TORSO_Y = 0.95          # корпус почти круглый: сбоку не плоский
CHAINS = [
    # позвоночник; "arms" — узел на высоте плеч, из него горизонтально выходят руки
    [("spine", "head", 0.12), ("spine.001", "head", 0.125), ("spine.002", "head", 0.13),
     ("spine.003", "head", 0.13), ("spine.003", "arms", 0.12), ("spine.004", "head", 0.07),
     ("spine.005", "head", 0.05)],
    [("thigh.L", "head", 0.07), ("thigh.L", "tail", 0.045), ("shin.L", "tail", 0.022), ("shin.L", "floor", 0.004)],
    [("thigh.R", "head", 0.07), ("thigh.R", "tail", 0.045), ("shin.R", "tail", 0.022), ("shin.R", "floor", 0.004)],
    # руки — прямо от корпуса, без подъёма к кости shoulder (давал горб у шеи)
    [("upper_arm.L", "head", 0.05), ("forearm.L", "head", 0.04),
     ("hand.L", "head", 0.03), ("hand.L", "mid", 0.024), ("hand.L", "tail", 0.012)],
    [("upper_arm.R", "head", 0.05), ("forearm.R", "head", 0.04),
     ("hand.R", "head", 0.03), ("hand.R", "mid", 0.024), ("hand.R", "tail", 0.012)],
]
# начало цепочки пришивается к точке позвоночника
LINKS = {1: ("spine", "head"), 2: ("spine", "head"), 3: ("spine.003", "arms"), 4: ("spine.003", "arms")}
TORSO_BONES = ("spine",)
# Низ головы (челюсть/шея) торчал из-под капюшона тёмным полумесяцем: всё ниже JAW_Z (над
# низом головы, в позе покоя) сужается к оси кости головы до JAW_MIN
JAW_Z = 0.16
JAW_MIN = 0.55
# Голова целиком чуть меньше капюшона: уши головы протыкали его верхушку
HEAD_SCALE = 0.86
# У головы свои уши, их кончики протыкали уши капюшона: верх головы выше EAR_FROM (доля высоты)
# сжимается по высоте до EAR_KEEP — под капюшоном всё равно не видно
EAR_FROM = 0.62
EAR_KEEP = 0.35


def log(msg):
    print(f"  {msg}")


def point(arm, bone, where):
    b = arm.data.bones[bone]
    if where == "head":
        return b.head_local.copy()
    if where == "tail":
        return b.tail_local.copy()
    if where == "mid":
        return b.head_local.lerp(b.tail_local, 0.5)
    if where == "arms":
        # точка на оси кости на высоте плечевых суставов
        z = arm.data.bones["upper_arm.L"].head_local.z
        t = (z - b.head_local.z) / (b.tail_local.z - b.head_local.z)
        return b.head_local.lerp(b.tail_local, t)
    if where == "floor":
        return Vector((b.tail_local.x, b.tail_local.y, 0.0))
    raise ValueError(where)


def src_mesh(obj, arm):
    """Исходник меша в пространстве арматуры (сохраняется при первом запуске)."""
    name = f"{obj.name}_src"
    src = bpy.data.meshes.get(name)
    if src is None:
        # данные меша напрямую: new_from_object теряет веса вершин
        src = obj.data.copy()
        mirror = next((m for m in obj.modifiers if m.type == "MIRROR" and m.show_viewport), None)
        if mirror:
            bm = bmesh.new()
            bm.from_mesh(src)
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            bmesh.ops.mirror(bm, geom=geom, axis="X", merge_dist=mirror.merge_threshold)
            bm.to_mesh(src)
            bm.free()
        src.transform(arm.matrix_world.inverted() @ obj.matrix_world)
        src.name = name
        src.use_fake_user = True
        src["groups"] = [g.name for g in obj.vertex_groups]
    return src


def symmetric_copy(src, dx):
    mesh = src.copy()
    mesh.transform(Matrix.Translation((dx, 0, 0)))
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.symmetrize(bm, input=bm.verts[:] + bm.edges[:] + bm.faces[:], direction=SIDE, dist=1e-4)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def mean_x(mesh):
    return sum(v.co.x for v in mesh.vertices) / len(mesh.vertices)


def replace_mesh(obj, mesh, groups):
    # группы — до подмены меша: clear() стирает веса у текущего меша объекта
    obj.vertex_groups.clear()
    for g in groups:
        obj.vertex_groups.new(name=g)
    old = obj.data
    obj.data = mesh
    mesh.name = obj.name
    obj.matrix_parent_inverse.identity()
    obj.matrix_basis.identity()
    for m in list(obj.modifiers):
        if m.type == "MIRROR":
            obj.modifiers.remove(m)
    if old.users == 0:
        bpy.data.meshes.remove(old)


def shrink_jaw(mesh, arm):
    axis = arm.data.bones["spine.006"]
    bottom = min(v.co.z for v in mesh.vertices)
    top = bottom + JAW_Z
    for v in mesh.vertices:
        if v.co.z >= top:
            continue
        t = (top - v.co.z) / JAW_Z
        k = 1 - (1 - JAW_MIN) * t * t * (3 - 2 * t)
        c = axis.head_local.lerp(axis.tail_local, max(0.0, (v.co.z - axis.head_local.z) / (axis.tail_local.z - axis.head_local.z)))
        v.co.x = c.x + (v.co.x - c.x) * k
        v.co.y = c.y + (v.co.y - c.y) * k
    log(f"голова: низ ({bottom:.2f}..{top:.2f}) сужен до {JAW_MIN}")


def head_and_hood(arm):
    head = bpy.data.objects["Голова"]
    eyes = bpy.data.objects["Глаза"]
    head_src = src_mesh(head, arm)
    eyes_src = src_mesh(eyes, arm)
    dx = -mean_x(head_src)

    head_mesh = symmetric_copy(head_src, dx)
    shrink_jaw(head_mesh, arm)
    pivot = sum((v.co for v in head_mesh.vertices), Vector()) / len(head_mesh.vertices)
    shrink = Matrix.Translation(pivot) @ Matrix.Scale(HEAD_SCALE, 4) @ Matrix.Translation(-pivot)
    head_mesh.transform(shrink)
    zs = [v.co.z for v in head_mesh.vertices]
    cut = min(zs) + (max(zs) - min(zs)) * EAR_FROM
    for v in head_mesh.vertices:
        if v.co.z > cut:
            v.co.z = cut + (v.co.z - cut) * EAR_KEEP
    replace_mesh(head, head_mesh, head_src["groups"])
    # глаза уже зеркальные (Mirror), просто центрируем их пару
    eyes_mesh = eyes_src.copy()
    eyes_mesh.transform(Matrix.Translation((-mean_x(eyes_src), 0, 0)))
    eyes_mesh.transform(shrink)   # глаза вместе с головой
    replace_mesh(eyes, eyes_mesh, eyes_src["groups"])

    hood_orig = bpy.data.meshes.get("Шапка_src_orig")
    if hood_orig is None:
        hood_orig = bpy.data.meshes["Шапка_src"]
        hood_orig.name = "Шапка_src_orig"
    old = bpy.data.meshes.get("Шапка_src")
    if old:
        bpy.data.meshes.remove(old)
    hood = symmetric_copy(hood_orig, dx)
    hood.name = "Шапка_src"
    hood.use_fake_user = True
    log(f"голова/капюшон: сдвиг {dx:+.3f}, половина {SIDE}; глаза центрированы")


def clean_weights(body, arm):
    """Без влияния костей чужой стороны, максимум 4 кости на вершину (как в glTF), сумма = 1."""
    to_arm = arm.matrix_world.inverted() @ body.matrix_world
    groups = {g.index: g for g in body.vertex_groups}
    cross = 0
    for v in body.data.vertices:
        x = (to_arm @ v.co).x
        ws = [(g.group, g.weight) for g in v.groups]
        keep = []
        for gi, w in ws:
            name = groups[gi].name
            if (name.endswith(".R") and x > 0.01) or (name.endswith(".L") and x < -0.01):
                cross += 1
                continue
            keep.append((gi, w))
        keep = sorted(keep, key=lambda t: -t[1])[:4]
        total = sum(w for _, w in keep) or 1.0
        for gi, _ in ws:
            groups[gi].remove([v.index])
        for gi, w in keep:
            groups[gi].add([v.index], w / total, "REPLACE")
    log(f"веса: убрано влияний чужой стороны {cross}, оставлено ≤4 на вершину, нормировано")


def build_body(arm):
    body = bpy.data.objects["Тело"]
    material = body.material_slots[0].material if body.material_slots else None
    head = bpy.data.objects["Голова"]
    uv_src = head.data.uv_layers.active.data
    u = sum(d.uv.x for d in uv_src) / len(uv_src)
    v = sum(d.uv.y for d in uv_src) / len(uv_src)

    joints, radii = {}, {}
    bm = bmesh.new()

    def vertex(p, r=None):
        key = tuple(round(c, 4) for c in p)
        if key not in joints:
            joints[key] = bm.verts.new(p)
            radii[key] = r
        return joints[key]

    for index, chain in enumerate(CHAINS):
        prev = vertex(point(arm, *LINKS[index])) if index in LINKS else None
        for bone, where, r in chain:
            cur = vertex(point(arm, bone, where), r)
            if prev is not None and prev is not cur:
                bm.edges.new((prev, cur))
            prev = cur

    mesh = bpy.data.meshes.new("Тело")
    bm.to_mesh(mesh)
    bm.free()
    old = body.data
    body.data = mesh
    body.matrix_parent_inverse.identity()
    body.matrix_basis.identity()
    body.vertex_groups.clear()
    for m in list(body.modifiers):
        body.modifiers.remove(m)
    if old.users == 0 and not old.use_fake_user:
        bpy.data.meshes.remove(old)

    skin = body.modifiers.new("Skin", "SKIN")
    skin.use_smooth_shade = True
    layer = mesh.skin_vertices[0].data
    for i, vert in enumerate(mesh.vertices):
        r = radii[tuple(round(c, 4) for c in vert.co)]
        torso = abs(vert.co.x) < 0.01
        layer[i].radius = (r, r * TORSO_Y) if torso else (r, r)
    layer[0].use_root = True
    with bpy.context.temp_override(object=body, active_object=body):
        bpy.ops.object.modifier_apply(modifier="Skin")

    mesh = body.data
    if material:
        mesh.materials.append(material)
    uv = mesh.uv_layers.new(name="UVMap")
    for d in uv.data:
        d.uv = (u, v)

    for b in arm.data.bones:
        if b.name.startswith(NO_DEFORM):
            b.use_deform = False
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    body.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    # меш задан в пространстве арматуры, а parent_set компенсирует её масштаб — сбрасываем
    body.matrix_parent_inverse.identity()
    body.matrix_basis.identity()

    if HAND_TO_FOREARM:
        for side in ("L", "R"):
            hand = body.vertex_groups.get(f"hand.{side}")
            fore = body.vertex_groups.get(f"forearm.{side}") or body.vertex_groups.new(name=f"forearm.{side}")
            if not hand:
                continue
            for vtx in mesh.vertices:
                w = next((g.weight for g in vtx.groups if g.group == hand.index), 0.0)
                if w:
                    cur = next((g.weight for g in vtx.groups if g.group == fore.index), 0.0)
                    fore.add([vtx.index], min(1.0, cur + w), "REPLACE")
            body.vertex_groups.remove(hand)

    clean_weights(body, arm)

    sub = body.modifiers.new("Subdivision", "SUBSURF")
    sub.levels = sub.render_levels = 1
    body.modifiers.move(len(body.modifiers) - 1, 0)
    col = body.modifiers.new("Collision", "COLLISION")
    missing = sum(1 for vtx in mesh.vertices if not vtx.groups)
    log(f"Тело: {len(mesh.vertices)} вершин, без весов {missing}, группы {sorted(g.name for g in body.vertex_groups)}")


def main():
    print("== тело")
    arm = bpy.data.objects[ARMATURE]
    ad = arm.animation_data
    for t in ad.nla_tracks:
        t.mute = True
    ad.action = None
    bpy.context.scene.frame_set(1)
    if not bpy.data.meshes.get("Тело_orig"):
        o = bpy.data.objects["Тело"].data.copy()
        o.name = "Тело_orig"
        o.use_fake_user = True
    head_and_hood(arm)
    build_body(arm)
    bpy.ops.wm.save_mainfile()
    print("== saved")


main()
