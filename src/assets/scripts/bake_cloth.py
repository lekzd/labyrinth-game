"""
Запекает симуляцию ткани в shape keys по каждому NLA-клипу (Blender 5.x).
Файл не сохраняется: запекание — часть экспорта.

Экспорт персонажа целиком (запекание + GLB) одной командой:
  blender -b public/model/characters.blend --python src/assets/scripts/bake_cloth.py \
                                           --python src/assets/scripts/export_journey.py
Отдельно (для отладки, сохранит результат в .blend):
  blender -b public/model/characters.blend --python src/assets/scripts/bake_cloth.py -- Journey 2 "{}" --save

Как это работает:
  1. Стек модификаторов ткани: Subdivision -> Armature -> Cloth, чтобы симуляция видела
     движение костей (закреплённые вершины едут за скелетом).
  2. Каждый клип из CONFIG["clips"] проигрывается CYCLES раз подряд. Берётся последний цикл,
     конец плавно смешивается с предпоследним — петля замыкается без рывка.
  3. Позиции вершин переводятся в позу покоя обратным скиннингом весами самого меша
     (или одной костью из ANCHOR_BONE) — в three.js поверх морфа ещё раз применяется скиннинг.
  4. Создаётся копия "<имя>_bake" (только Armature) с shape key на каждый сэмпл и NLA-треками
     весов с теми же именами, что у клипов арматуры — glTF-экспортёр склеивает одноимённые
     треки в одну анимацию. export_journey.py берёт _bake вместо исходника.
"""
import sys
import json
import bpy
from mathutils import Matrix, Vector

argv = [a for a in (sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []) if not a.startswith("--")]
ARMATURE = argv[0] if len(argv) > 0 else "Journey"
STEP = int(argv[1]) if len(argv) > 1 and argv[1].isdigit() else 2   # второй аргумент может быть путём для export_journey.py
CYCLES = 4  # первый цикл — разгон ткани, два последних идут в запекание
LOOP_BLEND = 0.4  # доля конца цикла, на которой плавно подмешивается предыдущий цикл

# Настройки, которые скрипт записывает в модель перед запеканием.
# Третий аргумент — JSON, перекрывающий ключи верхнего уровня (для экспериментов).
CONFIG = {
    # Какие меши запекать и какие группы вершин объединить в пин-группу "Pin".
    # Плащ (rebuild_cloak.py) держится только воротником, на плечах лежит за счёт коллизии.
    # Шапку можно добавить: {"Шапка": ["helmet"]}, но двух пинов на ушах мало — она слетает с головы.
    # Плащ (rebuild_cloak.py) — градиент: верх следует скиннингу, подол свободен.
    # Шапка: группы + градиент по высоте в пространстве арматуры — купол на голове держится,
    # край, лежащий на плечах, болтается.
    "pins": {
        "Плащ": ["PinGradient"],
        # капюшон с продолжением до плеч (rebuild_cloak.py): голова закреплена, край качается
        "Капюшон": ["PinGradient"],
    },
    # Тяжёлая ткань без "паруса": исходные mass 0.3 / air 7.9 / time_scale 2.6 давали крыло вбок
    # изгиб 5 — ткань держит гладкую форму пончо, воздух 4 — гасит лишнее раскачивание
    "cloth": {"mass": 1.0, "air_damping": 4.0, "time_scale": 1.0, "bending_stiffness": 5.0, "quality": 10},
    "cloth_collision": {"distance_min": 0.01, "collision_quality": 4},
    # Зазор вокруг тела и головы, чтобы плащ не проваливался в руки
    # (по объектам: капюшон сидит на голове плотно, большой зазор у головы выталкивает его)
    "body_collision": {"Тело": {"thickness_outer": 0.05}, "Голова": {"thickness_outer": 0.005}},
    # Subdivision после Cloth (0 — выключен): сглаживает грубую сетку, но в 4 раза раздувает морфы
    "smooth_levels": 0,
    # Кадров плавного входа анимации из позы покоя. Нужен, если ткань смоделирована на T-позе
    # (старый плащ): иначе руки на первом кадре уже торчат сквозь неё. Новый плащ висит сам.
    "preroll": 0,
    # Доля симуляции по клипам (остальное — форма, следующая за телом). В прыжке тело взлетает
    # почти на 2 м, и честная физика перекидывает подол через голову
    "clip_amount": {"jumping": 0.35},
    # Какие клипы запекать (остальные — ткань просто следует скиннингу, веса морфов = 0)
    "clips": ["idle", "walk", "run", "jumping"],
    # Сглаживание запечённых смещений (сим минус базовая форма) по соседям: убирает мелкие
    # заломы от сжатия ткани скиннингом, крупное раскачивание остаётся
    "smooth_iterations": 8,
}
if len(argv) > 2 and argv[2].lstrip().startswith("{"):
    CONFIG.update(json.loads(argv[2]))

