"""
Пересоздаёт одежду Journey из двух деталей, как в игре Journey (Blender 5.x):
  "Плащ"    — юбка-пончо: крепится по линии груди под мышками, руки снаружи и выше неё;
  "Капюшон" — исходный капюшон "Шапка", к краю которого пришита ткань до плеч и чуть ниже:
              одна деталь от головы до плеч, кромка перекрывает верх юбки.

Запуск:
  blender -b public/model/characters.blend --python src/assets/scripts/rebuild_cloak.py -- [segments] [Journey|Traveler]

Как строится каждая деталь:
  1. Тело ставится в позу DESIGN_CLIP (idle). Для каждого кольца по высоте и угла вокруг
     корпуса берётся самая дальняя точка тела + зазор (для юбки — только корпус, без рук).
  2. Продолжение капюшона растёт из его граничного контура: вершины края общие,
     ткань плавно уходит от края к огибающей плеч и вниз.
  3. Веса скиннинга переносятся с ближайших вершин тела (юбка — только корпус,
     накидка — корпус, плечи, руки), ноги не используются.
  4. Группа PinGradient: верх следует скиннингу, низ мягко тянется к телу и качается.
  5. Геометрия переводится в позу покоя (T-поза рига) обратным скиннингом.

Предыдущие версии одежды удаляются; исходник капюшона хранится мешем "Шапка_src" (fake user).
"""
import sys
import math
import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

BODY = "Тело"
DESIGN_CLIP = "idle"
SEGMENTS = int(argv[0]) if argv else 44
CENTER_Y = 0.02
MAX_INFLUENCES = 4

SKIRT = {
    "name": "Плащ",
    "top": 1.40,          # линия груди под мышками (руки в позе покоя начинаются от ~1.26-1.65)
    "hem": 0.80,
    "rings": 16,
    "margin": 0.04,
    "flare": 0.04,        # слегка шире к подолу (0.08 выходило за опущенные руки)
    "arms": False,        # форма и веса только по корпусу — руки снаружи
    # закреплена только у груди, ниже свободно висит и качается (не обтягивает ноги)
    "pin": [(1.40, 1.0), (1.32, 1.0), (1.20, 0.25), (1.05, 0.08), (0.80, 0.0)],
    "uv": ((0.33, 0.50), (0.50, 0.66)),   # тёмно-фиолетовая заливка
    "trim": (0.025, 0.75),
}
CAPE = {
    "name": "Капюшон",
    "source": "Шапка",
    "hem": 1.30,          # чуть ниже плеч
    "shoulder": 1.50,     # от края капюшона до этой высоты — плавный переход к огибающей плеч
    "rows": [1.50, 1.43, 1.36, 1.30],
    "transition": 2,      # промежуточных рядов между краем и плечами
    "margin": 0.06,
    "flare": 0.03,
    "arms": True,
    "rings": 10, "top": 1.52,  # огибающая тела от высоты плеч: выше у тела только шея
    "head_z": (1.62, 1.74),    # выше — капюшон целиком на кости головы, ниже — веса тела
    "pin": [(1.60, 1.0), (1.42, 1.0), (1.30, 0.7)],  # мягче — в беге задирается и открывает спину
    "uv": ((0.77, 0.29), (0.77, 0.29)),   # одна точка основного цвета капюшона: диапазон задевал светлую границу острова
    "trim": (0.575, 0.35),
    "subsurf": 1,         # капюшон уже сглажен в smooth_hood
}

# Настройки под риг. Journey — rigify-кости старой модели (высоты в SKIRT/CAPE подобраны
# под неё вручную); Traveler — риг KayKit (высоты считаются от костей, fit_heights).
PROFILES = {
    "Journey": {
        "NECK_BONE": "spine.005",
        "UPPER_BODY": ("spine", "shoulder", "upper_arm", "forearm", "hand", "breast"),
        "ARM_BONES": ("upper_arm", "forearm", "hand"),
        "LOWER_ARM_BONES": ("forearm", "hand"),
        "FALLBACK_BONE": "spine.003",
        "head_bone": "spine.006",
        "source_mesh": "Шапка_src",
        "fit_heights": False,
    },
    "Traveler": {
        "NECK_BONE": "head",
        "UPPER_BODY": ("hips", "spine", "chest", "upperarm", "lowerarm", "wrist", "hand"),
        "ARM_BONES": ("upperarm", "lowerarm", "wrist", "hand"),
        "LOWER_ARM_BONES": ("lowerarm", "wrist", "hand"),
        "FALLBACK_BONE": "chest",
        "head_bone": "head",
        "source_mesh": "Шапка_src_kk",
        "fit_heights": True,
    },
}
ARMATURE = argv[1] if len(argv) > 1 else "Journey"
PROFILE = PROFILES[ARMATURE]
NECK_BONE = PROFILE["NECK_BONE"]
UPPER_BODY = PROFILE["UPPER_BODY"]
ARM_BONES = PROFILE["ARM_BONES"]
LOWER_ARM_BONES = PROFILE["LOWER_ARM_BONES"]
CAPE["head_bone"] = PROFILE["head_bone"]
CAPE["source_mesh"] = PROFILE["source_mesh"]

