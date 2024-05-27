import { Tween } from "@tweenjs/tween.js";
import { Hero } from "./Hero";
import { BufferAttribute, CatmullRomCurve3, Mesh, TubeGeometry, Vector3 } from "three";
import { scene } from "@/scene";
import { SwordPathMaterial } from "@/materials/swordPath";

export class SwordTailEffect {
  pointsLimit: number;
  tubeMaterial: SwordPathMaterial;

  constructor() {
    this.pointsLimit = 100
    this.tubeMaterial = new SwordPathMaterial({ color: 0xffffaa, pointsLimit: this.pointsLimit });
  }

  run(person: Hero) {
    const points: Vector3[] = [];

    new Tween({ i: 0 })
      .delay(300)
      .to({ i: 10 }, 700)
      .onUpdate(() => {
        const { weaponRight, weaponTopPosition } = person.elementsHero
        const worldPosition = weaponRight.localToWorld(weaponTopPosition.clone())

        points.unshift(worldPosition);

        if (points.length < 2) {
          return
        }

        const curve = new CatmullRomCurve3(points.slice(0, this.pointsLimit));
        const tubeGeometry = new TubeGeometry(curve, this.pointsLimit, 0.3, 2, false);
        const tube = new Mesh(tubeGeometry, this.tubeMaterial);

        const pointIndices = new Float32Array(tubeGeometry.attributes.position.count);
        for (let i = 0; i < pointIndices.length; i++) {
          pointIndices[i] = Math.floor((this.pointsLimit - i / 3));
        }

        tubeGeometry.setAttribute('pointIndex', new BufferAttribute(pointIndices, 1));

        // Удаляем старый след
        scene.traverse((child) => {
          if (child.userData.isSwordTrail) {
            scene.remove(child);
          }
        });

        tube.userData.isSwordTrail = true;
        scene.add(tube);
      })
      .onComplete(() => {
        scene.traverse((child) => {
          if (child.userData.isSwordTrail) {
            scene.remove(child);
          }
        });
      })
      .start()
  }
}