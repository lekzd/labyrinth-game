import {
  ConeGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3DEventMap,
  PointLight,
  SphereGeometry,
} from "three";

export class Torch {
  readonly sphere: Mesh<SphereGeometry, MeshBasicMaterial, Object3DEventMap>;
  constructor() {
    this.sphere = initSphere();
  }
}

function initSphere() {
  const sphere = new Mesh(
    new SphereGeometry(0.1, 32, 32), // Геометрия сферы
    new MeshBasicMaterial({ color: 0xffffff })
  );

  sphere.position.set(0.2, 0.07, -0.07); // Позиция факела (относительно руки персонажа)
  const cone = createCone();
  const torch = createTorch();

  sphere.add(cone);
  sphere.add(torch);

  return sphere;
}

function createCone() {
  const cone = new Mesh(
    new ConeGeometry(0.25, 1, 32),
    new MeshBasicMaterial({ color: 0x000000 })
  );

  cone.rotation.set(Math.PI, 1.3, Math.PI / 2);
  cone.position.set(-7, -5, -20);
  return cone;
}

function createTorch() {
  const torch = new PointLight(0xffcc00, 200, 500); // Цвет, интенсивность, дистанция факела
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
    bottom: -10,
  });
  torch.shadow.radius = 5;
  torch.shadow.blurSamples = 5;
  return torch;
}