HOOD_SCALE = 1.0       # >1 прячет лицо глубже в капюшон
FACE_OPEN = 1.35       # лицевой вырез шире/выше вокруг своего центра — лицо видно целиком
FACE_UP = -0.06        # центр выреза ниже: овал опускается к подбородку, глаза в середине
HOOD_FORWARD = 0.0     # сдвиг вперёд выдавливал уши головы сзади
SEAM_SMOOTH = 6        # проходов сглаживания шва капюшон/накидка
BACK_FROM_Z = 1.88     # ниже этой высоты (в позе) задняя часть капюшона прижимается к спине
BACK_LIMIT = 0.16      # насколько сзади за осью шеи
FACE_SPREAD = 6        # на сколько колец соседей растекается сдвиг капюшона перед лицом
FACE_GAP = 0.02        # минимальный зазор между лицом и капюшоном спереди
TIPS_Z = 1.95          # выше — светлые кончики ушей капюшона (не перекрашиваются)
BACK_MARGIN = 0.07      # зазор накидки над спиной: больше, чем у юбки (0.04), иначе юбка вылезает сквозь неё
CHIN_COVER = 0.04      # насколько язык капюшона ниже и впереди подбородка
SMOOTH_HOOD = 2         # сглаживание исходного капюшона перед пришиванием накидки
NECK = [0.0, CENTER_Y]  # шейная кость в позе, заполняется в set_design_pose


