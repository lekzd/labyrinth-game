import bpy
import sys

def print_and_rename_animation_names(input_file_path, output_file_path):
    # Clear existing scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import the FBX file
    bpy.ops.import_scene.fbx(filepath=input_file_path)

    # Rename animation names and ensure they are linked to the armature
    actions = bpy.data.actions
    armature = None

    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armature = obj
            break

    if armature:
        for i, action in enumerate(actions):
            old_name = action.name
            new_name = old_name.replace("CharacterArmature|CharacterArmature|", "")
            action.name = new_name
            print(f"Renamed Animation {i+1}: {old_name} to {new_name}")

            # Assign action to armature
            if not armature.animation_data:
                armature.animation_data_create()
            armature.animation_data.action = action

            # Create NLA track
            track = armature.animation_data.nla_tracks.new()
            track.name = new_name
            strip = track.strips.new(new_name, int(action.frame_range[0]), action)
            strip.action = action

        # Clear temporary action
        armature.animation_data.action = None
    
    # Export the modified model to GLTF format
    bpy.ops.export_scene.gltf(filepath=output_file_path, export_format='GLB', export_animations=True)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: blender --background --python fbx_to_glb.py -- input_file.fbx output_file.gltf")
    else:
        input_fbx_file_path = sys.argv[sys.argv.index("--") + 1]
        output_gltf_file_path = sys.argv[sys.argv.index("--") + 2]
        print_and_rename_animation_names(input_fbx_file_path, output_gltf_file_path)