import { NpcBaseAnimations } from "@/objects/hero/NpcAnimationStates";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  Object3D,
  Object3DEventMap
} from "three";

interface AnimationEntityProps {
  target: Object3D<Object3DEventMap>;
}

// Кости верхней части тела (rigify-скелет после санитайза имён: spine001, upper_armL, handR…).
// Корневой spine (таз) и ноги остаются за базовым слоем
const UPPER_BODY = /^(spine\d+|chest|neck|head|shoulder|upper_arm|forearm|hand|weapon|breast)/i;

// Вес слоя атак: на верхней части тела почти полностью перекрывает базовый слой
const OVERLAY_WEIGHT = 10;
const BASE_FADE = 0.5;
const OVERLAY_FADE = 0.1;

/*
 * Два слоя анимаций с раздельными actions:
 * - base: idle/walk/run/death на всё тело
 * - overlay: атаки и заклинания только на верхнюю часть тела (если у скелета нет таких костей — на всё тело)
 * */
export class AnimationEntity {
  readonly mixer: AnimationMixer;
  readonly animations: AnimationClip[];
  private base = new Map<string, AnimationAction>();
  private overlay = new Map<string, AnimationAction>();
  private currentBase?: AnimationAction;
  private currentOverlay?: AnimationAction;

  constructor({ target }: AnimationEntityProps) {
    this.mixer = new AnimationMixer(target);
    this.mixer.timeScale = 1.5;

    this.animations = target.animations.map(withoutStaticTracks);

    for (const clip of this.animations) {
      this.base.set(clip.name, this.mixer.clipAction(clip));
      this.overlay.set(clip.name, this.mixer.clipAction(upperBodyClip(clip)));
    }

    this.setBaseAnimation(NpcBaseAnimations.idle);
  }

  setBaseAnimation(name: string) {
    const next = this.base.get(name);

    if (!next || next === this.currentBase) return;

    next.reset();

    if (name === NpcBaseAnimations.death) {
      next.setLoop(LoopOnce, 1);
      next.clampWhenFinished = true;
    }

    next.play();

    if (this.currentBase) next.crossFadeFrom(this.currentBase, BASE_FADE, true);

    this.currentBase = next;
  }

  setAdditionsAnimation(name?: string | null) {
    const next = name ? this.overlay.get(name) : undefined;

    if (next === this.currentOverlay) return;

    this.currentOverlay?.fadeOut(OVERLAY_FADE);

    if (next) {
      next.reset();
      next.setEffectiveWeight(OVERLAY_WEIGHT);
      next.fadeIn(OVERLAY_FADE).play();
    }

    this.currentOverlay = next;
  }

  getDuration(name: string) {
    const clip = this.animations.find((item) => item.name === name);

    return clip ? clip.duration / this.mixer.timeScale : 0;
  }

  update(timeInSeconds: number) {
    this.mixer.update(timeInSeconds);
  }
}

function upperBodyClip(clip: AnimationClip) {
  const tracks = clip.tracks.filter((track) => UPPER_BODY.test(track.name));

  // clone обязателен даже для fallback: mixer кэширует action по клипу
  return tracks.length
    ? new AnimationClip(clip.name, clip.duration, tracks)
    : clip.clone();
}

// Клипы модели общие для всех клонов (SkeletonUtils.clone копирует массив поверхностно),
// поэтому чистим копию и кэшируем результат
const cleanedClips = new WeakMap<AnimationClip, AnimationClip>();

function withoutStaticTracks(source: AnimationClip) {
  const cached = cleanedClips.get(source);

  if (cached) return cached.clone();

  const clip = source.clone();

  clip.tracks = clip.tracks.filter((track) => {
    const stride = track.getValueSize();
    const { values } = track;

    for (let i = stride; i < values.length; i++) {
      if (Math.abs(values[i] - values[i % stride]) > 0.000001) return true;
    }

    return false;
  });

  cleanedClips.set(source, clip);

  return clip.clone();
}
