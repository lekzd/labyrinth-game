"""
Переносит клипы из FBX с чужими ригами (Quaternius, KayKit) на арматуру Journey (Blender 5.x).

Запуск (можно повторять — клипы пересоздаются):
  blender -b public/model/characters.blend --python src/assets/scripts/retarget_clips.py [-- clip ...]
По умолчанию — все клипы из CLIPS. Потом: bake_cloth.py + export_journey.py.

Как переносится (по направлениям, а не по вращениям — позы покоя и оси костей у ригов разные):
  1. Таз: положение и поворот. Кадр таза — (вправо: бедро.L - бедро.R, вверх: таз -> грудь) у
     источника и у Journey в позе покоя; поворот таза Journey = поворот этого кадра источника.
     Высота и шаги масштабируются по длине ноги, клип стартует с места, разворот выравнивается
     по первому кадру (персонаж смотрит вперёд, -Y).
  2. Остальные кости (от корня к концам): кость наследует позу родителя и доворачивается
     кратчайшим поворотом так, чтобы её ось смотрела вдоль сегмента источника (см. MAP).
     Скручивание наследуется — оружие в руке не крутится.
Клипы помечаются "posture"/"side" — straighten_posture.py их не трогает.
"""
import sys
import math
import bpy
from mathutils import Matrix, Vector

ARMATURE = "Journey"
ANIM_DIR = "public/animation"

# клип в игре: файл
CLIPS = {
    "bow_attack": "bow_attack.fbx",
    "dagger_attack2": "dagger_attack2.fbx",
    "death": "death.fbx",
    "gunplay": "gunplay.fbx",
    "hammer_attack": "hammer_attack.fbx",
    "attack": "punch.fbx",
    "staff_attack": "staff_attack.fbx",
    "sword_attack": "sword.fbx",
    "sword_attackfast": "sword_attackfast.fbx",
}

# Сегменты источника: (кость, "head"|"tail") -> (кость, "head"|"tail")
PROFILES = {
    "quaternius": {
        "detect": "Abdomen",
        "hips": ("Hips", "head"),
        "chest": ("Torso", "head"),
        "leg_l": ("UpperLeg.L", "head"), "leg_r": ("UpperLeg.R", "head"),
        "feet": [("LowerLeg.L_end", "head"), ("LowerLeg.R_end", "head")],
        "knee": ("LowerLeg.L", "head"),
        "map": {
            "spine.001": (("Abdomen", "head"), ("Torso", "head")),
            "spine.002": (("Abdomen", "head"), ("Torso", "head")),
            "spine.003": (("Torso", "head"), ("Neck", "head")),
            "spine.004": (("Neck", "head"), ("Head", "head")),
            "spine.005": (("Neck", "head"), ("Head", "head")),
            "spine.006": (("Head", "head"), ("Head_end", "head")),
            "shoulder.L": (("Shoulder.L", "head"), ("UpperArm.L", "head")),
            "upper_arm.L": (("UpperArm.L", "head"), ("LowerArm.L", "head")),
            "forearm.L": (("LowerArm.L", "head"), ("Fist.L", "head")),
            "hand.L": (("Fist.L", "head"), ("Fist2.L", "head")),
            "shoulder.R": (("Shoulder.R", "head"), ("UpperArm.R", "head")),
            "upper_arm.R": (("UpperArm.R", "head"), ("LowerArm.R", "head")),
            "forearm.R": (("LowerArm.R", "head"), ("Fist.R", "head")),
            "hand.R": (("Fist.R", "head"), ("Fist2.R", "head")),
            "thigh.L": (("UpperLeg.L", "head"), ("LowerLeg.L", "head")),
            "shin.L": (("LowerLeg.L", "head"), ("LowerLeg.L_end", "head")),
            "thigh.R": (("UpperLeg.R", "head"), ("LowerLeg.R", "head")),
            "shin.R": (("LowerLeg.R", "head"), ("LowerLeg.R_end", "head")),
        },
    },
    "kaykit": {
        "detect": "upperarm.l",
        "hips": ("hips", "head"),
        "chest": ("chest", "head"),
        "leg_l": ("upperleg.l", "head"), "leg_r": ("upperleg.r", "head"),
        "feet": [("foot.l", "head"), ("foot.r", "head")],
        "knee": ("lowerleg.l", "head"),
        "map": {
            "spine.001": (("spine", "head"), ("chest", "head")),
            "spine.002": (("spine", "head"), ("chest", "head")),
            "spine.003": (("chest", "head"), ("head", "head")),
            "spine.004": (("chest", "head"), ("head", "head")),
            "spine.005": (("chest", "head"), ("head", "head")),
            "spine.006": (("head", "head"), ("head", "tail")),
            "upper_arm.L": (("upperarm.l", "head"), ("lowerarm.l", "head")),
            "forearm.L": (("lowerarm.l", "head"), ("wrist.l", "head")),
            "hand.L": (("wrist.l", "head"), ("hand.l", "tail")),
            "upper_arm.R": (("upperarm.r", "head"), ("lowerarm.r", "head")),
            "forearm.R": (("lowerarm.r", "head"), ("wrist.r", "head")),
            "hand.R": (("wrist.r", "head"), ("hand.r", "tail")),
            "thigh.L": (("upperleg.l", "head"), ("lowerleg.l", "head")),
            "shin.L": (("lowerleg.l", "head"), ("foot.l", "head")),
            "thigh.R": (("upperleg.r", "head"), ("lowerleg.r", "head")),
            "shin.R": (("lowerleg.r", "head"), ("foot.r", "head")),
        },
    },
}
ROOT = "spine"
# Доля горизонтального смещения таза из исходника: в игре позицию задаёт код, и клип, уводящий
# персонажа (комбо меча — на 2 м), в конце телепортировал бы его обратно. Смерть — небольшой откат.
ROOT_MOTION = {"death": 0.5}
TARGET_FRAME = {"hips": "spine", "chest": "spine.003", "leg_l": "thigh.L", "leg_r": "thigh.R"}


