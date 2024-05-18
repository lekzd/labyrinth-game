import * as THREE from "three";

THREE.Object3D.prototype.updateMatrixWorld = function (force) {
  if (this.matrixAutoUpdate)
    this.updateMatrix();
  if (this.matrixWorldNeedsUpdate || force) {
    if (this.parent === null) {
      this.matrixWorld.copy(this.matrix);
    } else {
      this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
    }
    this.matrixWorldNeedsUpdate = false;
    force = true;
  }
  // Добавлено условие чтобы не перебирались все объекты внутри. чьл смильно ускоряет рендер
  if (this.matrixAutoUpdate === false) {
    return
  }
  const children = this.children;
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i];
    if (child.matrixWorldAutoUpdate === true || force === true) {
      child.updateMatrixWorld(force);
    }
  }
}