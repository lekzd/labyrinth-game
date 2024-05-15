import * as THREE from 'three'
import React, { FC, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { systems } from '../../systems'
import { scale, state } from '../../state'

const Container = styled.div`
  display: flex;
  width: 100vw;
`

const Line = styled.div`
  position: absolute;
  left: 0;
  top: 10px;
  width: 100vw;
  height: 2px;
  background-image: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
`

const Icon = styled.div`
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
      <Line />
      <Icon ref={ref} >
        <svg width="12.195" height="20" viewBox="0 0 259 410" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4.30176" y="367.5" width="252" height="42" fill="#D9D9D9"/>
          <path d="M130.778 347C-55.1984 347 -11.1976 106 69.2785 106C12.2915 287 249.789 224.5 95.7784 0C295.803 31.5 316.755 347 130.778 347Z" fill="#D9D9D9"/>
        </svg>
      </Icon>
    </Container>
  )
}
