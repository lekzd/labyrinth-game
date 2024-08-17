import { Tween } from "@tweenjs/tween.js";
import { Hero } from "./Hero";
import {
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  Mesh,
  TubeGeometry,
  Vector3
} from "three";
import { scene } from "@/scene";
import { SwordPathMaterial } from "@/materials/swordPath";
import { AbstactEffect } from "./AbstactEffect";
import { WEAPONS_CONFIG } from "../weapon/WEAPONS_CONFIG";

export class SwordTailEffect implements AbstactEffect {
  pointsLimit: number;
  tubeMaterial: SwordPathMaterial;
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

    const weaponRight = person.weaponObject;
    const peakPoint = weaponRight.getObjectByName("peak_point");
    const weaponTopPosition = peakPoint?.position;

    if (!weaponTopPosition) {
      return;
    }

    const color = person.props.weapon
      ? WEAPONS_CONFIG[person.props.weapon].particlesColor
      : new Color(0xffffff);

    this.tubeMaterial = new SwordPathMaterial({
      color,
      pointsLimit: this.pointsLimit
    });

    const onUpdate = () => {
      iteration++;

      if (iteration % 3 !== 0) {
        return;
      }

      const worldPosition = peakPoint.localToWorld(new Vector3(0, 0, 0));

      points.unshift(worldPosition);

      if (points.length < 2) {
        return;
      }

      const curve = new CatmullRomCurve3(points.slice(0, this.pointsLimit));
      const tubeGeometry = new TubeGeometry(
        curve,
        this.pointsLimit,
        0.2,
        2,
        false
      );
      const tube = new Mesh(tubeGeometry, this.tubeMaterial);

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

    new Tween({ i: 0 })
      .delay(300)
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
