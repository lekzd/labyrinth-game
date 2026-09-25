"""
Экспорт персонажа из characters.blend в GLB для игры (Blender 5.x).

Запуск (вместе с запеканием ткани, файл не сохраняется):
  blender -b public/model/characters.blend --python src/assets/scripts/bake_cloth.py \
                                           --python src/assets/scripts/export_journey.py
Без запекания: ... --python export_journey.py -- [armature] [output.glb]
  по умолчанию: Journey -> public/model/Journey.glb

Клипы берутся из NLA-треков арматуры (имя трека = имя клипа в игре).
Запечённая ткань (<меш>_bake из bake_cloth.py) идёт морфами вместо исходного меша.
Cloth/Collision на время экспорта выключаются: симуляция в glTF не попадает,
а применённая на текущем кадре ткань "замораживает" плащ в случайной позе.
"""
import os
import sys
import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
name = argv[0] if len(argv) > 0 else "Journey"
root = os.path.dirname(bpy.data.filepath)
out = argv[1] if len(argv) > 1 else os.path.join(root, f"{name}.glb")

view_layer = bpy.context.view_layer
arm = bpy.data.objects[name]
meshes = [
    o for o in arm.children_recursive
    if o.type == "MESH" and o.name in view_layer.objects
]
# Если ткань запечена (bake_cloth.py), экспортируем копию с shape keys вместо исходника с Cloth
baked = {o.name for o in meshes if o.name.endswith("_bake")}
objects = [arm] + [o for o in meshes if f"{o.name}_bake" not in baked]

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
active_action = ad.action if ad else None
muted = [t for t in ad.nla_tracks if t.mute] if ad else []
if ad:
    ad.action = None
    for t in muted:
        t.mute = False

bpy.context.scene.frame_set(1)

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
    export_morph=True,
    export_morph_normal=True,
    export_morph_animation=True,
    export_def_bones=False,
    export_optimize_animation_size=True,
)

for m in disabled:
    m.show_viewport = True
if ad:
    ad.action = active_action
    for t in muted:
        t.mute = True

print("== exported", out, [o.name for o in objects])