def smoothstep(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def piecewise(points, z):
    """Линейная интерполяция по [(высота, значение)] (высоты по убыванию)."""
    if z >= points[0][0]:
        return points[0][1]
    for (z0, v0), (z1, v1) in zip(points, points[1:]):
        if z1 <= z <= z0:
            return v0 + (v1 - v0) * (z0 - z) / (z0 - z1)
    return points[-1][1]


# --- сцена ---------------------------------------------------------------------------------

def archive_old(old):
    archive = bpy.data.collections.get("_archive") or bpy.data.collections.new("_archive")
    if archive.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(archive)
    for c in list(old.users_collection):
        c.objects.unlink(old)
    archive.objects.link(old)
    old.name = f"{old.name}_old"
    bpy.context.view_layer.layer_collection.children[archive.name].exclude = True
    print(f"  {old.name} -> _archive")


def remove_object(name):
    o = bpy.data.objects.get(name)
    if o:
        mesh = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def set_design_pose(arm):
    ad = arm.animation_data
    saved = ({t.name: t.mute for t in ad.nla_tracks}, ad.action)
    ad.action = None
    for t in ad.nla_tracks:
        t.mute = t.name != DESIGN_CLIP
    bpy.context.scene.frame_set(int(ad.nla_tracks[DESIGN_CLIP].strips[0].frame_start))
    neck = arm.pose.bones[NECK_BONE].head
    NECK[:] = [neck.x, neck.y]
    return saved


def restore_pose(arm, saved):
    mutes, action = saved
    ad = arm.animation_data
    for t in ad.nla_tracks:
        t.mute = mutes[t.name]
    ad.action = action


def evaluated_coords(arm, obj, keep):
    saved = {m.name: m.show_viewport for m in obj.modifiers}
    for m in obj.modifiers:
        m.show_viewport = m.type in keep
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    mesh = ev.to_mesh()
    to_arm = arm.matrix_world.inverted() @ obj.matrix_world
    coords = [to_arm @ v.co for v in mesh.vertices]
    ev.to_mesh_clear()
    for m in obj.modifiers:
        m.show_viewport = saved[m.name]
    return coords


def body_in_pose(arm, body):
    """Вершины тела в позе (пространство арматуры), их веса по верхней части и доля рук."""
    coords = evaluated_coords(arm, body, {"ARMATURE"})
    names = {g.index: g.name for g in body.vertex_groups}
    weights, arm_share, low_share = [], [], []
    for v in body.data.vertices:
        ws, total, arms, low = {}, 0.0, 0.0, 0.0
        for g in v.groups:
            name = names[g.group]
            total += g.weight
            if name.startswith(ARM_BONES):
                arms += g.weight
            if name.startswith(LOWER_ARM_BONES):
                low += g.weight
            if g.weight > 0 and name in arm.data.bones and name.startswith(UPPER_BODY):
                ws[name] = g.weight
        weights.append(ws)
        arm_share.append(arms / total if total else 0.0)
        low_share.append(low / total if total else 0.0)
    return coords, weights, arm_share, low_share


def dense_body(arm, body, sparse, allow):
    """
    Плотные точки тела для огибающей: тело (Skin, ~260 вершин) слишком редкое — на кольцо
    попадает 7–9 точек, сзади ни одной, и радиус спины интерполировался с рук (~0.3) — горб.
    Берём тело с Subdivision 3; фильтр allow — по ближайшей исходной вершине.
    """
    sub = body.modifiers.new("_dense", "SUBSURF")
    sub.levels = 3
    order = [m.name for m in body.modifiers]
    with bpy.context.temp_override(object=body):
        bpy.ops.object.modifier_move_to_index(modifier="_dense", index=0)
    coords = evaluated_coords(arm, body, {"ARMATURE", "SUBSURF"})
    body.modifiers.remove(body.modifiers["_dense"])
    tree = KDTree(len(sparse))
    for i, co in enumerate(sparse):
        tree.insert(co, i)
    tree.balance()
    return [co for co in coords if allow(tree.find(co)[1])]


# --- форма ---------------------------------------------------------------------------------

def ring_radii(spec, coords):
    zs = [spec["top"] - (spec["top"] - spec["hem"]) * i / (spec["rings"] - 1) for i in range(spec["rings"])]
    window = max((spec["top"] - spec["hem"]) / (spec["rings"] - 1), 0.03)
    sector = 2 * math.pi / SEGMENTS * 1.5
    # Центр кольца — середина корпуса на этой высоте. С фиксированным центром (y=0.02) он
    # лежал почти на спине: сзади расстояния ~0 считались "пустыми" и заполнялись радиусом
    # с боков (руки ~0.27) — горб сзади и раздутый перед.
    radii, centers = [], []
    for z in zs:
        layer = [co for co in coords if abs(co.z - z) <= window]
        cy = (min(c.y for c in layer) + max(c.y for c in layer)) / 2 if layer else CENTER_Y
        centers.append(cy)
        ring = []
        for j in range(SEGMENTS):
            a = 2 * math.pi * j / SEGMENTS
            best = None
            for co in layer:
                dx, dy = co.x, co.y - cy
                d = (math.atan2(dx, -dy) - a + math.pi) % (2 * math.pi) - math.pi
                if abs(d) < sector:
                    best = max(best or 0.0, math.hypot(dx, dy))
            ring.append(best + spec["margin"] if best is not None else 0.0)
        radii.append(ring)
    spec["centers"] = centers

    # пустые сектора — интерполяция между ближайшими заполненными по окружности
    # (раньше подставлялся минимум по кольцу: у шеи это радиус до передней шеи ~0.2,
    # и спина накидки уходила на 20 см за спину — горб)
    for ring in radii:
        filled = [j for j, r in enumerate(ring) if r]
        if not filled:
            ring[:] = [0.15] * SEGMENTS
            continue
        for j, r in enumerate(ring):
            if r:
                continue
            prev = max((k for k in filled if k < j), default=filled[-1] - SEGMENTS)
            nxt = min((k for k in filled if k > j), default=filled[0] + SEGMENTS)
            t = (j - prev) / (nxt - prev)
            ring[j] = ring[prev % SEGMENTS] * (1 - t) + ring[nxt % SEGMENTS] * t

    # гладкая огибающая: небольшое расширение, потом размытие по окружности
    spread = max(1, SEGMENTS // 22)
    for i, ring in enumerate(radii):
        ring = [max(ring[(j + k) % SEGMENTS] for k in range(-spread, spread + 1)) for j in range(SEGMENTS)]
        for _ in range(2):
            ring = [sum(ring[(j + k) % SEGMENTS] for k in range(-spread, spread + 1)) / (2 * spread + 1)
                    for j in range(SEGMENTS)]
        radii[i] = ring
    # вниз ткань не сужается, к подолу слегка расширяется
    for i in range(1, len(radii)):
        radii[i] = [max(r, p) for r, p in zip(radii[i], radii[i - 1])]
    for i in range(len(radii)):
        t = i / (len(radii) - 1)
        radii[i] = [r + spec["flare"] * t for r in radii[i]]
    return zs, radii


def ring_positions(spec, zs, radii):
    grid = []
    for z, ring_r in zip(zs, radii):
        row = []
        for j in range(SEGMENTS):
            a = 2 * math.pi * j / SEGMENTS
            cy = spec["centers"][len(grid)]
            row.append(Vector((ring_r[j] * math.sin(a), cy - ring_r[j] * math.cos(a), z)))
        grid.append(row)
    return grid


def build_mesh(name, grid, spec):
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    rings = [[bm.verts.new(co) for co in row] for row in grid]
    hem = []
    for j, v in enumerate(rings[-1]):
        a = 2 * math.pi * j / SEGMENTS
        d = Vector((math.sin(a), -math.cos(a), 0))
        hem.append(bm.verts.new(v.co + d * 0.005 + Vector((0, 0, -0.035))))
    rings.append(hem)

    (u0, v0), (u1, v1) = spec["uv"]
    last = len(rings) - 2
    for i in range(len(rings) - 1):
        for j in range(SEGMENTS):
            k = (j + 1) % SEGMENTS
            face = bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][k], rings[i][k]))
            face.smooth = True
            for loop in face.loops:
                if i == last:
                    loop[uv].uv = spec["trim"]
                else:
                    ri = next(r for r, ring in enumerate(rings) if loop.vert in ring)
                    ci = rings[ri].index(loop.vert)
                    loop[uv].uv = (u0 + (u1 - u0) * ci / SEGMENTS, v1 - (v1 - v0) * ri / len(rings))

    bm.normal_update()
    bm.faces.ensure_lookup_table()
    f = bm.faces[len(bm.faces) // 2]
    ring = [l.vert.co for l in f.loops]
    axis = sum((v.co for v in bm.verts if abs(v.co.z - ring[0].z) < 1e-3), Vector()) / max(
        1, sum(1 for v in bm.verts if abs(v.co.z - ring[0].z) < 1e-3))
    radial = f.calc_center_median() - axis
    radial.z = 0
    if f.normal.dot(radial) < 0:
        for face in bm.faces:
            face.normal_flip()
    bm.verts.ensure_lookup_table()
    coords = [v.co.copy() for v in bm.verts]
    edges = [(e.verts[0].index, e.verts[1].index) for e in bm.edges]
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh, coords, edges


# --- скиннинг ------------------------------------------------------------------------------

def transfer_weights(coords, edges, body_coords, body_weights, allow):
    tree = KDTree(len(body_coords))
    for i, co in enumerate(body_coords):
        if body_weights[i] and allow(i):
            tree.insert(co, i)
    tree.balance()

    weights = []
    for co in coords:
        acc = {}
        for _, idx, dist in tree.find_n(co, 6):
            k = 1.0 / max(dist, 1e-4)
            for name, w in body_weights[idx].items():
                acc[name] = acc.get(name, 0.0) + w * k
        weights.append(acc)

    neighbours = [[] for _ in coords]
    for a, b in edges:
        neighbours[a].append(b)
        neighbours[b].append(a)
    for _ in range(4):
        new = []
        for i, ws in enumerate(weights):
            acc = {n: w * 2 for n, w in ws.items()}
            for nb in neighbours[i]:
                for n, w in weights[nb].items():
                    acc[n] = acc.get(n, 0.0) + w
            new.append(acc)
        weights = new

    result = []
    for ws in weights:
        top = sorted(ws.items(), key=lambda x: -x[1])[:MAX_INFLUENCES]
        total = sum(w for _, w in top)
        result.append({n: w / total for n, w in top} if total else {PROFILE["FALLBACK_BONE"]: 1.0})
    return result


def to_rest(arm, coords, weights):
    mats = {pb.name: pb.matrix @ pb.bone.matrix_local.inverted() for pb in arm.pose.bones}
    out = []
    for co, ws in zip(coords, weights):
        m = Matrix(((0,) * 4,) * 4)
        for name, w in ws.items():
            m += mats[name] * w
        out.append(m.inverted_safe() @ co)
    return out


def pose_matrices(arm):
    return {pb.name: pb.matrix @ pb.bone.matrix_local.inverted() for pb in arm.pose.bones}


def skin(co, ws, mats):
    m = Matrix(((0,) * 4,) * 4)
    for name, w in ws.items():
        m += mats[name] * w
    return m @ co


def boundary_loop(bm):
    return max(boundary_loops(bm), key=len)


def boundary_loops(bm):
    edges = [e for e in bm.edges if e.is_boundary]
    adj = {}
    for e in edges:
        a, b = e.verts
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    loops, seen = [], set()
    for start in adj:
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nxt = next((n for n in adj[cur] if n != prev and n not in seen), None)
            if nxt is None:
                break
            loop.append(nxt)
            seen.add(nxt)
            prev, cur = cur, nxt
        loops.append(loop)
    return loops


def center_at(zs, centers, z):
    return centers[min(range(len(zs)), key=lambda i: abs(zs[i] - z))]


def radius_at(zs, radii, z, a):
    """Радиус огибающей по высоте и углу (интерполяция по сетке ring_radii)."""
    zi = min(range(len(zs)), key=lambda i: abs(zs[i] - z))
    f = (a % (2 * math.pi)) / (2 * math.pi) * SEGMENTS
    j0 = int(f) % SEGMENTS
    t = f - int(f)
    return radii[zi][j0] * (1 - t) + radii[zi][(j0 + 1) % SEGMENTS] * t


def source_mesh(arm, spec):
    """
    Исходный капюшон в пространстве арматуры (поза покоя), хранится как меш "<source>_src".
    Объект в исключённой коллекции _archive не пересчитывает matrix_world, поэтому при
    первом запуске берём матрицу у живого объекта и дальше работаем только с этим мешем.
    """
    name = spec.get("source_mesh") or f"{spec['source']}_src"
    if bpy.data.meshes.get(name):
        return bpy.data.meshes[name]
    src = bpy.data.objects.get(spec["source"]) or bpy.data.objects[f"{spec['source']}_old"]
    layer = bpy.context.view_layer.layer_collection.children.get("_archive")
    was_excluded = layer.exclude if layer else None
    if layer:
        layer.exclude = False
    bpy.context.view_layer.update()
    to_arm = arm.matrix_world.inverted() @ src.matrix_world
    mesh = src.data.copy()
    mesh.name = name
    mesh.transform(to_arm)
    mesh.use_fake_user = True
    if layer:
        layer.exclude = was_excluded
    if src.name == spec["source"]:
        archive_old(src)
    return mesh


def recolor_rim(mesh, head):
    tips_z = TIPS_Z
    """После сглаживания UV у края капюшона попадают на светлую границу острова текстуры —
    по шву с накидкой шла светлая полоса. Такие грани (ниже кончиков ушей) — в основной цвет."""
    image = next((n.image for m in mesh.materials if m and m.use_nodes
                  for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image), None)
    if image is None:
        return
    w, h = image.size
    px = image.pixels[:]

    def lum(u, v):
        i = ((int(v * h) % h) * w + int(u * w) % w) * 4
        return sum(px[i:i + 3]) / 3

    uv = mesh.uv_layers.active.data
    faces = [(p, sum((uv[i].uv for i in p.loop_indices), Vector((0, 0))) / p.loop_total) for p in mesh.polygons]
    dark = [c for _, c in faces if lum(c.x, c.y) < 0.55]
    main = sum(dark, Vector((0, 0))) / len(dark)
    fixed = 0
    for p, c in faces:
        light = any(lum(uv[i].uv.x, uv[i].uv.y) >= 0.55 for i in p.loop_indices)
        if light and (head @ p.center).z < tips_z:
            for i in p.loop_indices:
                uv[i].uv = main
            fixed += 1
    print(f"  капюшон: {fixed} светлых граней у края перекрашено")


def smooth_hood(src, head, chin=None):
    """
    Подготовка исходного капюшона (48 вершин, 8 на нижнем крае):
      1. "язык" — вершина нижнего края, свисавшая на грудь (1.47 при крае ~1.70), ставится
         между соседями по краю: он давал складку и выступ под лицом;
      2. сглаживание Catmull-Clark (уровень SMOOTH_HOOD): край ~30 точек вместо 8 — накидка
         пришивается к гладкому краю, а не к восьмиугольнику.
    Возвращает временный меш (удаляется вызывающим).
    """
    mesh = src.copy()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    inv = head.inverted()
    neck_y = NECK[1]
    pivot = head @ bpy.data.objects[ARMATURE].data.bones[CAPE["head_bone"]].head_local
    for v in bm.verts:
        p = head @ v.co
        # капюшон чуть больше и вперёд: лицо уходит вглубь, снаружи — глаза в тени.
        # Просто опустить нельзя — сверху вылезают уши головы
        p = pivot + (p - pivot) * HOOD_SCALE
        p.y -= HOOD_FORWARD
        # задний низ капюшона торчал на ~20 см за шеей (спина ~5 см) — горб на лопатках:
        # всё, что сзади и ниже BACK_FROM_Z, прижимается к BACK_LIMIT за шеей
        t = min(max((BACK_FROM_Z - p.z) / 0.20, 0.0), 1.0)
        t = t * t * (3 - 2 * t)
        limit = neck_y + BACK_LIMIT
        if t and p.y > limit:
            p.y -= (p.y - limit) * t
        v.co = inv @ p
    loop = boundary_loop(bm)
    for face_loop in [l for l in boundary_loops(bm) if set(l) != set(loop)]:
        pts = [head @ v.co for v in face_loop]
        c = sum(pts, Vector()) / len(pts)
        for v, p in zip(face_loop, pts):
            q = Vector((c.x + (p.x - c.x) * FACE_OPEN, p.y, c.z + FACE_UP + (p.z - c.z) * FACE_OPEN))
            v.co = inv @ q
    fixed = 0
    for i, v in enumerate(loop):
        a, b = loop[i - 1], loop[(i + 1) % len(loop)]
        p, pa, pb = head @ v.co, head @ a.co, head @ b.co
        if p.z < min(pa.z, pb.z) - 0.08:
            target = (pa + pb) / 2
            if chin is not None:
                # язык закрывает подбородок: под ним и чуть впереди, иначе снизу видно лицо
                target = Vector((target.x, min(target.y, chin.y - CHIN_COVER), min(target.z, chin.z - CHIN_COVER)))
            v.co = inv @ target
            fixed += 1
    bm.to_mesh(mesh)
    bm.free()

    tmp = bpy.data.objects.new("_hood_tmp", mesh)
    bpy.context.scene.collection.objects.link(tmp)
    sub = tmp.modifiers.new("s", "SUBSURF")
    sub.levels = SMOOTH_HOOD
    dg = bpy.context.evaluated_depsgraph_get()
    smooth = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.meshes.remove(mesh)
    recolor_rim(smooth, head)
    log_hood = f"  капюшон: язык поправлен ({fixed}), сглажен до {len(smooth.vertices)} вершин"
    print(log_hood)
    return smooth


def clear_face(pose, face):
    """Край лицевого выреза врезался в лицо: голова местами впереди капюшона. Каждая точка
    капюшона перед лицом отодвигается вперёд, минимум на FACE_GAP от поверхности лица."""
    front_y = min(p.y for p in face)
    front = [p for p in face if p.y < front_y + 0.15]
    tree = KDTree(len(front))
    for i, p in enumerate(front):
        tree.insert(Vector((p.x, 0.0, p.z)), i)
    tree.balance()
    # нужный сдвиг вперёд по каждой вершине
    push = {}
    for v, p in pose.items():
        if p.y > front_y + 0.12:
            continue    # бока и затылок капюшона
        near = tree.find_range(Vector((p.x, 0.0, p.z)), 0.03)
        if not near:
            continue
        limit = min(front[i].y for _, i, _ in near) - FACE_GAP
        if p.y > limit:
            push[v] = p.y - limit
    # сдвиг растекается на соседей — ткань выгибается плавно, без складок у подбородка
    for _ in range(FACE_SPREAD):
        nxt = dict(push)
        for v in pose:
            nb = [push.get(e.other_vert(v), 0.0) for e in v.link_edges]
            if nb:
                nxt[v] = max(push.get(v, 0.0), 0.7 * sum(nb) / len(nb))
        push = nxt
    for v, d in push.items():
        if d > 1e-4:
            pose[v] = pose[v] - Vector((0, d, 0))
    print(f"  капюшон: выведен перед лицом, макс. сдвиг {max(push.values(), default=0):.3f}")


def build_hood_cape(arm, spec, body_coords, body_weights, mats, allow, torso_share):
    """allow(i) — вершины тела, по которым строится накидка (без предплечий и кистей:
    в атаках и беге KayKit руки ходят широко, и привязанная к ним накидка разлетается)."""
    """Капюшон + пришитое к его краю продолжение до плеч. Возвращает меш и данные для объекта."""
    face = evaluated_coords(arm, bpy.data.objects["Голова"], {"ARMATURE"})
    front = [c for c in face if c.y < min(p.y for p in face) + 0.12]
    chin = min(front, key=lambda c: c.z)
    src_mesh = smooth_hood(source_mesh(arm, spec), mats[spec["head_bone"]], chin)

    material = src_mesh.materials[0] if src_mesh.materials else None
    bm = bmesh.new()
    bm.from_mesh(src_mesh)
    bpy.data.meshes.remove(src_mesh)
    # веса "Шапки" ссылаются на индексы её групп — на новом объекте они попадут в чужие кости
    for layer in list(bm.verts.layers.deform):
        bm.verts.layers.deform.remove(layer)
    bm.verts.ensure_lookup_table()
    uv = bm.loops.layers.uv.active

    # исходные вершины капюшона: в позу жёстко по кости головы. Собственные веса "Шапки"
    # содержат плечи и руку — в позе с опущенными руками они стаскивают капюшон с головы
    head = mats[spec["head_bone"]]
    pose = {}
    for v in bm.verts:
        pose[v] = head @ v.co
    clear_face(pose, face)

    body = bpy.data.objects[BODY]
    zs, radii = ring_radii(spec, dense_body(arm, body, body_coords, allow))
    # Сзади — только корпус: плечевые части рук попадали в огибающую по диагонали, и накидка
    # на лопатках отходила от спины на 10 см (горб)
    centers = spec["centers"]
    probe = dict(spec)
    _, back = ring_radii(probe, dense_body(arm, body, body_coords, lambda i: torso_share[i] < 0.1))
    for i in range(len(radii)):
        for j in range(SEGMENTS):
            a = 2 * math.pi * j / SEGMENTS
            w = max(0.0, math.cos(a - math.pi))          # 1 точно сзади, 0 на боках
            w = min(1.0, w * 1.6)
            r = min(radii[i][j], back[i][j])
            # сзади рук нет: зазор 2 см вместо общего и без расширения к подолу
            r -= spec["margin"] - BACK_MARGIN + spec["flare"] * i / (len(radii) - 1)
            radii[i][j] = radii[i][j] * (1 - w) + r * w
    spec["centers"] = centers
    rim = boundary_loop(bm)
    rows = spec["rows"]
    # Углы колонок — равномерно по длине края в порядке обхода. По собственному углу вершины
    # края сзади шли не по порядку (край там загибается), колонки перекрещивались и накидка
    # складывалась внутрь — провал внизу сзади.
    cy = spec["centers"][0]
    pts = [pose[b] for b in rim]
    seg = [(pts[i] - pts[i - 1]).length for i in range(len(pts))]
    total = sum(seg)
    raw = [math.atan2(p.x, -(p.y - cy)) for p in pts]
    turn = sum(((raw[i] - raw[i - 1] + math.pi) % (2 * math.pi)) - math.pi for i in range(len(raw)))
    sign = 1 if turn > 0 else -1
    angles, acc = [], 0.0
    for i in range(len(pts)):
        acc += seg[i] if i else 0.0
        angles.append(raw[0] + sign * 2 * math.pi * acc / total)
    columns = []
    for b, a in zip(rim, angles):
        p = pose[b]
        d = Vector((math.sin(a), -math.cos(a), 0))
        env = lambda z: Vector((0, center_at(zs, spec["centers"], z), z)) + d * radius_at(zs, radii, z, a)
        col = []
        n = spec["transition"]
        for k in range(1, n + 1):
            col.append(p.lerp(env(rows[0]), smoothstep(k / (n + 1))))
        col += [env(z) for z in rows]
        col.append(col[-1] + d * 0.005 + Vector((0, 0, -0.035)))  # кромка
        columns.append(col)

    new_rows = [[bm.verts.new(columns[i][k]) for i in range(len(rim))] for k in range(len(columns[0]))]
    for row in new_rows:
        for v in row:
            pose[v] = v.co.copy()
    grid = [rim] + new_rows
    (u0, v0), (u1, v1) = spec["uv"]
    new_faces = []
    for k in range(len(grid) - 1):
        for i in range(len(rim)):
            j = (i + 1) % len(rim)
            f = bm.faces.new((grid[k][i], grid[k + 1][i], grid[k + 1][j], grid[k][j]))
            f.smooth = True
            new_faces.append(f)
            for loop in f.loops:
                if k == len(grid) - 2:
                    loop[uv].uv = spec["trim"]
                else:
                    kk = next(r for r, row in enumerate(grid) if loop.vert in row)
                    ii = grid[kk].index(loop.vert)
                    loop[uv].uv = (u0 + (u1 - u0) * ii / len(rim), v1 - (v1 - v0) * kk / len(grid))
    # нормали пришитой части — как у соседних граней капюшона
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))

    # Сглаживание шва (в позе): у края исходного капюшона вершины сбиты в кучки — ткань
    # стягивалась к ним, на спине была точка-вмятина. Кромка подола не двигается.
    # двигаются только край капюшона и переходные ряды: ряды по телу и подол держат высоту
    movable = list(rim) + [v for row in new_rows[:spec["transition"]] for v in row]
    for _ in range(SEAM_SMOOTH):
        nxt = {}
        for v in movable:
            nb = [e.other_vert(v) for e in v.link_edges]
            avg = sum((pose[n] for n in nb), Vector()) / len(nb)
            nxt[v] = pose[v].lerp(avg, 0.5)
        pose.update(nxt)

    bm.verts.ensure_lookup_table()
    verts = list(bm.verts)
    coords = [pose[v] for v in verts]
    edges = [(e.verts[0].index, e.verts[1].index) for e in bm.edges]
    weights = transfer_weights(coords, edges, body_coords, body_weights, allow)
    z0, z1 = spec["head_z"]
    for co, ws in zip(coords, weights):
        g = smoothstep((co.z - z0) / (z1 - z0))
        for n in ws:
            ws[n] *= 1 - g
        ws[spec["head_bone"]] = ws.get(spec["head_bone"], 0.0) + g
        top = sorted(ws.items(), key=lambda x: -x[1])[:MAX_INFLUENCES]
        total = sum(w for _, w in top)
        ws.clear()
        ws.update({n: w / total for n, w in top})

    mesh = bpy.data.meshes.new(spec["name"])
    bm.to_mesh(mesh)
    bm.free()
    return mesh, coords, weights, material


