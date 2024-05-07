import * as THREE from 'three';

export const Camera = ({ camera, target }) =>  {
  let
    currentPosition = new THREE.Vector3(),
    currentLookat = new THREE.Vector3();

  const calculateIdealOffset = () =>  {
    //position of camera
    const idealOffset = new THREE.Vector3(-10, 20, -25);
    idealOffset.applyQuaternion(target.Rotation);
    idealOffset.add(target.Position);
    return idealOffset;
  }

  const calculateIdealLookat = () => {
    const idealLookat = new THREE.Vector3(0, 0, 50);
    idealLookat.applyQuaternion(target.Rotation);
    idealLookat.add(target.Position);
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