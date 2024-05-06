import * as THREE from 'three';

export const createTorch = () => {
  // Создаем светящуюся сферу
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 32, 32), // Геометрия сферы
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  sphere.position.set(0.2, 0.07, -0.07); // Позиция факела (относительно руки персонажа)

  const cone = new THREE.Mesh(
    new THREE.ConeGeometry( 0.25, 1, 32 ),
    new THREE.MeshBasicMaterial( {color: 0x000000} )
  )

  cone.rotation.set(
    Math.PI,
    1.3,
    Math.PI / 2
  )

  cone.position.set(
    -7, -5, -20
  )

  sphere.add(cone)

  const torch = new THREE.PointLight(0xffcc00, 200, 500); // Цвет, интенсивность, дистанция факела
  torch.position.set(0, 0, 0); // Позиция факела (относительно руки персонажа)
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
        
  // Прикрепляем факел к руке персонажа
  sphere.add(torch);

  return sphere
}