def create_object(arm, spec, mesh, coords, weights, rest, material, collections):
    for v, co in zip(mesh.vertices, rest):
        v.co = co
    mesh.materials.append(material)
    obj = bpy.data.objects.new(spec["name"], mesh)
    for c in collections:
        c.objects.link(obj)
    obj.parent = arm
    obj.matrix_parent_inverse.identity()

    groups = {}
    for i, ws in enumerate(weights):
        for name, w in ws.items():
            if name not in groups:
                groups[name] = obj.vertex_groups.new(name=name)
            groups[name].add([i], w, "REPLACE")
    pin = obj.vertex_groups.new(name="PinGradient")
    for i, co in enumerate(coords):
        w = piecewise(spec["pin"], co.z)
        if w > 0:
            pin.add([i], w, "REPLACE")

    if spec.get("subsurf"):
        sub = obj.modifiers.new("Subdivision", "SUBSURF")
        sub.levels = sub.render_levels = spec["subsurf"]
    obj.modifiers.new("Armature", "ARMATURE").object = arm
    cloth = obj.modifiers.new("Cloth", "CLOTH")
    cloth.settings.vertex_group_mass = pin.name
    cloth.collision_settings.use_collision = True
    cloth.collision_settings.use_self_collision = True
    print(f"  {spec['name']}: {len(mesh.vertices)} вершин, до {spec['hem']:.2f}, "
          f"кости {sorted(groups)}")
    return obj


