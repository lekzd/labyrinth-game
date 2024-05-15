import * as THREE from 'three'
import React, { FC, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { systems } from '../../systems'
import { scale, state } from '../../state'
import fireIcon from './assets/fire_icon_30x30.png' 

const Container = styled.div`
  display: flex;
  width: 100vw;
`

const Icon = styled.img`
  width: 30px;
  height: 30px;
  opacity: 0.5;
`

interface IProps { }

const getCampfireOffset = (camera: THREE.Camera, target: THREE.Vector3) => {
  // Направление камеры
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  // Вектор от камеры к целевой точке
  const toTarget = new THREE.Vector3();
  toTarget.subVectors(target, camera.position);
  toTarget.normalize();

  // Вычисление угла между направлением камеры и вектором к целевой точке
  const angle = cameraDirection.angleTo(toTarget);
  const angleInDegrees = THREE.MathUtils.radToDeg(angle);

  // Проекция вектора направления на плоскость XZ для расчета отклонения по оси X
  const cameraDirectionXZ = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
  const toTargetXZ = new THREE.Vector3(toTarget.x, 0, toTarget.z).normalize();

  // Определение знака угла поворота
  const crossProduct = cameraDirectionXZ.cross(toTargetXZ).y;
  const sign = crossProduct < 0 ? -1 : 1;
  const width = window.innerWidth

  return width - ((sign * angleInDegrees / 180) * (width / 2) + (width / 2));
};

export const Compass: FC<IProps> = (props: IProps) => {
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const { camera } = systems.uiSettingsSystem

    const target = new THREE.Vector3((state.colls >> 1) * scale, 0, (state.rows >> 1) * scale);

    const animate = () => {
      requestAnimationFrame(animate)

      const offsetX = getCampfireOffset(camera, target);

      if (ref.current) {
        ref.current.style.transform = `translateX(${offsetX}px)`;
      }
    }

    animate()
  }, [ref.current])

  return (
    <Container>
      <Icon ref={ref} src={fireIcon} />
    </Container>
  )
}
