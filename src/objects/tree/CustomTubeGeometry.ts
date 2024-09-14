import { BufferGeometry, Curve, Float32BufferAttribute, Matrix4, Vector2, Vector3 } from "three";

// Модифицированная версия TubeGeometry для поддержки изменяющегося радиуса
export class CustomTubeGeometry extends BufferGeometry {
  path: Curve<Vector3>;
  closed: boolean;

  constructor(path: Curve<Vector3>, tubularSegments: number, radiusFunction: (v: number) => number, radialSegments: number, closed: boolean) {
    super();

    this.path = path;
    this.closed = closed || false;

    const frames = path.computeFrenetFrames(tubularSegments, closed);

    const tangents = frames.tangents;
    const normals = frames.normals;
    const binormals = frames.binormals;

    const vertex = new Vector3();
    const normal = new Vector3();
    const uv = new Vector2();

    const vertices: number[] = [];
    const normalsArray: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const extrudePts = path.getSpacedPoints(tubularSegments);

    // Generate buffer data
    for (let i = 0; i < tubularSegments; i++) {
      generateSegment(i);
    }

    // Add last segment
    generateSegment((this.closed === false) ? tubularSegments : 0);

    // Generate indices
    for (let j = 1; j <= tubularSegments; j++) {
      for (let i = 1; i <= radialSegments; i++) {
        const a = (radialSegments + 1) * (j - 1) + (i - 1);
        const b = (radialSegments + 1) * j + (i - 1);
        const c = (radialSegments + 1) * j + i;
        const d = (radialSegments + 1) * (j - 1) + i;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    // Build geometry
    this.setIndex(indices);
    this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    this.setAttribute('normal', new Float32BufferAttribute(normalsArray, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));

    function generateSegment(i: number) {
      const P1 = extrudePts[i];

      const radius = radiusFunction(i / tubularSegments);

      for (let j = 0; j <= radialSegments; j++) {
        const v = j / radialSegments * Math.PI * 2;
        normal.x = -Math.sin(v);
        normal.y = Math.sin(v);
        normal.z = Math.cos(v);

        const mat = new Matrix4().makeBasis(
          tangents[i],
          normals[i],
          binormals[i]
        );
        normal.applyMatrix4(mat).normalize();

        vertex.copy(P1).addScaledVector(normal, radius);

        vertices.push(vertex.x, vertex.y, vertex.z);
        normalsArray.push(normal.x, normal.y, normal.z);

        uv.x = i / tubularSegments;
        uv.y = j / radialSegments;
        uvs.push(uv.x, uv.y);
      }
    }
  }
}
