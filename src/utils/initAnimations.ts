import { animationType } from "@/loader";
import { AnimationClip, AnimationMixer, Object3D, Object3DEventMap, Group } from "three";

export type Animations = Partial<Record<animationType, Group<Object3DEventMap>>>;

export function initAnimations(
    target: Object3D<Object3DEventMap>,
    mixer: AnimationMixer
  ) {
    target.animations.forEach(function(clip) {
      for(var t = clip.tracks.length - 1; t >= 0; t--) {
        var track = clip.tracks[t];
        var isStatic = true;
        var inc = track.name.split(".")[1] == "quaternion" ? 4 : 3;
  
        for(var i = 0; i < track.values.length - inc; i += inc) {
          for(var j = 0; j < inc; j++) {
            if(Math.abs(track.values[i + j] - track.values[i + j + inc]) > 0.000001) {
              isStatic = false;
              //console.log("found change: " + clip.name + " -> " + track.name);
              break;
            }
          }
  
          if(!isStatic)
            break;
        }
  
        if(isStatic) {
          clip.tracks.splice(t, 1);
        }
      }
    });
  
    const animations = [
      ...target.animations.map((animation) => animation.clone()),
      ...pullAnimations(loads.animation)
    ];
  
    for (const clip of animations) {
      const name = clip.name
        .toLowerCase()
        .replace("characterarmature|", "") as AnimationName;
      animations[name] = {
        clip: clip,
        action: mixer.clipAction(clip)
      };
    }
  
    return animations;
  }
  
  export function pullAnimations(animation: Animations): AnimationClip[] {
    const result = [];
    for (const name in animation) {
      const animationType = animation[name as keyof typeof animation];
      if (animationType) {
        for (const animation of animationType.animations) {
          animation.name = name;
          result.push(animation.clone());
        }
      }
    }
    return result;
  }