def fit_heights(arm):
    """Высоты деталей от костей в позе DESIGN_CLIP (значения в SKIRT/CAPE — запасные)."""
    pb = arm.pose.bones
    shoulder = pb["upperarm.l"].head.z
    knee = pb["lowerleg.l"].head.z
    head = pb[NECK_BONE].head.z
    SKIRT["top"] = shoulder - 0.14          # линия груди под мышками
    SKIRT["hem"] = knee + 0.05          # до колена, как у Journey
    t, h = SKIRT["top"], SKIRT["hem"]
    SKIRT["pin"] = [(t, 1.0), (t - 0.10, 1.0), (t - 0.25, 0.45), (h, 0.35)]
    CAPE["rows"] = [head - d for d in (0.29, 0.36, 0.43, 0.49)]
    CAPE["hem"] = CAPE["rows"][-1]
    CAPE["shoulder"] = CAPE["rows"][0]
    CAPE["top"] = head - 0.19
    CAPE["head_z"] = (head - 0.17, head - 0.05)
    CAPE["pin"] = [(head - 0.19, 1.0), (head - 0.37, 1.0), (head - 0.49, 0.7)]
    print(f"  высоты: плечи {shoulder:.2f}, колено {knee:.2f}, голова {head:.2f}")


def apply_shift(arm):
    """Высоты в SKIRT/CAPE заданы под исходные пропорции; proportions.py опустил верх тела."""
    d = arm.get("z_shift", 0.0)
    if not d:
        return
    global BACK_FROM_Z, TIPS_Z
    TIPS_Z -= d
    for spec in (SKIRT, CAPE):
        for k in ("top", "hem", "shoulder"):
            if k in spec:
                spec[k] -= d
        spec["pin"] = [(z - d, w) for z, w in spec["pin"]]
    CAPE["rows"] = [z - d for z in CAPE["rows"]]
    CAPE["head_z"] = tuple(z - d for z in CAPE["head_z"])
    BACK_FROM_Z -= d
    print(f"  высоты одежды сдвинуты на -{d:.3f}")


