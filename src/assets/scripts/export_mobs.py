"""
Экспорт мобов из characters.blend в GLB для игры (Blender 5.x).

Запуск:
  blender -b public/model/characters.blend --python src/assets/scripts/export_mobs.py -- [моб ...] [--clips-from Journey_rig_old | --no-clips]
  по умолчанию: Hallow Mashroom -> public/model/<моб>.glb, клипы берутся у Journey_rig_old (копия исходного рига Journey)

Зачем: FBX мобов экспортированы в сантиметрах (корень x138.67) и в игре выходят в ~65 раз больше героя,
а клипов в них нет вовсе. В .blend мобы в метрах, как Journey, поэтому GLB сразу нужного размера.

Клипы:
  - если у моба есть свои NLA-треки, экспортируются они (имя трека = имя клипа в игре);
  - иначе клипы переносятся с --clips-from (скелет тот же, rigify-имена костей): переносится отклонение
    каждой кости от позы покоя в мировом пространстве (позы покоя у мобов другие), смещение корня
    масштабируется под высоту таза моба,
    а весь клип сдвигается по высоте так, чтобы нижняя точка стоп стояла на полу, как в позе покоя
    (ноги у мобов короче, и согнутые колени исходника иначе поднимают их в воздух).
Перенесённые клипы живут только в памяти: .blend не сохраняется.

Cloth/Collision на время экспорта выключаются (см. export_journey.py).
"""
import os
import re
import sys
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# Копия исходного рига Journey (straighten_rest.py): у Journey теперь T-поза покоя,
# а перенос клипов считает отклонение от позы покоя — нужна старая
CLIPS_FROM = "Journey_rig_old"
if "--no-clips" in argv:
    CLIPS_FROM = None
if "--clips-from" in argv:
    i = argv.index("--clips-from")
    CLIPS_FROM = argv[i + 1]
    del argv[i:i + 2]
MOBS = [a for a in argv if not a.startswith("--")] or ["Hallow", "Mashroom"]
ROOT = "spine"
FEET = re.compile(r"^(foot|toe|heel)")

scene = bpy.context.scene
view_layer = bpy.context.view_layer
out_dir = os.path.dirname(bpy.data.filepath)


def layer_collections(layer):
    yield layer
    for child in layer.children:
        yield from layer_collections(child)


def show(obj):
    """Мобы лежат в выключенных коллекциях: включаем их во view layer, возвращаем откат."""
    changed = []
    names = {c.name for c in obj.users_collection}
    for lc in layer_collections(view_layer.layer_collection):
        if lc.name in names and (lc.exclude or lc.hide_viewport):
            changed.append((lc, lc.exclude, lc.hide_viewport))
            lc.exclude = False
            lc.hide_viewport = False
    return changed


def nla_clips(arm):
    ad = arm.animation_data
    return [(t.name, t.strips[0].action) for t in ad.nla_tracks if t.strips] if ad else []


