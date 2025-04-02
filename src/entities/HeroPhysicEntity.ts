import { createPhysicBox } from "@/cannon";
import { Object3D, Object3DEventMap } from "three";
import { PhysicEntity } from "./PhysicEntity";
import { Material } from "cannon";

interface HeroPhysicEntityProps {
  target: Object3D<Object3DEventMap>;
  physicY?: number;
  physicRadius?: number;
  mass?: number;
}

export class HeroPhysicEntity extends PhysicEntity {
  constructor(props: HeroPhysicEntityProps) {
    const { target, physicY = 8, physicRadius = 5, mass = 5 } = props;
    const material = new Material("hero");
    material.friction = 0; // Устанавливаем трение на 0

    super({
      target,
      physicY,
      body: createPhysicBox(
        { x: physicRadius, y: physicY, z: physicRadius },
        { mass, fixedRotation: true, material }
      )
    });
  }
}
