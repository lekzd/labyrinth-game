import { Object3D, Vector3 } from "three";

export function getVerticesFromObject(object: Object3D) {
  let vertices: Vector3[] = [];

  object.traverse((o) => {
    if (o.isMesh && o.geometry.isBufferGeometry) {
      const positionAttribute = o.geometry.attributes.position;
      for (let i = 0; i < positionAttribute.count; i++) {
        const vertex = new Vector3();
        vertex.fromBufferAttribute(positionAttribute, i);
        
        // Применение локального scale и rotation
        vertex.applyMatrix4(o.matrix);
        
        vertices.push(vertex);
      }
    }
  });

  return vertices;
}
