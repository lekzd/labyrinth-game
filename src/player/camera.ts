import * as THREE from 'three';

export const Camera = (paramsBase) =>  {
  let
    params = paramsBase,
    camera = params.camera,
    currentPosition = new THREE.Vector3(),
    currentLookat = new THREE.Vector3();

  const calculateIdealOffset = () =>  {
    //position of camera
    const idealOffset = new THREE.Vector3(0, 20, -30);
    idealOffset.applyQuaternion(params.target.Rotation);
    idealOffset.add(params.target.Position);
    return idealOffset;
  }

  const calculateIdealLookat = () => {
    const idealLookat = new THREE.Vector3(0, 0, 50);
    idealLookat.applyQuaternion(params.target.Rotation);
    idealLookat.add(params.target.Position);
    return idealLookat;
  }

  return {
    update(timeElapsed) {

      const idealOffset = calculateIdealOffset();
      const idealLookat = calculateIdealLookat();

      const t = 1.0 - Math.pow(0.001, timeElapsed);

      currentPosition.lerp(idealOffset, t);
      currentLookat.lerp(idealLookat, t);

      camera.position.copy(currentPosition);
      camera.lookAt(currentLookat);
    }
  }
}