def log(msg):
    print(f"  {msg}")


def frame_of(right, up):
    """Ортонормированный кадр (вправо, вперёд, вверх) как матрица 3x3 (столбцы)."""
    up = up.normalized()
    right = (right - up * right.dot(up)).normalized()
    fwd = up.cross(right)
    return Matrix((right, fwd, up)).transposed()


def import_source(path):
    scene = bpy.context.scene
    fps = (scene.render.fps, scene.render.fps_base)
    before, actions = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=path)
    src_fps = scene.render.fps / scene.render.fps_base
    scene.render.fps, scene.render.fps_base = fps
    new = [o for o in bpy.data.objects if o not in before]
    src = next(o for o in new if o.type == "ARMATURE")
    return src, new, [a for a in bpy.data.actions if a not in actions], src_fps


def point(src, bone, where):
    pb = src.pose.bones[bone]
    return src.matrix_world @ (pb.head if where == "head" else pb.tail)


def sample_source(src, prof, frames):
    scene = bpy.context.scene
    out = []
    for f in frames:
        scene.frame_set(f)
        p = {k: point(src, *prof[k]) for k in ("hips", "chest", "leg_l", "leg_r")}
        feet = min(point(src, *ft).z for ft in prof["feet"])
        knee = point(src, *prof["knee"])
        p["leg_len"] = (knee - p["leg_l"]).length + (point(src, *prof["feet"][0]) - knee).length
        dirs = {}
        for tb, (a, b) in prof["map"].items():
            d = point(src, *b) - point(src, *a)
            if d.length > 1e-6:
                dirs[tb] = d.normalized()
        out.append((p, feet, dirs))
    return out