BAKE = CONFIG["pins"]
SMOOTH_MODIFIER = "SmoothAfterCloth"
# Кость, к которой жёстко крепится запечённая копия. Смешанные веса (бёдра + руки) в беге дают
# почти вырожденную матрицу скиннинга — обратный скиннинг разносит вершины. С одной костью
# вся динамика ткани живёт в морфах, а скиннинг только несёт её за телом.
# Меши, которых нет в этом списке, запекаются на собственных весах (без ног — см. rebuild_cloak.py).
# Шапка: в её весах есть плечи и правая рука — при махах руками смешанная матрица уводит
# вершины купола, и сквозь капюшон видна голова. С одной костью головы стабильно.
ANCHOR_BONE = {}

scene = bpy.context.scene
view_layer = bpy.context.view_layer
arm = bpy.data.objects[ARMATURE]
cloth_objects = [
    o for o in arm.children_recursive
    if o.name in BAKE and o.name in view_layer.objects
    and any(m.type == "CLOTH" for m in o.modifiers)
]


def cloth_modifier(obj):
    return next(m for m in obj.modifiers if m.type == "CLOTH")


def setup_modifiers(obj):
    smooth = obj.modifiers.get(SMOOTH_MODIFIER)
    levels = CONFIG["smooth_levels"]
    if levels and not smooth:
        smooth = obj.modifiers.new(SMOOTH_MODIFIER, "SUBSURF")
    if smooth:
        if levels:
            smooth.levels = smooth.render_levels = levels
        else:
            obj.modifiers.remove(smooth)

    order = {"SUBSURF": 0, "MIRROR": 0, "ARMATURE": 1, "CLOTH": 2, "COLLISION": 3}
    wanted = sorted(obj.modifiers, key=lambda m: 4 if m.name == SMOOTH_MODIFIER else order.get(m.type, 1))
    with bpy.context.temp_override(object=obj, active_object=obj):
        for index, mod in enumerate(wanted):
            bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=index)
    print(f"  {obj.name}: {[m.name for m in obj.modifiers]}")


def setup_pin_group(obj):
    spec = BAKE[obj.name]
    names, z_range = (spec, None) if isinstance(spec, list) else (spec.get("groups", []), spec.get("z"))
    groups = [obj.vertex_groups[name].index for name in names]
    to_arm = arm.matrix_world.inverted() @ obj.matrix_world
    pin = obj.vertex_groups.get("Pin") or obj.vertex_groups.new(name="Pin")
    for v in obj.data.vertices:
        w = max((g.weight for g in v.groups if g.group in groups), default=0.0)
        if z_range:
            z0, z1 = z_range
            w = max(w, smoothstep(((to_arm @ v.co).z - z0) / (z1 - z0)))
        if w > 0:
            pin.add([v.index], w, "REPLACE")
        else:
            pin.remove([v.index])
    mod = cloth_modifier(obj)
    mod.settings.vertex_group_mass = pin.name
    for key, value in CONFIG["cloth"].items():
        setattr(mod.settings, key, value)
    for key, value in CONFIG["cloth_collision"].items():
        setattr(mod.collision_settings, key, value)
    print(f"  {obj.name}: пин-группа Pin = {BAKE[obj.name]}, {CONFIG['cloth']}")


