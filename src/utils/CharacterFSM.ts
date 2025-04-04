import { NpcAdditionalAnimations, NpcAnimationStates, NpcBaseAnimations } from "@/objects/hero/NpcAnimationStates";
import { AnimationAction, AnimationClip, LoopOnce } from "three";

type AnimationName = keyof typeof NpcAnimationStates;
type AnimationControllers = Record<
  AnimationName,
  {
    action: AnimationAction;
    clip: AnimationClip;
  }
>;

interface StateAction extends ReturnType<typeof action> {
  Exit?: () => void;
}

export function CharacterFSM({ animations }: { animations: AnimationControllers }) {
  let currentState: StateAction;

  const setState = (name: AnimationName) => {
    const prevState = currentState;

    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      //calling the Exit method from State
      if (prevState.Exit) prevState.Exit();
    }
    //creating new instance of a state class
    currentState = action(animations, name);

    //calling the Enter method from State
    currentState.Enter(prevState);
  };

  return {
    get currentState() {
      return currentState;
    },
    setState,
    update(next: AnimationName) {
      setState(next);
    }
  };
}

function action(animations: AnimationControllers, Name: AnimationName) {
  return {
    Name,
    Enter(prevState: StateAction) {
      const curAction = animations[Name]?.action || { play: () => {} };

      // TODO: разделить анимации на базовые из NpcBaseAnimations и дополнительные из NpcAdditionalAnimations
      // допольнительные анимации не должны вызывать crossFadeFrom
      // пример тут: https://threejs.org/examples/#webgl_animation_skinning_additive_blending
      if (prevState) {
        const prevAction = animations[prevState.Name]?.action;

        curAction.time = 0.0;
        curAction.enabled = true;
        curAction.weight = Name in NpcAdditionalAnimations ? 1000 : 500;

        if (Name in NpcAdditionalAnimations) {
          prevAction.stop();
          curAction.crossFadeFrom?.(prevAction, 0.1, true);
        } else {
          curAction.crossFadeFrom?.(prevAction, 0.5, true);
        }

        if (Name === NpcBaseAnimations.death) {
          curAction.clampWhenFinished = true;
          curAction.loop = LoopOnce;
        }

        curAction.play();
      } else {
        curAction.weight = Name in NpcAdditionalAnimations ? 500 : 1000;
        curAction.play();
      }
    }
  };
}