def hang_skirt(coords, weights):
    """Ниже груди юбка висит от таза: веса плавно уходят на корневую кость — подол не
    изгибается вслед за позвоночником, форму задаёт только симуляция."""
    root = "spine"
    top = SKIRT["top"]
    for co, ws in zip(coords, weights):
        t = smoothstep((top - 0.08 - co.z) / 0.20)
        for n in list(ws):
            ws[n] *= 1 - t
        ws[root] = ws.get(root, 0.0) + t
        total = sum(ws.values())
        for n in ws:
            ws[n] /= total


def main():
    arm = bpy.data.objects[ARMATURE]
    body = bpy.data.objects[BODY]
    old = bpy.data.objects.get(SKIRT["name"])
    material = old.material_slots[0].material if old else bpy.data.materials.get("Clothes")
    collections = list(old.users_collection) if old else [arm.users_collection[0]]

    print("== одежда")
    # предыдущая версия одежды удаляется — её всегда можно пересоздать этим скриптом
    for name in (SKIRT["name"], CAPE["name"], "Накидка"):
        remove_object(name)
        remove_object(f"{name}_bake")
    remove_object("Шапка_bake")

    apply_shift(arm)
    saved = set_design_pose(arm)
    if PROFILE["fit_heights"]:
        fit_heights(arm)
    body_coords, body_weights, arm_share, low_share = body_in_pose(arm, body)
    mats = pose_matrices(arm)
    torso = [co for co, s in zip(body_coords, arm_share) if s < 0.3]

    torso = dense_body(arm, body, body_coords, lambda i: arm_share[i] < 0.3)
    zs, radii = ring_radii(SKIRT, torso)
    mesh, coords, edges = build_mesh(SKIRT["name"], ring_positions(SKIRT, zs, radii), SKIRT)
    weights = transfer_weights(coords, edges, body_coords, body_weights, lambda i: arm_share[i] < 0.05)
    hang_skirt(coords, weights)
    skirt = (mesh, coords, weights, to_rest(arm, coords, weights))

    mesh, coords, weights, hood_material = build_hood_cape(
        arm, CAPE, body_coords, body_weights, mats, lambda i: low_share[i] < 0.3, arm_share)
    cape = (mesh, coords, weights, to_rest(arm, coords, weights))
    restore_pose(arm, saved)

    create_object(arm, SKIRT, *skirt, material, collections)
    create_object(arm, CAPE, *cape, hood_material or material, collections)

    bpy.ops.wm.save_mainfile()
    print("== saved")


main()
