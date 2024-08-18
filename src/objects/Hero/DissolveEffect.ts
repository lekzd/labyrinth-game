import { HitImpactMaterial } from "@/materials/hitImpact";
import { scene } from "@/scene";
import { getVerticesFromObject } from "@/utils/getVerticesFromObject";
import { Tween } from "@tweenjs/tween.js";
import { BufferAttribute, BufferGeometry, Color, Object3D, Points } from "three";

export class DissolveEffect {
  target: Object3D;

  run(mesh: Object3D, color: Color, pointSize: number) {
    const vertices = getVerticesFromObject(mesh);
    // Создание массивов для хранения позиций частиц
    const positions = new Float32Array(vertices.length * 3); // 3 компоненты (x, y, z) на каждую частицу
    const indexes = new Float32Array(vertices.length * 3); // 3 компоненты (x, y, z) на каждую частицу
    const directions = new Float32Array(vertices.length * 3); // 3 компоненты (x, y, z) на каждую частицу

    for (let i = 0; i < positions.length; i += 3) {
      const vertex = vertices[Math.floor(i / 3)];

      positions[i] = vertex.x;
      positions[i + 1] = vertex.y;
      positions[i + 2] = vertex.z;

      indexes[i] = pointSize;
      indexes[i + 1] = pointSize;
      indexes[i + 2] = pointSize;

      directions[i] = Math.atan2(0 - positions[i + 1], 0 - positions[i]);
      directions[i + 1] = Math.hypot(0 - positions[i], 0 - positions[i + 1]);
      directions[i + 2] = 0;
    }

    // Создание буферной геометрии для частиц
    const particleGeometry = new BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute("values", new BufferAttribute(indexes, 3));
    particleGeometry.setAttribute(
      "directions",
      new BufferAttribute(directions, 3)
    );

    const particleMaterial = new HitImpactMaterial(color, -1.3);

    const particleSystem = new Points(particleGeometry, particleMaterial);

    this.target = particleSystem;

    particleSystem.position.copy(mesh.position);
    particleSystem.rotation.copy(mesh.rotation);
    particleSystem.scale.set(10, 10, 10);

    scene.add(particleSystem);

    new Tween({ v: 0 })
      .delay(300)
      .to({ v: -1.3 }, 1000)
      .onUpdate(({ v }) => {
        particleMaterial.uniforms.time.value = v;
        particleMaterial.uniformsNeedUpdate = true;

        const s = 10 + v * 2;

        particleSystem.scale.set(s, s, s);
      })
      .onComplete(() => {
        scene.remove(particleSystem);
      })
      .start();
  }
}
