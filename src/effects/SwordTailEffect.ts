import { Tween } from "@tweenjs/tween.js";
import { Hero } from "../objects/hero/Hero";
import {
  BufferAttribute,
  CatmullRomCurve3,
  Mesh,
  TubeGeometry,
  Vector3
} from "three";
import { scene } from "@/scene";
import { SwordPathMaterial } from "@/materials/swordPath";
import { AbstactEffect } from "./AbstactEffect";
import { WEAPONS_CONFIG } from "../config/WEAPONS_CONFIG";
import { systems } from "@/systems";
import { BloodDropsEffect } from "./BloodDropsEffect";
import { weaponType } from "@/loader";

export class SwordTailEffect implements AbstactEffect {
  pointsLimit: number;
  pointIndices: Float32Array;

  constructor() {
    this.pointsLimit = 100;

    this.pointIndices = new Float32Array(this.pointsLimit * 3 + 3);
    for (let i = 0; i < this.pointIndices.length; i++) {
      this.pointIndices[i] = Math.floor(this.pointsLimit - i / 3);
    }
  }

  run(person: Hero) {
    const points: Vector3[] = [];
    const mountedEffects: Mesh[] = [];
    let iteration = -1;
    const startTime = Date.now();

    const weaponRight = person.weaponObject;
    const peakPoint = weaponRight.getObjectByName("peak_point");
    const weaponTopPosition = peakPoint?.position;

    if (!weaponTopPosition) {
      return;
    }

    const weapon = person.props.weapon ?? weaponType.sword;

    const color = WEAPONS_CONFIG[weapon].particlesColor;
    const swingTime = WEAPONS_CONFIG[weapon].swingTime;
    const hitImpactFx = WEAPONS_CONFIG[weapon].hitImpactFx;

    const tubeMaterial = new SwordPathMaterial({
      color,
      pointsLimit: this.pointsLimit
    });

    const drawSwordTail = (points: Vector3[]) => {
      const curve = new CatmullRomCurve3(points);
      const tubeGeometry = new TubeGeometry(
        curve,
        this.pointsLimit,
        0.2,
        2,
        false
      );
      const tube = new Mesh(tubeGeometry, tubeMaterial);

      tubeGeometry.setAttribute(
        "pointIndex",
        new BufferAttribute(this.pointIndices, 1)
      );

      mountedEffects.forEach((child) => {
        scene.remove(child);
      });

      scene.add(tube);
      mountedEffects.push(tube);
    };

    const onUpdate = () => {
      iteration++;

      const worldPosition = peakPoint.localToWorld(new Vector3(0, 0, 0));

      points.unshift(worldPosition);

      if (points.length > 2) {
        drawSwordTail(points.slice(0, this.pointsLimit));
      }

      if (Date.now() - startTime < swingTime) {
        return;
      }

      const result = systems.objectsSystem.checkPointHitColision(
        worldPosition,
        person.id
      );

      if (result) {
        animation.stop();
      person.animated = false;

        // const effect = new BloodDropsEffect(color);
        const fxEffect = hitImpactFx[result]?.(worldPosition);

        // effect.run(person.props, worldPosition);

        let pointsLeft = points.length;

        new Tween({ i: 0 })
          .to({ i: 16 }, 200)
          .onUpdate(({ i }) => {
            fxEffect.update(Math.floor(i));

            const progress = 1 - (i / 16);
            const pointsCount = Math.floor(pointsLeft * progress)

            if (pointsCount > 2) {
              drawSwordTail(points.slice(0, pointsCount));
              pointsLeft--;
            }
          })
          .onComplete(() => {
            fxEffect.remove();
            mountedEffects.forEach((child) => {
              scene.remove(child);
            });
          })
          .start();

        setTimeout(() => {
          animation.stop();
          mountedEffects.forEach((child) => {
            scene.remove(child);
          });
          person.animated = true;
        }, 200);
        return;
      }
    };

    const animation = new Tween({ i: 0 })
      .to({ i: 10 }, 700)
      .onUpdate(onUpdate)
      .onComplete(() => {
        mountedEffects.forEach((child) => {
          scene.remove(child);
        });
      })
      .start();
  }
}
