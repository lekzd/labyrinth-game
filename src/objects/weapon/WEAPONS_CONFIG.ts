import { weaponType } from "@/loader";
import { ArrowEffect } from "../hero/ArrowEffect";
import { SwordTailEffect } from "../hero/SwordTailEffect";
import { MinigunEffect } from "../hero/MinigunEffect";
import { MagicBallEffect } from "../hero/MagicBallEffect";
import { AbstactEffect } from "../hero/AbstactEffect";
import {NpcAnimationStates} from "@/objects/hero/NpcAnimationStates.ts";
import { Color } from "three";

interface IWeaponConfig {
  type: weaponType;
  animations: Array<keyof typeof NpcAnimationStates>,
  attackDistance: number;
  attackEffect: AbstactEffect;
  particlesColor: Color;
  isShooting: boolean;
  isMagic: boolean;
  isMelee: boolean;
}

const getShootingWeaponConfig = (
  props: Partial<IWeaponConfig>
): IWeaponConfig => ({
  type: weaponType.arrow,
  animations: [],
  attackDistance: 500,
  attackEffect: new ArrowEffect(),
  particlesColor: new Color('#FAEB9C'),
  isShooting: true,
  isMagic: false,
  isMelee: false,
  ...props
});

const getMeleeWeaponConfig = (
  props: Partial<IWeaponConfig>
): IWeaponConfig => ({
  type: weaponType.arrow,
  animations: [],
  attackDistance: 10,
  attackEffect: new SwordTailEffect(),
  particlesColor: new Color('#FAEB9C'),
  isShooting: false,
  isMagic: false,
  isMelee: true,
  ...props
});

export const WEAPONS_CONFIG: Record<weaponType, IWeaponConfig> = {
  [weaponType.arrow]: getShootingWeaponConfig({
    type: weaponType.arrow,
    animations: [NpcAnimationStates.bow_attack],
    attackEffect: new ArrowEffect()
  }),
  [weaponType.crossbow]: getShootingWeaponConfig({
    type: weaponType.crossbow,
    animations: [],
    attackEffect: new ArrowEffect()
  }),
  [weaponType.dagger]: getMeleeWeaponConfig({
    type: weaponType.dagger,
    animations: [NpcAnimationStates.dagger_attack2],
    attackEffect: new SwordTailEffect()
  }),
  [weaponType.hammer]: getMeleeWeaponConfig({
    type: weaponType.hammer,
    animations: [NpcAnimationStates.hammer_attack],
    attackDistance: 25,
    attackEffect: new SwordTailEffect(),
  }),
  [weaponType.katana]: getMeleeWeaponConfig({
    type: weaponType.katana,
    animations: [NpcAnimationStates.sword_attackfast],
    attackDistance: 17,
    attackEffect: new SwordTailEffect()
  }),
  [weaponType.minigun]: getShootingWeaponConfig({
    type: weaponType.minigun,
    animations: [NpcAnimationStates.gunplay],
    attackDistance: 500,
    attackEffect: new MinigunEffect()
  }),
  [weaponType.staff]: getShootingWeaponConfig({
    type: weaponType.staff,
    animations: [NpcAnimationStates.staff_attack],
    attackDistance: 500,
    attackEffect: new MagicBallEffect(),
    particlesColor: new Color('#9cfafa'),
  }),
  [weaponType.staff2]: getShootingWeaponConfig({
    type: weaponType.staff2,
    animations: [NpcAnimationStates.staff_attack],
    attackDistance: 500,
    attackEffect: new MagicBallEffect(),
    particlesColor: new Color('#9cfafa'),
  }),
  [weaponType.sword]: getMeleeWeaponConfig({
    type: weaponType.sword,
    animations: [NpcAnimationStates.sword_attackfast],
    attackDistance: 25,
    attackEffect: new SwordTailEffect()
  }),
  [weaponType.swordLazer]: getMeleeWeaponConfig({
    type: weaponType.swordLazer,
    animations: [NpcAnimationStates.sword_attackfast],
    attackDistance: 17,
    attackEffect: new SwordTailEffect(),
    particlesColor: new Color('#7cf869'),
  })
};
