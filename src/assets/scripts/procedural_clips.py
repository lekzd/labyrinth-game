"""
Клипы взаимодействия, которых нет в исходниках (Blender 5.x): pickup, interact, receivehit.

Запуск (можно повторять — клипы пересоздаются):
  blender -b public/model/characters.blend --python src/assets/scripts/procedural_clips.py
Потом: bake_cloth.py + export_journey.py.

Клип строится поверх позы idle: в ключевых моментах (доля клипа 0..1) суставы поворачиваются
в пространстве арматуры вокруг осей X (вперёд/назад) и Y (вбок), повороты складываются вниз
по иерархии, таз опускается на "drop". Между ключами — сглаженная интерполяция,
первый и последний ключ — idle без смещений (клип начинается и заканчивается стойкой).
Знаки: X > 0 — наклон вперёд для корпуса/головы; для бедра X < 0 — колено вперёд;
для руки X < 0 — мах вперёд; Y — отведение вбок (для правой руки Y > 0 — наружу).
"""
import math
import bpy
from mathutils import Matrix, Vector

ARMATURE = "Journey"
FPS = 30

CLIPS = {
    # подобрать с земли: присесть, наклониться, правая рука к земле
    "pickup": {
        "frames": 36,
        "keys": [
            (0.0, {}, 0.0),
            (0.45, {
                "spine.001": ("X", 18), "spine.002": ("X", 14), "spine.003": ("X", 10),
                "spine.005": ("X", -10),
                "thigh.L": ("X", -55), "shin.L": ("X", 95),
                "thigh.R": ("X", -45), "shin.R": ("X", 85),
                "upper_arm.R": ("X", -55), "forearm.R": ("X", -15),
                "upper_arm.L": ("X", -15),
            }, 0.34),
            (0.6, {
                "spine.001": ("X", 18), "spine.002": ("X", 14), "spine.003": ("X", 10),
                "spine.005": ("X", -10),
                "thigh.L": ("X", -55), "shin.L": ("X", 95),
                "thigh.R": ("X", -45), "shin.R": ("X", 85),
                "upper_arm.R": ("X", -40), "forearm.R": ("X", -45),
                "upper_arm.L": ("X", -15),
            }, 0.34),
            (1.0, {}, 0.0),
        ],
    },
    # взаимодействие (пазл, рычаг): шаг-наклон и толчок правой рукой вперёд
    "interact": {
        "frames": 30,
        "keys": [
            (0.0, {}, 0.0),
            (0.35, {
                "spine.002": ("X", 6), "spine.003": ("X", 4),
                "upper_arm.R": ("X", -80), "forearm.R": ("X", -10),
                "thigh.R": ("X", -10), "shin.R": ("X", 12),
            }, 0.02),
            (0.55, {
                "spine.002": ("X", 8), "spine.003": ("X", 6),
                "upper_arm.R": ("X", -85), "forearm.R": ("X", 0),
                "thigh.R": ("X", -10), "shin.R": ("X", 12),
            }, 0.02),
            (1.0, {}, 0.0),
        ],
    },
    # получение урона: быстрое вздрагивание назад, руки чуть в стороны
    "receivehit": {
        "frames": 15,
        "keys": [
            (0.0, {}, 0.0),
            (0.25, {
                "spine.001": ("X", -8), "spine.002": ("X", -8), "spine.003": ("X", -6),
                "spine.005": ("X", -10),
                "upper_arm.L": ("Y", -15), "upper_arm.R": ("Y", 15),
            }, 0.02),
            (1.0, {}, 0.0),
        ],
    },
}


def smoothstep(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def blend(keys, t):
    """Углы и опускание таза в момент t (0..1) — сглаженно между соседними ключами."""
    for (t0, a0, d0), (t1, a1, d1) in zip(keys, keys[1:]):
        if t0 <= t <= t1:
            k = smoothstep((t - t0) / (t1 - t0))
            names = set(a0) | set(a1)
            out = {}
            for n in names:
                ax = (a1.get(n) or a0.get(n))[0]
                v0 = a0[n][1] if n in a0 else 0.0
                v1 = a1[n][1] if n in a1 else 0.0
                out[n] = (ax, v0 + (v1 - v0) * k)
            return out, d0 + (d1 - d0) * k
    return {}, 0.0


def main():
    arm = bpy.data.objects[ARMATURE]
    ad = arm.animation_data
    scene = bpy.context.scene
    saved = {t.name: t.mute for t in ad.nla_tracks}
    for t in ad.nla_tracks:
        t.mute = True
    bones = arm.data.bones
    rest = {b.name: b.matrix_local.copy() for b in bones}
    order = sorted(arm.pose.bones, key=lambda pb: len(pb.parent_recursive))

    # базовая поза — первый кадр idle
    idle = bpy.data.actions["idle"]
    ad.action = idle
    ad.action_slot = idle.slots[0]
    scene.frame_set(int(idle.frame_range[0]))
    base = {pb.name: pb.matrix.copy() for pb in arm.pose.bones}
    ad.action = None

    print("== процедурные клипы")
    for name, spec in CLIPS.items():
        for t in [t for t in ad.nla_tracks if t.name == name]:
            ad.nla_tracks.remove(t)
        old = bpy.data.actions.get(name)
        if old:
            bpy.data.actions.remove(old)
        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        action["posture"] = True
        action["side"] = True
        ad.action = action

        n = spec["frames"]
        for f in range(n + 1):
            angles, drop = blend(spec["keys"], f / n)
            pose = dict(base)
            pose["spine"] = Matrix.Translation((0, 0, -drop)) @ pose["spine"]   # пространство арматуры
            for pb in order:
                if pb.parent and pb.name != "spine":
                    # потомок следует за родителем, изменённым выше по иерархии
                    par = pb.parent.name
                    pose[pb.name] = pose[par] @ base[par].inverted() @ base[pb.name]
                if pb.name in angles:
                    ax, deg = angles[pb.name]
                    pivot = pose[pb.name].translation.copy()
                    rot = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(deg), 4, ax) \
                        @ Matrix.Translation(-pivot)
                    pose[pb.name] = rot @ pose[pb.name]
            for pb in order:
                if pb.parent:
                    offset = rest[pb.parent.name].inverted() @ rest[pb.name]
                    local = offset.inverted() @ pose[pb.parent.name].inverted() @ pose[pb.name]
                else:
                    local = rest[pb.name].inverted() @ pose[pb.name]
                loc, q, _ = local.decompose()
                pb.location = loc if not pb.parent else Vector()
                pb.rotation_quaternion = q
                if not pb.parent:
                    pb.keyframe_insert("location", frame=f + 1, group=pb.name)
                pb.keyframe_insert("rotation_quaternion", frame=f + 1, group=pb.name)
        ad.action = None
        track = ad.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action).action_slot = action.slots[0]
        track.mute = True
        saved[name] = True
        print(f"  {name}: {n + 1} кадров")

    for t in ad.nla_tracks:
        t.mute = saved.get(t.name, True)
    scene.frame_set(1)
    bpy.ops.wm.save_mainfile()
    print("== saved")


main()
