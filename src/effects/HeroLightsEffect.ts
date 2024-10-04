import { Hero } from "../objects/hero/Hero";
import {
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3
} from "three";
import { SwordPathMaterial } from "@/materials/swordPath";
import { AbstactEffect } from "./AbstactEffect";
import { shadowSetter } from "@/utils/shadowSetter";
import { loads } from "@/loader";

function createTorch() {
  const torch = new PointLight(0xffcc00, 200, 50); // Цвет, интенсивность, дистанция факела
  torch.position.set(0, 0, 0); // Позиция факела (относительно руки персонажа)
  torch.castShadow = true;
  torch.shadow.mapSize.width = 100;
  torch.shadow.mapSize.height = 100;
  torch.shadow.camera.near = 0.5;
  torch.shadow.camera.far = 25;
  Object.assign(torch.shadow.camera, {
    left: -10,
    right: 10,
    top: 10,
    bottom: -10
  });
  torch.shadow.radius = 5;
  torch.shadow.blurSamples = 5;

  shadowSetter(torch, {
    castShadow: true
  });

  return torch;
}

export class HeroLightsEffect implements AbstactEffect {
  pointsLimit = 100;
  pointIndices: Float32Array;

  constructor() {
    this.pointIndices = new Float32Array(this.pointsLimit * 3 + 3);
    for (let i = 0; i < this.pointIndices.length; i++) {
      this.pointIndices[i] = Math.floor(this.pointsLimit - i / 3);
    }
  }

  run(person: Hero) {
    const lightMesh = new Mesh(
      new SphereGeometry(1, 32, 16),
      new MeshBasicMaterial({ color: 0xffffff })
    );

    lightMesh.geometry.scale(1, 1.5, 1);
    lightMesh.geometry.translate(0, 2, 0);

    const vertices: Vector3[] = [];
    const step = Math.PI / 100;

    for (let i = 0; i < 100; i++) {
      vertices[i] = new Vector3(Math.cos(step * i), 0, Math.sin(step * i));
    }

    const color = new Color("#bdb62c");
    const tubeMaterial = new SwordPathMaterial({
      color,
      pointsLimit: this.pointsLimit
    });

    const curve = new CatmullRomCurve3(vertices);
    const tubeGeometry = new TubeGeometry(
      curve,
      this.pointsLimit,
      0.02,
      2,
      false
    );
    const tube = new Mesh(tubeGeometry, tubeMaterial);

    const ball = new Sprite(
      new SpriteMaterial({
        map: loads.texture["dot.png"],
        color
      })
    );

    ball.scale.set(0.2, 0.2, 0.2);
    ball.position.copy(vertices[0]);
    tube.scale.set(150, 150, 150);
    tube.position.y = 200;

    tubeGeometry.setAttribute(
      "pointIndex",
      new BufferAttribute(this.pointIndices, 1)
    );

    person.mesh.add(
      tube.add(
        ball.add(createTorch())
      )
    );

    const update = (timeInSeconds: number) => {
      tube.rotateOnAxis(new Vector3(1, 0, 0), timeInSeconds * 1.5);
      tube.rotateOnAxis(new Vector3(0, 1, 0), timeInSeconds * 4);
      tube.rotateOnAxis(new Vector3(0, 0, 1), timeInSeconds * 0.5);
    };

    return {
      update
    };
  }
}