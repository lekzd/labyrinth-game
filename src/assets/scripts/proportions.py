"""
Пропорции Journey: короче ноги и руки (Blender 5.x). Один раз после straighten_rest.py.

Запуск (повторный запуск ничего не меняет):
  blender -b public/model/characters.blend --python src/assets/scripts/proportions.py
Потом: build_body.py -- X -> rebuild_cloak.py -> bake_cloth.py + export_journey.py

Кости ног и рук в T-позе прямые, поэтому укорочение вдоль кости не меняет их вращений —
клипы остаются корректными без пересчёта. Всё выше ног опускается на столько же, насколько
укоротились ноги (ступни на полу); ключи корня относительны позе покоя и едут вместе с ней.
Исходники головы/глаз/капюшона (*_src, пространство арматуры) сдвигаются так же.
Сдвиг пишется в свойство арматуры "z_shift" — rebuild_cloak.py поправляет свои высоты.
"""
import bpy
from mathutils import Matrix, Vector

ARMATURE = "Journey"
LEG = 0.8
ARM = 0.8
LEGS = ("thigh", "shin")
ARMS = ("upper_arm", "forearm", "hand")
SOURCES = ("Голова_src", "Глаза_src", "Шапка_src", "Шапка_src_orig")


def main():
    arm = bpy.data.objects[ARMATURE]
    if arm.get("proportions"):
        print("  пропорции уже применены")
        return
    bpy.context.view_layer.objects.active = arm
    for o in bpy.context.view_layer.objects:
        o.select_set(o == arm)
    # X-Axis Mirror дублирует каждую правку на кость другой стороны — применилось бы дважды
    mirror = arm.data.use_mirror_x
    arm.data.use_mirror_x = False
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    # связанные кости двигают хвост родителя вместе со своей головой — на время правки отвязываем
    connected = {b.name for b in eb if b.use_connect}
    for b in eb:
        b.use_connect = False

    hip = eb["thigh.L"].head.z
    shift = hip * (1 - LEG)      # ноги прямые до пола: длина ноги = высота бедра

    # 1. всё, кроме ног, вниз на shift
    for b in eb:
        if not b.name.startswith(LEGS):
            b.head.z -= shift
            b.tail.z -= shift
    def move(bone, delta):
        for c in [bone] + list(bone.children_recursive):
            c.head += delta
            c.tail += delta

    # 2. ноги: от (опущенного) бедра вниз, короче; стопа — за концом голени
    for side in ("L", "R"):
        thigh, shin = eb[f"thigh.{side}"], eb[f"shin.{side}"]
        old_tail = shin.tail.copy()
        thigh_d, shin_d = thigh.tail - thigh.head, shin.tail - shin.head   # до правок: кости связаны
        top = Vector((thigh.head.x, thigh.head.y, hip - shift))
        thigh.head = top
        thigh.tail = top + thigh_d * LEG
        shin.head = thigh.tail.copy()
        shin.tail = shin.head + shin_d * LEG
        for c in shin.children:
            move(c, shin.tail - old_tail)
    # 3. руки короче вдоль кости; сокет оружия — на той же доле кисти
    for side in ("L", "R"):
        prev = None
        for name in ARMS:
            b = eb[f"{name}.{side}"]
            old_head = b.head.copy()
            d = b.tail - b.head
            if prev is not None:
                b.head = prev.tail.copy()
            b.tail = b.head + d * ARM
            if name == "hand":
                for c in b.children:
                    move(c, b.head + (c.head - old_head) * ARM - c.head)
            prev = b
    for name in connected:
        eb[name].use_connect = True
    bpy.ops.object.mode_set(mode="OBJECT")
    arm.data.use_mirror_x = mirror

    for name in SOURCES:
        m = bpy.data.meshes.get(name)
        if m:
            m.transform(Matrix.Translation((0, 0, -shift)))
    arm["proportions"] = True
    arm["z_shift"] = shift
    bpy.ops.wm.save_mainfile()
    print(f"  ноги x{LEG}, руки x{ARM}, верх опущен на {shift:.3f}")
    print("== saved")


main()
