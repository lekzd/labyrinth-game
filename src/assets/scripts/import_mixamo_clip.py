"""
Переносит клип из FBX (Mixamo, риг с теми же именами костей) на арматуру Journey (Blender 5.x).

Запуск:
  blender -b public/model/characters.blend --python src/assets/scripts/import_mixamo_clip.py -- <file.fbx> <clip> [armature]
  например: -- public/animation/jumping.fbx jumping

Клип добавляется как action + NLA-трек с именем <clip> (так его увидит export_journey.py и игра).

Почему не просто скопировать action: поза покоя рук у Journey отличается от рига, на котором
делался FBX (плечо ~10°, кисть сильнее), и локальные вращения дали бы кривые руки. Поэтому
позы переносятся в пространстве арматуры через Copy Rotation/Copy Transforms и запекаются.
Движение объекта-арматуры из FBX (поворот ~-43° и смещения) убирается: разворот по Z
выравнивается к среднему, клип центрируется над началом координат, высота сохраняется.
"""
import sys
import math
import bpy
from mathutils import Matrix, Euler, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
FBX = argv[0]
CLIP = argv[1]
ARMATURE = argv[2] if len(argv) > 2 else "Journey"
ROOT = "spine"

scene = bpy.context.scene
target = bpy.data.objects[ARMATURE]


def channelbag(action):
    for layer in action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                return cb


def import_source():
    before = set(bpy.data.objects)
    actions_before = set(bpy.data.actions)
    # импортёр переключает сцену на fps файла (Mixamo — 24) и тем замедляет все остальные клипы
    fps = (scene.render.fps, scene.render.fps_base)
    bpy.ops.import_scene.fbx(filepath=FBX)
    src_fps = scene.render.fps / scene.render.fps_base
    scene.render.fps, scene.render.fps_base = fps
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    return src, new, [a for a in bpy.data.actions if a not in actions_before], src_fps


def neutralize_object_motion(src, frames):
    """Средний разворот по Z -> 0, центр корня над началом координат."""
    cb = channelbag(src.animation_data.action)
    rot_z = cb.fcurves.find("rotation_euler", index=2)
    mean_yaw = sum(rot_z.evaluate(f) for f in frames) / len(frames) if rot_z else 0.0
    if rot_z:
        for kp in rot_z.keyframe_points:
            kp.co.y -= mean_yaw
            kp.handle_left.y -= mean_yaw
            kp.handle_right.y -= mean_yaw
        rot_z.update()

    heads = []
    for f in frames:
        scene.frame_set(f)
        heads.append(src.matrix_world @ src.pose.bones[ROOT].head)
    cx = sum(h.x for h in heads) / len(heads)
    cy = sum(h.y for h in heads) / len(heads)
    for i, c in ((0, cx), (1, cy)):
        fc = cb.fcurves.find("location", index=i)
        if fc:
            for kp in fc.keyframe_points:
                kp.co.y -= c
                kp.handle_left.y -= c
                kp.handle_right.y -= c
            fc.update()
        else:
            src.location[i] -= c
    print(f"  убран поворот {math.degrees(mean_yaw):.1f}°, смещение ({cx:.3f}, {cy:.3f})")


def main():
    src, imported, new_actions, src_fps = import_source()
    # кадры исходника в fps файла -> кадры сцены, чтобы клип сохранил свой темп
    stretch = (scene.render.fps / scene.render.fps_base) / src_fps
    action = src.animation_data.action
    start, end = (int(round(v)) for v in action.frame_range)
    frames = list(range(start, end + 1))
    print(f"== {FBX}: {action.name}, кадры {start}-{end} @ {src_fps:g} fps")

    neutralize_object_motion(src, frames)

    # временно отключаем NLA цели, чтобы на неё действовали только констрейнты
    ad = target.animation_data or target.animation_data_create()
    saved_mute = {t.name: t.mute for t in ad.nla_tracks}
    saved_action = ad.action
    ad.action = None
    for t in ad.nla_tracks:
        t.mute = True

    bones = [pb for pb in target.pose.bones if pb.name in src.pose.bones]
    for pb in target.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)
    constraints = []
    for pb in bones:
        kind = "COPY_TRANSFORMS" if pb.name == ROOT else "COPY_ROTATION"
        c = pb.constraints.new(kind)
        c.target = src
        c.subtarget = pb.name
        c.target_space = c.owner_space = "WORLD"
        constraints.append((pb, c))

    # запекаем: для каждого кадра — локальные матрицы, родители раньше детей
    ordered = sorted(bones, key=lambda pb: len(pb.parent_recursive))
    baked = {pb.name: [] for pb in ordered}
    for f in frames:
        scene.frame_set(f)
        for pb in ordered:
            local = target.convert_space(pose_bone=pb, matrix=pb.matrix, from_space="POSE", to_space="LOCAL")
            baked[pb.name].append((f, local))

    for pb, c in constraints:
        pb.constraints.remove(c)

    old = bpy.data.actions.get(CLIP)
    if old:
        bpy.data.actions.remove(old)
    clip = bpy.data.actions.new(CLIP)
    clip.use_fake_user = True
    ad.action = clip
    for name, samples in baked.items():
        pb = target.pose.bones[name]
        prev_q = None
        for f, m in samples:
            loc, q, scl = m.decompose()
            if prev_q is not None:
                q.make_compatible(prev_q)
            prev_q = q
            frame = start + (f - start) * stretch
            if name == ROOT:
                pb.location = loc
                pb.keyframe_insert("location", frame=frame, group=name)
            pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=frame, group=name)
    ad.action = None

    for t in [t for t in ad.nla_tracks if t.name == CLIP]:
        ad.nla_tracks.remove(t)
    track = ad.nla_tracks.new()
    track.name = CLIP
    track.strips.new(CLIP, start, clip)

    for t in ad.nla_tracks:
        t.mute = saved_mute.get(t.name, True)
    ad.action = saved_action

    for o in imported:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in new_actions:
        if a.users == 0:
            bpy.data.actions.remove(a)

    bpy.ops.wm.save_mainfile()
    print(f"== {CLIP}: {len(frames)} кадров, {len(bones)} костей -> NLA-трек {CLIP}")


main()
