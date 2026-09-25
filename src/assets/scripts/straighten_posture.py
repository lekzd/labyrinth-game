"""
Выпрямляет осанку Journey во всех клипах (Blender 5.x).

Запуск (повторный запуск ничего не меняет):
  blender -b public/model/characters.blend --python src/assets/scripts/straighten_posture.py
Потом: rebuild_cloak.py -> bake_cloth.py + export_journey.py.

В исходных клипах корпус наклонён вперёд на 10–23° (от таза к шее), голова вынесена —
спина дугой, и накидка с капюшоном повторяют её: со спины горб. Каждая кость позвоночника
в каждом кадре дополнительно поворачивается назад на угол из BACK (в пространстве арматуры,
вокруг оси X в её суставе) — наклоны складываются по цепочке. Руки/ноги/движения не меняются.
Уже обработанные клипы помечены свойством "posture" и пропускаются.
"""
import math
import bpy
from mathutils import Matrix

ARMATURE = "Journey"
# градусы назад (положительное — выпрямление), по костям снизу вверх
BACK = {"spine.001": 4, "spine.002": 4, "spine.003": 4, "spine.004": 5, "spine.005": 5}


def lean(arm):
    pb = arm.pose.bones
    d = pb["spine.006"].head - pb["spine"].head
    return math.degrees(math.atan2(-d.y, d.z))


def side_lean(arm):
    pb = arm.pose.bones
    d = pb["spine.006"].head - pb["spine"].head
    return math.degrees(math.atan2(d.x, d.z))


def straighten_sideways(arm):
    """Средний боковой наклон клипа (в idle ~5° влево) убирается поворотом позвоночника
    вокруг оси "вперёд"; покачивания внутри клипа остаются."""
    ad = arm.animation_data
    scene = bpy.context.scene
    bones = [pb for pb in sorted(arm.pose.bones, key=lambda b: len(b.parent_recursive)) if pb.name in BACK]
    for track in ad.nla_tracks:
        action = track.strips[0].action if track.strips else None
        if not action or action.get("side"):
            continue
        ad.action = action
        ad.action_slot = action.slots[0]
        start, end = (int(round(v)) for v in action.frame_range)
        first = None
        for _ in range(6):   # хорда таз-макушка поворачивается меньше суммы углов — итерируем
            frames, leans = {}, []
            for f in range(start, end + 1):
                scene.frame_set(f)
                leans.append(side_lean(arm))
                frames[f] = {pb.name: pb.matrix.copy() for pb in arm.pose.bones}
            mean = sum(leans) / len(leans)
            first = mean if first is None else first
            if abs(mean) < 0.3:
                break
            step = math.radians(mean) / len(bones) * 2
            for f, poses in frames.items():
                new = dict(poses)
                for pb in bones:
                    pivot = new[pb.name].translation.copy()
                    rot = Matrix.Translation(pivot) @ Matrix.Rotation(-step, 4, "Y") @ Matrix.Translation(-pivot)
                    for other in [pb] + list(pb.children_recursive):
                        new[other.name] = rot @ new[other.name]
                scene.frame_set(f)
                for pb in bones:
                    pb.matrix = new[pb.name]
                    bpy.context.view_layer.update()
                    pb.keyframe_insert("rotation_quaternion", frame=f, group=pb.name)
                    pb.keyframe_insert("location", frame=f, group=pb.name)
        after = [mean]
        action["side"] = True
        print(f"  {track.name}: наклон вбок {first:+.1f}° -> {mean:+.1f}°")
    ad.action = None


def main():
    arm = bpy.data.objects[ARMATURE]
    ad = arm.animation_data
    scene = bpy.context.scene
    ad.action = None
    order = [pb for pb in sorted(arm.pose.bones, key=lambda b: len(b.parent_recursive)) if pb.name in BACK]
    for track in ad.nla_tracks:
        action = track.strips[0].action if track.strips else None
        if not action or action.get("posture"):
            continue
        for t in ad.nla_tracks:
            t.mute = t != track
        bpy.context.view_layer.update()
        start, end = (int(round(v)) for v in action.frame_range)

        # позы костей позвоночника по кадрам (пространство арматуры) до правки
        frames = {}
        before = []
        for f in range(start, end + 1):
            scene.frame_set(f)
            before.append(lean(arm))
            frames[f] = {pb.name: pb.matrix.copy() for pb in arm.pose.bones}

        # новые матрицы: поворот назад в суставе каждой кости, накопленный вниз по цепочке
        ad.action = action
        ad.action_slot = action.slots[0]
        track.mute = True
        for f, poses in frames.items():
            new = dict(poses)
            for pb in order:
                pivot = new[pb.name].translation.copy()
                rot = Matrix.Translation(pivot) @ Matrix.Rotation(-math.radians(BACK[pb.name]), 4, "X") \
                    @ Matrix.Translation(-pivot)
                # кость и всё, что ниже неё по иерархии, поворачиваются вместе
                for other in [pb] + list(pb.children_recursive):
                    new[other.name] = rot @ new[other.name]
            scene.frame_set(f)
            for pb in order:
                pb.matrix = new[pb.name]
                bpy.context.view_layer.update()
                pb.keyframe_insert("rotation_quaternion", frame=f, group=pb.name)
                pb.keyframe_insert("location", frame=f, group=pb.name)
        ad.action = None
        action["posture"] = True

        track.mute = False
        bpy.context.view_layer.update()
        after = []
        for f in range(start, end + 1):
            scene.frame_set(f)
            after.append(lean(arm))
        track.mute = True
        print(f"  {track.name}: наклон корпуса {sum(before) / len(before):.1f}° -> {sum(after) / len(after):.1f}°")

    for t in ad.nla_tracks:
        t.mute = True
    straighten_sideways(arm)
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_mainfile()
    print("== saved")


main()