def retarget(src, dst, clip, action):
    """Запекает action исходной арматуры на dst. Возвращает новый action.

    Переносится отклонение каждой кости от позы покоя в мировом пространстве, а не её абсолютный поворот:
    в покое кости мобов повёрнуты иначе, чем у Journey (корень ~95°, шея ~74°, плечи ~55°),
    и копия абсолютного поворота заваливает голову и корпус.
    """
    src_ad = src.animation_data
    src_ad.action = action
    # В Blender 5 action без слота не проигрывается, а в фоне слот сам не выбирается
    if src_ad.action_slot is None and action.slots:
        src_ad.action_slot = action.slots[0]
    dst_ad = dst.animation_data or dst.animation_data_create()
    dst_ad.action = None

    src_rot = src.matrix_world.to_quaternion()
    dst_rot = dst.matrix_world.to_quaternion()
    dst_rot_inv = dst_rot.inverted()
    world = dst.matrix_world
    dst_inv = world.inverted()

    ordered = sorted(dst.pose.bones, key=lambda pb: len(pb.parent_recursive))
    # Поза покоя кости относительно родителя (для корня — относительно арматуры)
    rest_rel = {
        pb.name: pb.parent.bone.matrix_local.inverted() @ pb.bone.matrix_local if pb.parent else pb.bone.matrix_local.copy()
        for pb in ordered
    }
    # Поворот от покоя исходника к покою моба: rot_dst = delta_src @ rest_fix
    rest_fix = {
        pb.name: (src_rot @ src.data.bones[pb.name].matrix_local.to_quaternion()).inverted()
        @ (dst_rot @ pb.bone.matrix_local.to_quaternion())
        for pb in ordered if pb.name in src.data.bones
    }

    # Высота таза в покое: смещение корня исходника масштабируем под пропорции моба
    src_rest = src.matrix_world @ src.data.bones[ROOT].head_local
    dst_rest = world @ dst.data.bones[ROOT].head_local
    k = dst_rest.z / src_rest.z if src_rest.z else 1.0

    feet = [pb for pb in ordered if FEET.match(pb.name)]
    rest_floor = min(
        (world @ p).z for pb in feet for p in (pb.bone.head_local, pb.bone.tail_local)
    ) if feet else None

    start, end = (int(round(v)) for v in action.frame_range)
    frames = []
    lowest = float("inf")

    for f in range(start, end + 1):
        scene.frame_set(f)
        pose = {}
        for pb in ordered:
            # Прямая кинематика: без собственного поворота кость просто следует за родителем
            m = pose[pb.parent.name] @ rest_rel[pb.name] if pb.parent else rest_rel[pb.name].copy()
            if pb.name in rest_fix:
                src_world = src_rot @ src.pose.bones[pb.name].matrix.to_quaternion()
                m = Matrix.LocRotScale(m.translation, dst_rot_inv @ src_world @ rest_fix[pb.name], None)
            if pb.name == ROOT:
                src_head = src.matrix_world @ src.pose.bones[ROOT].head
                m.translation = dst_inv @ (dst_rest + (src_head - src_rest) * k)
            pose[pb.name] = m
        for pb in feet:
            m = pose[pb.name]
            lowest = min(lowest, (world @ m.translation).z, (world @ (m @ Vector((0, pb.bone.length, 0)))).z)
        frames.append((f, pose))

    src_ad.action = None

    # Одно смещение на весь клип: стопы на полу, но подъём в прыжке и покачивание при ходьбе сохраняются
    offset = dst_inv.to_3x3() @ Vector((0, 0, rest_floor - lowest)) if feet else Vector()

    # Плечи/pelvis/breast в риге в режиме Эйлера: ключи rotation_quaternion на них иначе игнорируются
    for pb in ordered:
        pb.rotation_mode = "QUATERNION"

    result = bpy.data.actions.new(f"{dst.name}|{clip}")
    dst_ad.action = result
    prev = {}
    for f, pose in frames:
        for pb in ordered:
            m = pose[pb.name]
            if pb.parent:
                basis = rest_rel[pb.name].inverted() @ pose[pb.parent.name].inverted() @ m
            else:
                shifted = m.copy()
                shifted.translation += offset
                basis = rest_rel[pb.name].inverted() @ shifted
            loc, q, _ = basis.decompose()
            if pb.name in prev:
                q.make_compatible(prev[pb.name])
            prev[pb.name] = q
            if pb.name == ROOT:
                pb.location = loc
                pb.keyframe_insert("location", frame=f, group=pb.name)
            pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=f, group=pb.name)
    dst_ad.action = None

    return result


def add_clips(mob, src):
    src_ad = src.animation_data
    saved = (src_ad.action, {t.name: t.mute for t in src_ad.nla_tracks})
    for t in src_ad.nla_tracks:
        t.mute = True

    ad = mob.animation_data or mob.animation_data_create()
    for clip, action in nla_clips(src):
        track = ad.nla_tracks.new()
        track.name = clip
        track.strips.new(clip, int(action.frame_range[0]), retarget(src, mob, clip, action))
        print(f"  {clip}: перенесён с {src.name}")

    src_ad.action = saved[0]
    for t in src_ad.nla_tracks:
        t.mute = saved[1].get(t.name, True)


def export(name):
    arm = bpy.data.objects[name]
    restore_layers = show(arm)

    if not nla_clips(arm) and CLIPS_FROM:
        add_clips(arm, bpy.data.objects[CLIPS_FROM])

    meshes = [o for o in arm.children_recursive if o.type == "MESH" and o.name in view_layer.objects]
    objects = [arm] + meshes

    for o in view_layer.objects:
        o.select_set(False)

    disabled = []
    for o in objects:
        o.hide_set(False)
        o.select_set(True)
        for m in o.modifiers:
            if m.type in {"CLOTH", "COLLISION"} and m.show_viewport:
                m.show_viewport = False
                disabled.append(m)
    view_layer.objects.active = arm

    ad = arm.animation_data
    if ad:
        ad.action = None
        for t in ad.nla_tracks:
            t.mute = False

    scene.frame_set(1)
    out = os.path.join(out_dir, f"{name}.glb")

    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_def_bones=False,
        export_optimize_animation_size=True,
    )

    for m in disabled:
        m.show_viewport = True
    for o in objects:
        o.select_set(False)
    for lc, exclude, hidden in restore_layers:
        lc.exclude = exclude
        lc.hide_viewport = hidden

    print("== exported", out, [o.name for o in objects], [c for c, _ in nla_clips(arm)])


for mob in MOBS:
    export(mob)
