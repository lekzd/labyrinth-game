import { NpcAnimationStates } from "@/objects/hero/NpcAnimationStates";
import { CharacterFSM } from "@/utils/CharacterFSM";
import { initAnimations } from "@/utils/initAnimations";
import { AnimationClip, AnimationMixer, Object3D, Object3DEventMap } from "three";

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

