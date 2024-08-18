import { Object3D, Vector3 } from "three";

export function getVerticesFromObject(object: Object3D) {
    let vertices: Vector3[] = [];

    // Проверяем, есть ли у объекта геометрия
    if (object.isMesh && object.geometry.isBufferGeometry) {
        const positionAttribute = object.geometry.attributes.position;
        for (let i = 0; i < positionAttribute.count; i++) {
            const vertex = new Vector3();
            vertex.fromBufferAttribute(positionAttribute, i);
            vertices.push(vertex);
        }
    }

    // Рекурсивно проходим по всем дочерним объектам
    object.children.forEach(child => {
        vertices = vertices.concat(getVerticesFromObject(child));
    });

    return vertices;
}