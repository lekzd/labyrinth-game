import * as THREE from 'three'
import React, { FC, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { systems } from '../../systems'
import { state } from '@/state'
import { getActiveObjectFromState } from '@/utils/stateUtils'

const Container = styled.div`
  display: flex;
  width: 100vw;
`

const Coordinates = styled.div`
  position: absolute;
  left: 0;
  top: 20px;
  color: white;
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
  position: absolute;
  width: 30px;
  height: 30px;
  opacity: 0.5;
  will-change: transform;
  display: flex;
  justify-content: center;
`

const CardinalDirectionIcon = styled(Icon)`
  opacity: 0.25;
  top: -12px;
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
  const width = window.innerWidth

  return width - ((angleInDegrees > 90 ? 2 : crossProduct) * (width / 2) + (width / 2));
};

const getCameraDegrees = (camera: THREE.Camera) => {
  // Получение направления камеры
  const vector = new THREE.Vector3();
  camera.getWorldDirection(vector);

  // Вычисление угла в радианах и преобразование его в градусы
  const angle = Math.atan2(vector.x, vector.z);
  const degrees = angle * (180 / Math.PI);

  return degrees
}

export const Compass: FC<IProps> = (props: IProps) => {
  const centerRef = useRef<HTMLDivElement>(null)
  const nRef = useRef<HTMLDivElement>(null)
  const eRef = useRef<HTMLDivElement>(null)
  const sRef = useRef<HTMLDivElement>(null)
  const wRef = useRef<HTMLDivElement>(null)
  const { camera } = systems.uiSettingsSystem
  const coordinatesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = new THREE.Vector3(0, 0, 0);

    const animate = () => {
      requestAnimationFrame(animate)

      const centerOffsetX = getCampfireOffset(camera, target);

      if (centerRef.current) {
        centerRef.current.style.transform = `translateX(${centerOffsetX - 15}px)`;
      }

      const cameraDegrees = getCameraDegrees(camera);
      const center = (window.innerWidth >> 1) - 15

      if (nRef.current) {
        const offset = (cameraDegrees / 90) * center
        nRef.current.style.transform = `translateX(${center + offset}px)`;
      }

      if (eRef.current) {
        const offset = ((cameraDegrees + 90) / 90) * center
        eRef.current.style.transform = `translateX(${center + offset}px)`;
      }

      if (wRef.current) {
        const offset = ((cameraDegrees - 90) / 90) * center
        wRef.current.style.transform = `translateX(${center + offset}px)`;
      }

      if (sRef.current) {
        const offset = (((cameraDegrees - 180) < -180 ? cameraDegrees + 180 : cameraDegrees - 180) / 90) * center
        sRef.current.style.transform = `translateX(${center + offset}px)`;
      }

      if (coordinatesRef.current) {
        const activeObject = state.select(getActiveObjectFromState)

        coordinatesRef.current.innerHTML = `
          <div>X: ${Math.round(activeObject?.position.x ?? 0)}</div>
          <div>Y: ${Math.round(activeObject?.position.y ?? 0)}</div>
          <div>Z: ${Math.round(activeObject?.position.z ?? 0)}</div>
        `
      }
    }

    animate()
  }, [centerRef.current])

  return (
    <Container>
      <Line />
      <Icon ref={centerRef} >
        <svg width="12.195" height="20" viewBox="0 0 259 410" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4.30176" y="367.5" width="252" height="42" fill="#D9D9D9"/>
          <path d="M130.778 347C-55.1984 347 -11.1976 106 69.2785 106C12.2915 287 249.789 224.5 95.7784 0C295.803 31.5 316.755 347 130.778 347Z" fill="#D9D9D9"/>
        </svg>
      </Icon>

      <CardinalDirectionIcon ref={nRef}>
        N
      </CardinalDirectionIcon>

      <CardinalDirectionIcon ref={eRef}>
        E
      </CardinalDirectionIcon>

      <CardinalDirectionIcon ref={sRef}>
        S
      </CardinalDirectionIcon>

      <CardinalDirectionIcon ref={wRef}>
        W
      </CardinalDirectionIcon>

      <Coordinates ref={coordinatesRef} />
    </Container>
  )
}