def setup_body_collision():
    for o in arm.children_recursive:
        if o in cloth_objects:
            continue
        for m in o.modifiers:
            if m.type == "COLLISION" and o.name in CONFIG["body_collision"]:
                for key, value in CONFIG["body_collision"][o.name].items():
                    setattr(m.settings, key, value)
                print(f"  {o.name}: коллизия {CONFIG['body_collision'][o.name]}")


def reset_cloth_cache(obj, frame_end):
    mod = cloth_modifier(obj)
    cache = mod.point_cache
    if cache.is_baked:
        with bpy.context.temp_override(scene=scene, point_cache=cache):
            bpy.ops.ptcache.free_bake()
    cache.frame_start = scene.frame_start
    cache.frame_end = frame_end
    # любое изменение настроек сбрасывает кеш симуляции
    mod.settings.quality = mod.settings.quality


def anchor_bone(obj):
    return ANCHOR_BONE.get(obj.name)


def rebind_to_bone(obj, bone, bone_names):
    """Все вершины — 100% на одну кость, остальные группы костей удаляются."""
    for g in list(obj.vertex_groups):
        if g.name in bone_names:
            obj.vertex_groups.remove(g)
    obj.vertex_groups.new(name=bone).add(range(len(obj.data.vertices)), 1.0, "REPLACE")


def bone_deform_matrices(obj):
    """Матрицы деформации костей в пространстве объекта-меша (как у модификатора Armature)."""
    to_arm = arm.matrix_world.inverted() @ obj.matrix_world
    from_arm = to_arm.inverted()
    return {
        pb.name: from_arm @ pb.matrix @ pb.bone.matrix_local.inverted() @ to_arm
        for pb in arm.pose.bones
    }


