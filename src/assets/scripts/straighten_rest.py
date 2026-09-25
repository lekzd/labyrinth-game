"""
Чистая T-поза покоя для Journey: руки горизонтально и прямо, ноги вертикально и прямо (Blender 5.x).

Запуск (один раз; повторный запуск ничего не меняет):
  blender -b public/model/characters.blend --python src/assets/scripts/straighten_rest.py

Что делает:
  1. Копия исходного рига -> "Journey_rig_old" с копиями клипов (idle/walk/run/jumping_rig_old)
     в скрытой коллекции "Journey_rig_old". С неё export_mobs.py берёт клипы для мобов:
     там переносится отклонение от позы покоя, и новая поза покоя сдвинула бы позы мобов.
  2. У Journey кости рук и ног поворачиваются в прямые линии (скручивание вокруг кости
     сохраняется), дочерние кости едут следом.
  3. Клипы пересчитываются так, чтобы каждая кость в мире стояла там же, где раньше:
     позы костей снимаются до выпрямления и переводятся в локальные под новую позу покоя.
"""
import bpy
from mathutils import Matrix, Vector

NAME = "Journey"
OLD = "Journey_rig_old"
STRAIGHT = {
    # кость: направление в пространстве арматуры (по стороне L; R зеркально)
    "upper_arm": Vector((1, 0, 0)),
    "forearm": Vector((1, 0, 0)),
    "hand": Vector((1, 0, 0)),
    "thigh": Vector((0, 0, -1)),
    "shin": Vector((0, 0, -1)),
}


def log(msg):
    print(f"  {msg}")


def make_old_rig(arm):
    coll = bpy.data.collections.get(OLD) or bpy.data.collections.new(OLD)
    if coll.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(coll)
    old = arm.copy()
    old.data = arm.data.copy()
    old.name = OLD
    old.data.name = OLD
    coll.objects.link(old)
    old.animation_data_clear()
    ad = old.animation_data_create()
    for t in arm.animation_data.nla_tracks:
        if not t.strips:
            continue
        action = t.strips[0].action.copy()
        action.name = f"{t.name}_rig_old"
        action.use_fake_user = True
        track = ad.nla_tracks.new()
        track.name = t.name
        strip = track.strips.new(t.name, int(t.strips[0].frame_start), action)
        strip.action_slot = action.slots[0]
        track.mute = True
    bpy.context.view_layer.layer_collection.children[coll.name].hide_viewport = True
    log(f"{OLD}: {len(ad.nla_tracks)} клипов для мобов")
    return old


def straighten(arm):
    bpy.context.view_layer.objects.active = arm
    for o in bpy.context.view_layer.objects:
        o.select_set(o == arm)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    changed = []
    for side, sign in (("L", 1), ("R", -1)):
        for chain in (("upper_arm", "forearm", "hand"), ("thigh", "shin")):
            for name in chain:
                b = eb[f"{name}.{side}"]
                d = STRAIGHT[name].copy()
                d.x *= sign
                old_dir = (b.tail - b.head).normalized()
                rot = old_dir.rotation_difference(d).to_matrix().to_4x4()
                length = b.length
                # звенья цепочки начинаются в конце уже выпрямленного родителя
                head = b.parent.tail.copy() if name in ("forearm", "hand", "shin") else b.head.copy()
                # дочерние (не цепочка) едут вместе с костью: запоминаем их в её пространстве
                inv = b.matrix.inverted()
                kids = [(c, inv @ c.matrix) for c in b.children if c.name.split(".")[0] not in STRAIGHT]
                m = rot @ b.matrix.to_3x3().to_4x4()
                m.translation = head
                b.matrix = m
                b.length = length
                for c, local in kids:
                    move_subtree(c, b.matrix @ local)
                changed.append(b.name)
    bpy.ops.object.mode_set(mode="OBJECT")
    log(f"выпрямлено: {', '.join(changed)}")


def move_subtree(bone, matrix):
    inv = bone.matrix.inverted()
    kids = [(c, inv @ c.matrix) for c in bone.children]
    length = bone.length
    bone.matrix = matrix
    bone.length = length
    for c, local in kids:
        move_subtree(c, bone.matrix @ local)


def sample_clips(arm):
    """Позы всех костей (пространство арматуры) во всех кадрах всех клипов — до выпрямления."""
    scene = bpy.context.scene
    ad = arm.animation_data
    ad.action = None
    samples = {}
    for track in ad.nla_tracks:
        if not track.strips:
            continue
        for t in ad.nla_tracks:
            t.mute = t != track
        bpy.context.view_layer.update()
        action = track.strips[0].action
        start, end = (int(round(v)) for v in action.frame_range)
        frames = {}
        for f in range(start, end + 1):
            scene.frame_set(f)
            frames[f] = {pb.name: pb.matrix.copy() for pb in arm.pose.bones}
        samples[track.name] = (action, frames)
    for t in ad.nla_tracks:
        t.mute = True
    return samples


def rewrite_clips(arm, samples):
    """Ключи под новую позу покоя: L = (R_p^-1 R)^-1 · M_p^-1 · M — каждая кость там же в мире."""
    ad = arm.animation_data
    rest = {b.name: b.matrix_local.copy() for b in arm.data.bones}
    for name, (action, frames) in samples.items():
        for layer in action.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    for fc in list(cb.fcurves):
                        if fc.data_path.startswith("pose.bones"):
                            cb.fcurves.remove(fc)
        ad.action = action
        ad.action_slot = action.slots[0]
        for f, poses in frames.items():
            for pb in arm.pose.bones:
                parent = pb.parent
                if parent:
                    offset = rest[parent.name].inverted() @ rest[pb.name]
                    local = offset.inverted() @ poses[parent.name].inverted() @ poses[pb.name]
                else:
                    local = rest[pb.name].inverted() @ poses[pb.name]
                loc, rot, scale = local.decompose()
                pb.location = loc
                pb.rotation_quaternion = rot
                pb.scale = scale
                pb.keyframe_insert("location", frame=f, group=pb.name)
                pb.keyframe_insert("rotation_quaternion", frame=f, group=pb.name)
                pb.keyframe_insert("scale", frame=f, group=pb.name)
        ad.action = None
        log(f"{name}: кадры {min(frames)}-{max(frames)} пересчитаны")
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)


def verify(arm, samples):
    """Та же поза в мире: сравнение суставов с позами, снятыми до выпрямления."""
    scene = bpy.context.scene
    ad = arm.animation_data
    worst = {}
    for name, (action, frames) in samples.items():
        for t in ad.nla_tracks:
            t.mute = t.name != name
        bpy.context.view_layer.update()
        err, bone = 0.0, ""
        for f, poses in frames.items():
            scene.frame_set(f)
            for pb in arm.pose.bones:
                e = (pb.matrix.translation - poses[pb.name].translation).length
                if e > err:
                    err, bone = e, pb.name
        worst[name] = (round(err, 4), bone)
    for t in ad.nla_tracks:
        t.mute = True
    log(f"расхождение суставов с исходником: {worst}")


def main():
    print("== T-поза")
    if bpy.data.objects.get(OLD):
        log(f"{OLD} уже есть — поза покоя уже выпрямлена")
        return
    arm = bpy.data.objects[NAME]
    make_old_rig(arm)
    samples = sample_clips(arm)
    straighten(arm)
    rewrite_clips(arm, samples)
    verify(arm, samples)
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_mainfile()
    print("== saved")


main()
