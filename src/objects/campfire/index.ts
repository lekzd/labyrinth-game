import * as THREE from 'three';
import vertexShader from './shader.vert'
import fragmentShader from './shader.frag'
import { frandom } from '../../utils/random';

export const createCampfire = () => {

  const base = new THREE.Object3D()

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32), // Геометрия сферы
    new THREE.MeshBasicMaterial({ color: 0xFF4500 }),
  );

  // Создание эффекта частиц для пламени
  const particleCount = 100; // Количество частиц

  // Создание массивов для хранения позиций частиц
  const positions = new Float32Array(particleCount * 3); // 3 компоненты (x, y, z) на каждую частицу
  const indexes = new Float32Array(particleCount * 3); // 3 компоненты (x, y, z) на каждую частицу

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (Math.random() * 4 - 2); // Рандомное положение частицы по оси X
    positions[i + 1] = (Math.random() * 2 + 1); // Рандомное положение частицы по оси Y
    positions[i + 2] = (Math.random() * 4 - 2); // Рандомное положение частицы по оси Z

    indexes[i] = i / positions.length
    indexes[i + 1] = frandom(0.1, 1)
    indexes[i + 2] = frandom(0.1, 1)
  }

  // Создание буферной геометрии для частиц
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('values', new THREE.BufferAttribute(indexes, 3));

  const pointsMaterial = new THREE.PointsMaterial({
    color: 0xFF4500, // Оранжевый цвет для пламени
    size: 0.1, // Размер частиц
    sizeAttenuation: true,
  });

  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        size: { value: 0.1 },
    },
    vertexShader,
    fragmentShader,
});

  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);

  // Добавление эффекта частиц к костру
  base.add(sphere);
  base.add(particleSystem);

  const torch = new THREE.PointLight(0xFF4500, 400, 1000); // Цвет, интенсивность, дистанция факела
  torch.position.set(0, 5, 0); // Позиция факела (относительно руки персонажа)
  torch.castShadow = true
  torch.shadow.mapSize.width = 100
  torch.shadow.mapSize.height = 100
  torch.shadow.camera.near = 0.5
  torch.shadow.camera.far = 25
  torch.shadow.camera.left = -10
  torch.shadow.camera.right = 10
  torch.shadow.camera.top = 10
  torch.shadow.camera.bottom = -10
  torch.shadow.radius = 5
  torch.shadow.blurSamples = 5

  base.add(torch);

  return {
    mesh: base,
    update: (timeDelta: number) => {
      // particleMaterial.uniforms.time.value += timeDelta / 10;
      particleMaterial.uniforms.time.value = performance.now() / 1000;
      particleMaterial.uniformsNeedUpdate = true;
    }
  }
}