import { scene } from "@/scene";
import { assign } from "@/utils/assign";
import { Color, Fog, HemisphereLight } from "three";

type EnvironmentPointConfig = {
  name: string
  lightColor: Color
  lightIntensity: number
  skyColor: Color
  fogColor: Color
  grassColor: Color
}

const time = (hours: number, minutes: number) => {
  return (hours * 60 * 60) + (minutes * 60) 
}

const MAX_TIME = 24 * 60 * 60

const timePointsConfig: Record<number, EnvironmentPointConfig> = {
  [time(0, 0)]: {
    name: '00:00',
    lightColor: new Color('#261475'),
    lightIntensity: 0.2,
    skyColor: new Color('#06000f'),
    fogColor: new Color('#000000'),
    grassColor: new Color('#000000'),
  },
  [time(6, 0)]: {
    name: '06:00',
    lightColor: new Color('#5d3af9'),
    lightIntensity: 0.2,
    skyColor: new Color('#140131'),
    fogColor: new Color('#000000'),
    grassColor: new Color('#000000'),
  },
  [time(8, 0)]: {
    name: '08:00',
    lightColor: new Color('#ef8a8a'),
    lightIntensity: 1.0,
    skyColor: new Color('#bfd1f5'),
    fogColor: new Color('#a6c0f5'),
    grassColor: new Color('#022607'),
  },
  [time(10, 0)]: {
    name: '10:00',
    lightColor: new Color('#FFFFFF'),
    lightIntensity: 1.0,
    skyColor: new Color('#759fe8'),
    fogColor: new Color('#6391e0'),
    grassColor: new Color('#132602'),
  },
  [time(17, 0)]: {
    name: '17:00',
    lightColor: new Color('#FFFFFF'),
    lightIntensity: 1.0,
    skyColor: new Color('#67b2db'),
    fogColor: new Color('#3162b5'),
    grassColor: new Color('#132602'),
  },
  [time(18, 0)]: {
    name: '18:00',
    lightColor: new Color('#ff5208'),
    lightIntensity: 0.7,
    skyColor: new Color('#f6852f'),
    fogColor: new Color('#4f0c04'),
    grassColor: new Color('#261b02'),
  },
  [time(19, 0)]: {
    name: '19:00',
    lightColor: new Color('#5d3af9'),
    lightIntensity: 0.3,
    skyColor: new Color('#130429'),
    fogColor: new Color('#000000'),
    grassColor: new Color('#000200'),
  },
  [time(22, 0)]: {
    name: '20:00',
    lightColor: new Color('#351aad'),
    lightIntensity: 0.3,
    skyColor: new Color('#0a0118'),
    fogColor: new Color('#000000'),
    grassColor: new Color('#000000'),
  },
  [time(24, 0)]: {
    name: '24:00',
    lightColor: new Color('#3a136b'),
    lightIntensity: 0.3,
    skyColor: new Color('#06000f'),
    fogColor: new Color('#000000'),
    grassColor: new Color('#000000'),
  },
}

export const EnvironmentSystem = () => {
  let currentTime = 10 * 60 * 60

  const hemiLight = new HemisphereLight(0xffffff, 0x8d8d8d, 0.3);
  hemiLight.position.set(0, 20, 0);
  hemiLight.updateMatrix();
  hemiLight.matrixAutoUpdate = false;

  scene.add(hemiLight);

  scene.background = new Color(0x06000f);
  scene.fog = new Fog(0x000000, 1, 400);

  const entries = Object.entries(timePointsConfig)
  const values = {
    name: '00:00',
    lightColor: new Color('#261475'),
    lightIntensity: 0.2,
    skyColor: new Color('#06000f'),
    fogColor: new Color('#000000'),
    grassColor: new Color('#000000'),
  }

  return {
    values,
    setTime(time: number) {
      currentTime = time
    },
    update(timeElapsed: number) {
      currentTime += timeElapsed * 10

      if (currentTime > MAX_TIME) {
        currentTime = currentTime % MAX_TIME
      }

      for (let i = 0; i < entries.length; i++) {
        const current = entries[i];
        const next = entries[i + 1];

        const currentPoint = +current[0]
        const nextPoint = +next[0]

        if (currentPoint <= currentTime && nextPoint > currentTime) {
          const fromPoint = current[1]
          const toPoint = next[1]
          const amount = (currentTime - currentPoint) / (nextPoint - currentPoint)

          assign(values, {
            lightColor: values.lightColor.lerpColors(fromPoint.lightColor, toPoint.lightColor, amount),
            lightIntensity: fromPoint.lightIntensity + (toPoint.lightIntensity - fromPoint.lightIntensity) * amount,
            skyColor: values.skyColor.lerpColors(fromPoint.skyColor, toPoint.skyColor, amount),
            fogColor: values.fogColor.lerpColors(fromPoint.fogColor, toPoint.fogColor, amount),
            grassColor: values.grassColor.lerpColors(fromPoint.grassColor, toPoint.grassColor, amount),
          })

          hemiLight.color.set(values.lightColor)
          hemiLight.intensity = values.lightIntensity

          scene.background = values.skyColor
          scene.fog.color = values.fogColor

          break
        }
      }
    }
  }
}