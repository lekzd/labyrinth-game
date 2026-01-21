import { NpcAnimationStates } from "@/objects/hero/NpcAnimationStates";
import { CharacterFSM } from "@/utils/CharacterFSM";
import { AnimationClip, AnimationMixer, Object3D, Object3DEventMap } from "three";
import {animationType} from '@/loader';

type AnimationName = keyof typeof NpcAnimationStates;

interface AnimationEntityProps {
  target: Object3D<Object3DEventMap>;
}

export class AnimationEntity {
  target: Object3D<Object3DEventMap>;
  animations: AnimationClip[];
  mixer: AnimationMixer;
  private stateMachine: ReturnType<typeof CharacterFSM>;
  private stateMachine2: ReturnType<typeof CharacterFSM>;

  constructor(props: AnimationEntityProps) {
    this.target = props.target;
    
    this.mixer = new AnimationMixer(this.target);
    this.mixer.timeScale = 1.5;

    this.animations = initAnimations(this.target, this.mixer);

    this.stateMachine = this.initStateMashine(this.animations);
    this.stateMachine2 = this.initStateMashine(this.animations);
  }

  private initStateMashine(animations: AnimationClip[]) {
    const stateMachine = CharacterFSM({ animations });
    stateMachine.setState("idle");
    return stateMachine;
  }
  
  setBaseAnimation(animation: AnimationName) {
    this.stateMachine.update(animation);
  }

  setAdditionsAnimation(animation: AnimationName) {
    this.stateMachine2.update(animation);
  }

  update(timeInSeconds: number) {
    this.mixer.update(timeInSeconds);
  }
  
}

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
    // ...pullAnimations(loads.animation),
    ...target.animations.map((animation) => animation.clone()),
  ];

  for (const clip of animations) {
    const name = clip.name;

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