def evaluated_coords(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = obj.evaluated_get(dg).to_mesh()
    coords = [v.co.copy() for v in mesh.vertices]
    obj.evaluated_get(dg).to_mesh_clear()
    return coords


def skin_weights(obj, bone_names):
    """Top-4 нормализованных веса костей на вершину — как их увидит glTF/three.js."""
    names = {g.index: g.name for g in obj.vertex_groups if g.name in bone_names}
    result = []
    for v in obj.data.vertices:
        ws = sorted(((names[g.group], g.weight) for g in v.groups if g.group in names and g.weight > 0),
                    key=lambda x: -x[1])[:4]
        total = sum(w for _, w in ws)
        result.append([(b, w / total) for b, w in ws])
    return result


def unskin(coords, weights, mats):
    out = []
    for co, ws in zip(coords, weights):
        m = Matrix(((0,) * 4,) * 4)
        for bone, w in ws:
            m += mats[bone] * w
        out.append(m.inverted_safe() @ co)
    return out


def smoothstep(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def loop_blend(prev_cycle, cycle, length):
    """
    final(t) = (1-w)·S(t) + w·S(t-L): при w(L)=1 конец цикла совпадает с началом,
    а внутри всё непрерывно, потому что S(t-L) — это тот же прогон на цикл раньше.
    """
    out = []
    for (frame, cur), (_, prev) in zip(cycle, prev_cycle):
        t = (frame - cycle[0][0]) / length
        w = smoothstep((t - (1 - LOOP_BLEND)) / LOOP_BLEND)
        out.append((frame, [a.lerp(b, w) for a, b in zip(cur, prev)]))
    return out


def make_rest_copy(obj):
    """Копия меша с применённым Subdivision и одним модификатором Armature."""
    saved = {m.name: m.show_viewport for m in obj.modifiers}
    for m in obj.modifiers:
        if m.type not in {"SUBSURF", "MIRROR"}:
            m.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    for m in obj.modifiers:
        m.show_viewport = saved[m.name]

    name = f"{obj.name}_bake"
    old = bpy.data.objects.get(name)
    if old:
        old_mesh = old.data
        bpy.data.objects.remove(old, do_unlink=True)
        if old_mesh.users == 0:
            bpy.data.meshes.remove(old_mesh)

    bake = obj.copy()
    bake.name = name
    bake.data = mesh
    mesh.name = name
    bake.animation_data_clear()
    for m in list(bake.modifiers):
        if m.type != "ARMATURE":
            bake.modifiers.remove(m)
    for c in obj.users_collection:
        c.objects.link(bake)
    return bake


def set_linear(action):
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "LINEAR"


def main():
    ad = arm.animation_data
    tracks = [t for t in ad.nla_tracks if t.strips and t.name in CONFIG["clips"]]
    other_tracks = [t for t in ad.nla_tracks if t.strips and t.name not in CONFIG["clips"]]
    saved_mute = {t.name: t.mute for t in ad.nla_tracks}
    saved_action = ad.action
    ad.action = None
    bone_names = {b.name for b in arm.data.bones}

    print("== модификаторы и настройки ткани")
    for obj in cloth_objects:
        setup_modifiers(obj)
        setup_pin_group(obj)
    setup_body_collision()

    # samples[obj][clip] = [(кадр клипа, координаты в позе покоя)]
    samples = {obj.name: {} for obj in cloth_objects}
    anchors = {obj.name: anchor_bone(obj) for obj in cloth_objects}
    bakes = {obj.name: make_rest_copy(obj) for obj in cloth_objects}
    for obj in cloth_objects:
        if anchors[obj.name]:
            rebind_to_bone(bakes[obj.name], anchors[obj.name], bone_names)
        print(f"  {bakes[obj.name].name} -> {anchors[obj.name] or 'собственные веса'}")
    weights = {obj.name: skin_weights(bakes[obj.name], bone_names) for obj in cloth_objects}

    print("== симуляция")
    for track in tracks:
        strip = track.strips[0]
        a_start, a_end = (int(round(v)) for v in strip.action.frame_range)
        length = a_end - a_start
        start = int(strip.frame_start)

        for t in ad.nla_tracks:
            t.mute = t != track
        saved_blend = (strip.use_auto_blend, strip.blend_in)
        strip.repeat = CYCLES
        strip.use_auto_blend = False
        strip.blend_in = min(CONFIG["preroll"], length)
        for pb in arm.pose.bones:
            pb.location = (0, 0, 0)
            pb.rotation_quaternion = (1, 0, 0, 0)
            pb.rotation_euler = (0, 0, 0)
            pb.scale = (1, 1, 1)

        last = start + length * CYCLES
        scene.frame_start = start
        for obj in cloth_objects:
            reset_cloth_cache(obj, last + 1)

        # два последних цикла: последний — основной, предпоследний — для склейки петли
        wanted = {
            start + length * cycle + k: (cycle, start + k)
            for cycle in (CYCLES - 2, CYCLES - 1)
            for k in range(0, length, STEP)
        }
        cycles = {obj.name: {CYCLES - 2: [], CYCLES - 1: []} for obj in cloth_objects}
        for frame in range(start, last + 1):
            scene.frame_set(frame)
            if frame not in wanted:
                continue
            cycle, clip_frame = wanted[frame]
            for obj in cloth_objects:
                rest = unskin(evaluated_coords(obj), weights[obj.name], bone_deform_matrices(obj))
                cycles[obj.name][cycle].append((clip_frame, rest))

        for obj in cloth_objects:
            c = cycles[obj.name]
            samples[obj.name][track.name] = loop_blend(c[CYCLES - 2], c[CYCLES - 1], length)

        strip.repeat = 1
        strip.use_auto_blend, strip.blend_in = saved_blend
        print(f"  {track.name}: {len(wanted) // 2} сэмплов, цикл {length} кадров, прогнано {last - start + 1}")

    for t in ad.nla_tracks:
        t.mute = saved_mute[t.name]
    ad.action = saved_action

    print("== shape keys")
    for obj in cloth_objects:
        bake = bakes[obj.name]
        bake.shape_key_add(name="Basis", from_mix=False)
        key = bake.data.shape_keys
        key.use_relative = True
        key.animation_data_create()

        for clip, frames in samples[obj.name].items():
            blocks = []
            amount = CONFIG["clip_amount"].get(clip, 1.0)
            basis = [v.co.copy() for v in bake.data.vertices]
            neighbours = [[] for _ in basis]
            for e in bake.data.edges:
                a, b = e.vertices
                neighbours[a].append(b)
                neighbours[b].append(a)
            for frame, coords in frames:
                delta = [(c - b) * amount for b, c in zip(basis, coords)]
                for _ in range(CONFIG["smooth_iterations"]):
                    delta = [
                        d * 0.5 + sum((delta[n] for n in nb), Vector()) * (0.5 / len(nb)) if nb else d
                        for d, nb in zip(delta, neighbours)
                    ]
                coords = [b + d for b, d in zip(basis, delta)]
                kb = bake.shape_key_add(name=f"{clip}_{frame:03d}", from_mix=False)
                kb.data.foreach_set("co", [c for co in coords for c in co])
                kb.value = 0.0
                blocks.append((frame, kb))

            action = bpy.data.actions.get(f"{bake.name}_{clip}")
            if action:
                bpy.data.actions.remove(action)
            action = bpy.data.actions.new(f"{bake.name}_{clip}")
            key.animation_data.action = action

            track_strip = next(t for t in tracks if t.name == clip).strips[0]
            clip_end = int(round(track_strip.action.frame_range[1] - track_strip.action.frame_range[0])) + int(track_strip.frame_start)
            # последний кадр цикла = первый сэмпл, чтобы петля замыкалась.
            # Каждый ключ: 1 на своём кадре, 0 на соседних — линейный переход между сэмплами
            keys = blocks + [(clip_end, blocks[0][1])]
            for i, (frame, kb) in enumerate(keys):
                neighbours = {keys[j][0] for j in (i - 1, i + 1) if 0 <= j < len(keys)}
                for f, v in [(frame, 1.0)] + [(n, 0.0) for n in neighbours]:
                    kb.value = v
                    kb.keyframe_insert("value", frame=f)
            for kb in [b for _, b in blocks]:
                kb.value = 0.0

            set_linear(action)
            key.animation_data.action = None
            nla = key.animation_data.nla_tracks.new()
            nla.name = clip
            nla.strips.new(clip, int(track_strip.frame_start), action)
            print(f"  {bake.name}/{clip}: {len(blocks)} shape keys")

        # остальные клипы: веса морфов в ноль — иначе в three.js остаётся форма прошлого клипа
        blocks = [kb for kb in key.key_blocks[1:]]
        for track in other_tracks:
            strip = track.strips[0]
            name = f"{bake.name}_{track.name}"
            action = bpy.data.actions.get(name)
            if action:
                bpy.data.actions.remove(action)
            action = bpy.data.actions.new(name)
            key.animation_data.action = action
            for kb in blocks:
                kb.value = 0.0
                for f in (strip.frame_start, strip.frame_end):
                    kb.keyframe_insert("value", frame=f)
            key.animation_data.action = None
            nla = key.animation_data.nla_tracks.new()
            nla.name = track.name
            nla.strips.new(track.name, int(strip.frame_start), action)
        if other_tracks:
            print(f"  {bake.name}: нулевые морфы для {len(other_tracks)} клипов")

        obj.hide_set(False)
        bake.hide_set(True)

    # Запечённые копии живут только в памяти — дальше в той же сессии их берёт export_journey.py.
    # В .blend остаётся исходная модель; --save нужен только для отладки запекания
    if "--save" in sys.argv:
        bpy.ops.wm.save_mainfile()
        print("== saved")


main()
