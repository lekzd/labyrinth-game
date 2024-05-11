import * as THREE from 'three';
import * as CANNON from 'cannon';
import {scene} from "./scene.ts";
import {physicWorld} from "./cannon.ts";

export const bullet = () => {
  // Создание физического тела для пули
  const bulletShape = new CANNON.Sphere(0.1); // Форма пули (сфера)
  const bulletBody = new CANNON.Body({
    mass: 1, // Масса пули
    position: new CANNON.Vec3(0, 0, 0), // Начальная позиция пули
    shape: bulletShape // Установка формы пули
  });

  physicWorld.addBody(bulletBody);

// Создание объекта Three.js для отображения пули
  var bulletMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  scene.add(bulletMesh);

  return {
    update: () => {
      bulletMesh.position.copy(bulletBody.position);
      bulletMesh.quaternion.copy(bulletBody.quaternion);
    },
    remove: () => {
      scene.remove(bulletMesh);
      // physicWorld
    }
  }
}