def retarget(arm, samples, prof, stretch, start, action, motion=0.0):
    bones = arm.data.bones
    rest = {b.name: b.matrix_local.copy() for b in bones}
    to_world = arm.matrix_world
    inv_world = to_world.inverted()

    # опорные величины: кадр таза и высота таза над ступнями (первый кадр источника / покой цели)
    p0, feet0, _ = samples[0]
    t = {k: to_world @ bones[v].head_local for k, v in TARGET_FRAME.items()}
    t_feet = min((to_world @ bones[n].tail_local).z for n in ("shin.L", "shin.R"))
    # масштаб — по длине ноги (не зависит от позы первого кадра), пол — нижняя точка ступней за клип
    leg_t = sum(bones[n].length for n in ("thigh.L", "shin.L")) * to_world.to_scale().z
    scale = leg_t / max(sum(s[0]["leg_len"] for s in samples) / len(samples), 1e-3)
    floor = min(s[1] for s in samples)
    tgt_frame = frame_of(t["leg_l"] - t["leg_r"], t["chest"] - t["hips"])
    # разворот: правая ось первого кадра источника -> ось цели
    r0 = p0["leg_l"] - p0["leg_r"]
    rt = t["leg_l"] - t["leg_r"]
    yaw = Matrix.Rotation(math.atan2(rt.y, rt.x) - math.atan2(r0.y, r0.x), 3, "Z")
    center = yaw @ p0["hips"]   # клип начинается там, где стоит персонаж (смерть уводит в сторону)

    order = sorted(arm.pose.bones, key=lambda pb: len(pb.parent_recursive))
    ad = arm.animation_data
    ad.action = action   # новый экшен: слот создастся при первом ключе
    for i, (p, feet, dirs) in enumerate(samples):
        # таз
        src_frame = yaw @ frame_of(p["leg_l"] - p["leg_r"], p["chest"] - p["hips"])
        rot = (src_frame @ tgt_frame.inverted()).to_4x4()
        hip = yaw @ p["hips"]
        pos = Vector(((hip.x - center.x) * scale * motion + t["hips"].x,
                      (hip.y - center.y) * scale * motion + t["hips"].y,
                      (p["hips"].z - floor) * scale + t_feet))
        world = {}
        root_rest_w = to_world @ rest[ROOT]
        m = rot @ Matrix.Translation(-root_rest_w.translation) @ root_rest_w
        m.translation = pos
        world[ROOT] = m
        for pb in order:
            if pb.name == ROOT:
                continue
            parent = pb.parent.name
            inherit = world[parent] @ (to_world @ rest[parent]).inverted() @ (to_world @ rest[pb.name])
            d = dirs.get(pb.name)
            if d is not None:
                d = yaw @ d
                cur = inherit.to_3x3().col[1].normalized()
                swing = cur.rotation_difference(d).to_matrix().to_4x4()
                head = inherit.translation.copy()
                inherit = Matrix.Translation(head) @ swing @ Matrix.Translation(-head) @ inherit
            world[pb.name] = inherit

        frame = start + i * stretch
        pose = {n: inv_world @ w for n, w in world.items()}   # пространство арматуры
        for pb in order:
            if pb.parent:
                offset = rest[pb.parent.name].inverted() @ rest[pb.name]
                local = offset.inverted() @ pose[pb.parent.name].inverted() @ pose[pb.name]
            else:
                local = rest[pb.name].inverted() @ pose[pb.name]
            loc, q, _ = local.decompose()
            pb.location = loc if pb.name == ROOT else Vector()
            pb.rotation_quaternion = q
            if pb.name == ROOT:
                pb.keyframe_insert("location", frame=frame, group=pb.name)
            pb.keyframe_insert("rotation_quaternion", frame=frame, group=pb.name)
    ad.action = None
    return scale


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    clips = [c for c in argv if c in CLIPS] or list(CLIPS)
    root = bpy.path.abspath("//../..")
    arm = bpy.data.objects[ARMATURE]
    ad = arm.animation_data
    saved = {t.name: t.mute for t in ad.nla_tracks}
    for t in ad.nla_tracks:
        t.mute = True
    ad.action = None
    fps = bpy.context.scene.render.fps / bpy.context.scene.render.fps_base

    print("== ретаргет")
    for clip in clips:
        path = f"{root}/{ANIM_DIR}/{CLIPS[clip]}"
        src, imported, new_actions, src_fps = import_source(path)
        names = {b.name for b in src.data.bones}
        prof = next(p for p in PROFILES.values() if p["detect"] in names)
        action = src.animation_data.action
        s, e = (int(round(v)) for v in action.frame_range)
        samples = sample_source(src, prof, range(s, e + 1))

        for t in [t for t in ad.nla_tracks if t.name == clip]:
            ad.nla_tracks.remove(t)
        old = bpy.data.actions.get(clip)
        if old:
            bpy.data.actions.remove(old)
        target = bpy.data.actions.new(clip)
        target.use_fake_user = True
        target["posture"] = True
        target["side"] = True
        scale = retarget(arm, samples, prof, fps / src_fps, 1, target, ROOT_MOTION.get(clip, 0.0))

        track = ad.nla_tracks.new()
        track.name = clip
        track.strips.new(clip, 1, target).action_slot = target.slots[0]
        track.mute = True
        saved[clip] = True

        for o in imported:
            data, kind = o.data, o.type
            bpy.data.objects.remove(o, do_unlink=True)
            if data is not None and data.users == 0:
                (bpy.data.meshes if kind == "MESH" else bpy.data.armatures).remove(data)
        for a in new_actions:
            if a.users == 0:
                bpy.data.actions.remove(a)
        log(f"{clip}: {CLIPS[clip]} ({[k for k, v in PROFILES.items() if v is prof][0]}), "
            f"{e - s + 1} кадров @ {src_fps:g} fps, масштаб {scale:.2f}")

    for t in ad.nla_tracks:
        t.mute = saved.get(t.name, True)
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_mainfile()
    print("== saved")


main()
