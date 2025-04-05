import { scene } from "@/scene";
import { systems } from "@/systems";
import { MapObject } from "@/types";
import { PointOctree } from "sparse-octree";
import { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from "three";

export class InteractiveObjectsStorage {
  private objectToOctree = new Map<string, Vector3>();
  private octree: PointOctree<MapObject>;

  private position = {
    previous: { x: 0, y: 0, z: 0 },
    current: { x: 0, y: 0, z: 0 }
  };

  private debugMeshes: Record<string, Mesh> = {};

  constructor() {
    // Создаем Octree
    const min = new Vector3(-100, -100, -100);
    const max = new Vector3(100, 100, 100);
    this.octree = new PointOctree<MapObject>(min, max, 0, 100);
  }

  relativePosition = (
    point: Vector3,
    state: keyof typeof this.position = "current"
  ) => {
    const vector = point.clone();

    vector.x -= this.position[state].x;
    vector.y -= this.position[state].y;
    vector.z -= this.position[state].z;

    return vector;
  };

  private createDebugMesh = (position: Vector3) => {
    const geometry = new BoxGeometry(8, 8, 8);
    const material = new MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y += 4;
    return mesh;
  };

  has(object: MapObject) {
    return this.objectToOctree.has(object.props.id);
  }

  add(object: MapObject) {
    const position = this.relativePosition(object.mesh.position)

    this.objectToOctree.set(object.props.id, position);
    this.octree.set(position, object);

    if (systems.uiSettingsSystem.settings.game.physics_boxes) {
      if (this.debugMeshes[object.props.id]) {
        scene.remove(this.debugMeshes[object.props.id]);
        delete this.debugMeshes[object.props.id];
      }

      this.debugMeshes[object.props.id] = this.createDebugMesh(object.mesh.position);
      this.debugMeshes[object.props.id].position.y += 4;
      scene.add(this.debugMeshes[object.props.id]);
    }
  };

  remove(object: MapObject) {
    const position = this.objectToOctree.get(object.props.id);
    
    if (position) {
      this.objectToOctree.delete(object.props.id);
      this.octree.remove(position);

      if (this.debugMeshes[object.props.id]) {
        scene.remove(this.debugMeshes[object.props.id]);
        delete this.debugMeshes[object.props.id];
      }
    }
  };

  move(object: MapObject, newPosition: Vector3) {
    const position = this.objectToOctree.get(object.props.id);
    
    if (position) {
      this.objectToOctree.delete(object.props.id);
      this.objectToOctree.set(object.props.id, newPosition);
      this.octree.move(position, newPosition);

      if (this.debugMeshes[object.props.id]) {
        this.debugMeshes[object.props.id].position.copy(object.mesh.position);
        this.debugMeshes[object.props.id].position.y += 4;
      }
    }
  };

  raycastFromObject(object: MapObject) {
    const direction = new Vector3(0, 0, 1);
    const quaternion = object.mesh.quaternion.clone();
    const position = new Vector3(0, 0, 0);

    direction.applyQuaternion(quaternion);
  
    const far = 10;
  
    const raycaster = new Raycaster(position, direction, 1, far);
    raycaster.camera = systems.uiSettingsSystem.camera;
    raycaster.params.Points.threshold = 5;
  
    return this.octree.raycast(raycaster);
  }

  findNearestPoint(point: Vector3) {
    const cloned = point.clone();

    cloned.y = 0;

    return this.octree.findNearestPoint(cloned, 7, true);
  }

  update(next: Vector3) {
    this.position.previous = this.position.current;
    this.position.current = next;
  }
}