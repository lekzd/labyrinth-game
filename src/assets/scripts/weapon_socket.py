"""
Сокеты оружия weapon.R / weapon.L в ладони Journey (Blender 5.x).

Запуск (можно повторять):
  blender -b public/model/characters.blend --python src/assets/scripts/weapon_socket.py

В игре оружие добавляется ребёнком узла "weaponR" без поворота; длинная ось моделей оружия — X,
поэтому ось X сокета направлена вдоль оружия, а кость сокета (ось Y) — вперёд. Раньше сокет наследовал скрученную ось кисти —
оружие торчало криво. Теперь в T-позе сокет смотрит вперёд и немного вверх (DIRECTION):
вперёд при любом положении руки остаётся вперёд, а "вверх" при опущенной руке становится
"наружу" — оружие отклонено от корпуса и не проходит сквозь него на бегу.
"""
import bpy
from mathutils import Vector

ARMATURE = "Journey"
# Оружие вертикально: вдоль руки к плечу (при опущенной руке — вверх), немного наружу (+Z позы
# покоя = наружу при опущенной руке). Плоскость оружия (его ось X) смотрит вперёд.
TILT_OUT = 0.25
ALONG_HAND = 0.6        # где в ладони: доля длины кости кисти
OUT = 0.07              # от оси кисти наружу: при опущенной руке +Z позы покоя смотрит от тела


def main():
    arm = bpy.data.objects[ARMATURE]
    mirror = arm.data.use_mirror_x
    arm.data.use_mirror_x = False
    bpy.context.view_layer.objects.active = arm
    for o in bpy.context.view_layer.objects:
        o.select_set(o == arm)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    for side, sign in (("R", -1), ("L", 1)):
        hand = eb[f"hand.{side}"]
        name = f"weapon.{side}"
        if name not in eb:
            eb.new(name)
        sock = eb[name]
        sock.use_connect = False
        sock.parent = eb[f"hand.{side}"]
        sock.use_deform = False
        head = hand.head.lerp(hand.tail, ALONG_HAND) + Vector((0, 0, OUT))
        up = -(hand.tail - hand.head).normalized()
        d = (up + Vector((0, 0, TILT_OUT))).normalized()
        # у моделей оружия длинная ось — X, плоскость лука — XY: ось X сокета = d (вверх вдоль
        # опущенной руки), ось Y (кость) — вперёд, Z = X × Y — вбок
        forward = Vector((0, -1, 0))
        forward = (forward - d * forward.dot(d)).normalized()
        sock.head = head
        sock.tail = head + forward * 0.06
        sock.align_roll(d.cross(forward))
        print(f"  {name}: {tuple(round(c, 3) for c in head)} -> {tuple(round(c, 2) for c in d)}")
    bpy.ops.object.mode_set(mode="OBJECT")
    arm.data.use_mirror_x = mirror
    bpy.ops.wm.save_mainfile()
    print("== saved")


main()
