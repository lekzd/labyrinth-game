import { Tween } from "@tweenjs/tween.js";
import { Hero } from "./Hero";
import { BufferAttribute, CatmullRomCurve3, Mesh, TubeGeometry, Vector3 } from "three";
import { scene } from "@/scene";
import { SwordPathMaterial } from "@/materials/swordPath";
import { weaponType } from "@/loader";

const getWeaponVectorByType = (type: weaponType) => {
  switch (type) {
    case weaponType.katana:
      return new Vector3(80, 30, -160)
    case weaponType.dagger:
      return new Vector3(0, 30, -120)
    case weaponType.sword:
      return new Vector3(-10, 0, -260)
    case weaponType.swordLazer:
      return new Vector3(0, 50, -190)
    case weaponType.hammer:
      return new Vector3(0, 50, -160)
    case weaponType.staff:
    case weaponType.staff2:
      return new Vector3(0, -70, -160)
  }

  return new Vector3(0, 0, 0)

  // throw Error(`No vector for weapon name "${name}"`)
}

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

    const weaponRight = person.weaponObject
    const weaponVector = getWeaponVectorByType(weaponRight.name as weaponType).clone()

    const handlerPosition = weaponRight.position.clone()
    const topDirection = weaponVector.applyQuaternion(weaponRight.quaternion); // Направление с учетом поворота меча
    const weaponTopPosition = handlerPosition.add(topDirection);

    const onUpdate = () => {
      iteration++

      if (iteration % 3 !== 0) {
        return
      }

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