import { Matrix4, Vector3, Vector3Like } from "three";

type Props = {
  translation?: Partial<Vector3Like>
  rotation?: Partial<Vector3Like>
  scale?: Partial<Vector3Like>
}

export const createMatrix = ({
  translation,
  rotation,
  scale,
}: Props) => {
  const matrices: Matrix4[] = [];

  if (translation) {
    matrices.push(new Matrix4().makeTranslation(
      translation.x ?? 0,
      translation.y ?? 0,
      translation.z ?? 0,
    ))
  }

  if (rotation) {
    if (rotation.x) {
      matrices.push(new Matrix4().makeRotationX(rotation.x))
    }
  
    if (rotation.y) {
      matrices.push(new Matrix4().makeRotationY(rotation.y))
    }
  
    if (rotation.z) {
      matrices.push(new Matrix4().makeRotationZ(rotation.z))
    }
  }

  if (scale) {
    matrices.push(new Matrix4().makeScale(
      scale.x ?? 0,
      scale.y ?? 0,
      scale.z ?? 0,
    ))
  }

  return matrices.reduce((memo, cur) => memo.multiply(cur), new Matrix4())
}