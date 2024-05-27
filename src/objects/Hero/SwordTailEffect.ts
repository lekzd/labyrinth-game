import { Tween } from "@tweenjs/tween.js";
import { Hero } from "./Hero";
import { BufferAttribute, CatmullRomCurve3, Mesh, MeshLambertMaterial, SphereGeometry, TubeGeometry, Vector3 } from "three";
import { scene } from "@/scene";
import { SwordPathMaterial } from "@/materials/swordPath";

export class SwordTailEffect {
  pointsLimit: number;
  tubeMaterial: SwordPathMaterial;
  pointIndices: Float32Array;

  constructor() {
    this.pointsLimit = 100
    this.tubeMaterial = new SwordPathMaterial({ color: 0xffffaa, pointsLimit: this.pointsLimit });

    this.pointIndices = new Float32Array((this.pointsLimit * 3) + 3);
    for (let i = 0; i < this.pointIndices.length; i++) {
      this.pointIndices[i] = Math.floor((this.pointsLimit - i / 3));
    }
  }

  run(person: Hero) {
    const points: Vector3[] = [];
    const mountedEffects: Mesh[] = [];
    let iteration = -1;

    const sphere = new Mesh(
      new SphereGeometry(1, 10, 10),
      new MeshLambertMaterial({ color: 0xFFFFFF })
    )

    const onUpdate = () => {
      iteration++

      if (iteration % 3 !== 0) {
        return
      }

      const { weaponRight, weaponTopPosition } = person.elementsHero
      const worldPosition = weaponRight.localToWorld(weaponTopPosition.clone())

      points.unshift(worldPosition);

      if (points.length < 2) {
        return
      }

      const curve = new CatmullRomCurve3(points.slice(0, this.pointsLimit));
      const tubeGeometry = new TubeGeometry(curve, this.pointsLimit, .2, 2, false);
      const tube = new Mesh(tubeGeometry, this.tubeMaterial);

      tubeGeometry.setAttribute('pointIndex', new BufferAttribute(this.pointIndices, 1));

      mountedEffects.forEach(child => {
        scene.remove(child);
      })

      tube.userData.isSwordTrail = true;
      scene.add(tube);
      mountedEffects.push(tube);
    }

    new Tween({ i: 0 })
      .delay(300)
      .to({ i: 10 }, 700)
      .onUpdate(onUpdate)
      .onComplete(() => {
        mountedEffects.forEach(child => {
          scene.remove(child);
        })
      })
      .start()
  }
}