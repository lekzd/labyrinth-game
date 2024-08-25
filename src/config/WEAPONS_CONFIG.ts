import { loads, weaponType } from "@/loader";
import { ArrowEffect } from "../effects/ArrowEffect";
import { SwordTailEffect } from "../effects/SwordTailEffect";
import { MinigunEffect } from "../effects/MinigunEffect";
import { MagicBallEffect } from "../effects/MagicBallEffect";
import { AbstactEffect } from "../effects/AbstactEffect";
import { NpcAnimationStates } from "@/objects/hero/NpcAnimationStates.ts";
import { Color, Vector2, Vector3 } from "three";
import { SpriteEffect } from "@/effects/SpriteEffect";
import { HitContactType } from "@/types/HitContactType";

interface IWeaponConfig {
  type: weaponType;
  animations: Array<keyof typeof NpcAnimationStates>;
  attackDistance: number;
  attackEffect: AbstactEffect;
  particlesColor: Color;
  swingTime: number;
  isShooting: boolean;
  isMagic: boolean;
  isMelee: boolean;
  hitImpactFx: Record<
    HitContactType,
    (position: Vector3) => ReturnType<typeof SpriteEffect>
  >;
}

type FxProps = Omit<Parameters<typeof SpriteEffect>[0], "texture"> & {
  texture: string;
};

const getFxEffect = (props: Partial<FxProps>) => {
  return (position: Vector3) =>
    SpriteEffect({
      size: new Vector2(1, 1),
      scale: 0,
      rotation: 0,
      ...props,
      // @ts-expect-error
      texture: loads.texture[props.texture!],
      position
    });
};

const getHammerFx = (props: Partial<FxProps>) =>
  getFxEffect({
    texture: "fx_hammer_hit.png",
    size: new Vector2(4, 4),
    scale: 13,
    rotation: Math.PI * Math.random(),
    ...props
  });

const getBloodFx = (props: Partial<FxProps>) =>
  getFxEffect({
    texture: "fx_body_hit.png",
    size: new Vector2(4, 4),
    scale: 15,
    rotation: Math.PI * -0.1,
    ...props
  });

const getHitFx = (props: Partial<FxProps>) =>
  getFxEffect({
    texture: "fx_sparks.png",
    size: new Vector2(4, 4),
    scale: 10,
    rotation: Math.PI * -0.1,
    color: new Color("#FAEB9C"),
    ...props
  });

const getSwordFx = (props: Partial<FxProps>) =>
  getFxEffect({
    texture: "fx_fire_sparks.png",
    size: new Vector2(4, 4),
    scale: 10,
    rotation: Math.PI * -0.1,
    color: new Color("#FAEB9C"),
    ...props
  });

const getMagicSplashFx = (props: Partial<FxProps>) =>
  getFxEffect({
    texture: "fx_magic_splash.png",
    size: new Vector2(4, 4),
    scale: 20,
    ...props
  });

const getShootingWeaponConfig = (
  props: Partial<IWeaponConfig>
): IWeaponConfig => ({
  type: weaponType.arrow,
  animations: [],
  swingTime: 500,
  attackDistance: 500,
  attackEffect: new ArrowEffect(),
  particlesColor: new Color("#FAEB9C"),
  isShooting: true,
  isMagic: false,
  isMelee: false,
  hitImpactFx: {
    [HitContactType.Body]: getBloodFx({}),
    [HitContactType.Other]: getHammerFx({
      scale: 7
    })
  },
  ...props
});

const getMeleeWeaponConfig = (
  props: Partial<IWeaponConfig>
): IWeaponConfig => ({
  type: weaponType.arrow,
  animations: [],
  swingTime: 500,
  attackDistance: 10,
  attackEffect: new SwordTailEffect(),
  particlesColor: new Color("#FAEB9C"),
  isShooting: false,
  isMagic: false,
  isMelee: true,
  hitImpactFx: {
    [HitContactType.Body]: getBloodFx({
      scale: 5,
      rotation: Math.PI * -0.1,
      color: new Color("#a80202")
    }),
    [HitContactType.Other]: getSwordFx({})
  },
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
    swingTime: 50,
    animations: [NpcAnimationStates.dagger_attack2],
    attackEffect: new SwordTailEffect(),
    hitImpactFx: {
      [HitContactType.Body]: getBloodFx({
        scale: 10,
        rotation: Math.PI * -0.1,
        color: new Color("#a80202")
      }),
      [HitContactType.Other]: getSwordFx({
        scale: 4,
        rotation: Math.PI * -0.1
      })
    }
  }),
  [weaponType.hammer]: getMeleeWeaponConfig({
    type: weaponType.hammer,
    swingTime: 500,
    animations: [NpcAnimationStates.hammer_attack],
    attackDistance: 25,
    attackEffect: new SwordTailEffect(),
    hitImpactFx: {
      [HitContactType.Body]: getHammerFx({
        color: new Color("#7b0000")
      }),
      [HitContactType.Other]: getHammerFx({})
    }
  }),
  [weaponType.katana]: getMeleeWeaponConfig({
    type: weaponType.katana,
    swingTime: 150,
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
    particlesColor: new Color("#9cfafa"),
    hitImpactFx: {
      [HitContactType.Body]: getMagicSplashFx({}),
      [HitContactType.Other]: getMagicSplashFx({})
    }
  }),
  [weaponType.staff2]: getShootingWeaponConfig({
    type: weaponType.staff2,
    animations: [NpcAnimationStates.staff_attack],
    attackDistance: 500,
    attackEffect: new MagicBallEffect(),
    particlesColor: new Color("#9cfafa"),
    hitImpactFx: {
      [HitContactType.Body]: getMagicSplashFx({}),
      [HitContactType.Other]: getMagicSplashFx({})
    }
  }),
  [weaponType.sword]: getMeleeWeaponConfig({
    type: weaponType.sword,
    swingTime: 200,
    animations: [NpcAnimationStates.sword_attackfast],
    attackDistance: 25,
    attackEffect: new SwordTailEffect(),
    hitImpactFx: {
      [HitContactType.Body]: getBloodFx({
        scale: 12,
        rotation: Math.PI * -0.2,
        color: new Color("#a80202")
      }),
      [HitContactType.Other]: getSwordFx({
        scale: 12,
        rotation: Math.PI * -0.2
      })
    }
  }),
  [weaponType.swordLazer]: getMeleeWeaponConfig({
    type: weaponType.swordLazer,
    swingTime: 50,
    animations: [NpcAnimationStates.sword_attackfast],
    attackDistance: 17,
    attackEffect: new SwordTailEffect(),
    particlesColor: new Color("#7cf869"),
    hitImpactFx: {
      [HitContactType.Body]: getBloodFx({
        scale: 12,
        rotation: Math.PI * -0.2,
        color: new Color("#a80202")
      }),
      [HitContactType.Other]: getHitFx({
        scale: 12,
        rotation: Math.PI * -0.2,
        color: new Color("#7cf869")
      })
    }
  })
};
