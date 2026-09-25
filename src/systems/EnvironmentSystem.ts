import { scene } from "@/scene";
import { assign } from "@/utils/assign";
import { Color, DirectionalLight, Fog, HemisphereLight, Vector3 } from "three";
import { systems } from ".";

type EnvironmentPointConfig = {
  name: string
  // Солнце днём, луна ночью
  lightColor: Color
  lightIntensity: number
  // Рассеянный свет неба сверху и отражённый от земли снизу: тени получаются цветными, а не чёрными
  hemiSkyColor: Color
  hemiGroundColor: Color
  hemiIntensity: number
  skyColor: Color
  fogColor: Color
  fogNear: number
  fogFar: number
  // Множитель цвета земли: днём под тёплым светом она буреет, ночью остаётся как есть
  groundColor: Color
}

const time = (hours: number, minutes: number) => {
  return (hours * 60 * 60) + (minutes * 60)
}

const MAX_TIME = 24 * 60 * 60

const point = (name: string, config: Record<Exclude<keyof EnvironmentPointConfig, 'name'>, string | number>): EnvironmentPointConfig => {
  const result = { name } as Record<string, unknown>;

  for (const [key, value] of Object.entries(config))
    result[key] = typeof value === 'string' ? new Color(value) : value;

  return result as EnvironmentPointConfig;
}

// Пастельные палитры: небо и туман близки по тону, чтобы даль растворялась в воздухе
const night = point('00:00', {
  lightColor: '#9db2ff',
  lightIntensity: 0.5,
  hemiSkyColor: '#51618f',
  hemiGroundColor: '#2c2640',
  hemiIntensity: 0.9,
  skyColor: '#26304f',
  fogColor: '#2b3556',
  fogNear: 10,
  fogFar: 320,
  groundColor: '#777777',
})

const timePointsConfig: Record<number, EnvironmentPointConfig> = {
  [time(0, 0)]: night,
  [time(5, 0)]: point('05:00', {
    lightColor: '#b49ddb',
    lightIntensity: 0.4,
    hemiSkyColor: '#6c6a9c',
    hemiGroundColor: '#3a3048',
    hemiIntensity: 0.9,
    skyColor: '#4c4f7c',
    fogColor: '#5d5a86',
    fogNear: 10,
    fogFar: 320,
    groundColor: '#777777',
  }),
  [time(7, 0)]: point('07:00', {
    lightColor: '#ffb8a0',
    lightIntensity: 1.8,
    hemiSkyColor: '#d9c6e6',
    hemiGroundColor: '#b88a86',
    hemiIntensity: 1.0,
    skyColor: '#f2c6bd',
    fogColor: '#e8bcb6',
    fogNear: 20,
    fogFar: 360,
    groundColor: '#83705f',
  }),
  [time(10, 0)]: point('10:00', {
    lightColor: '#fff0d6',
    lightIntensity: 3.5,
    hemiSkyColor: '#e4ead2',
    hemiGroundColor: '#a0825a',
    hemiIntensity: 1.0,
    skyColor: '#c4e0cc',
    fogColor: '#d8e0c8',
    fogNear: 60,
    fogFar: 460,
    groundColor: '#877458',
  }),
  [time(16, 0)]: point('16:00', {
    lightColor: '#ffe0b0',
    lightIntensity: 2.8,
    hemiSkyColor: '#f0e4c4',
    hemiGroundColor: '#b08560',
    hemiIntensity: 1.1,
    skyColor: '#f0dcae',
    fogColor: '#ebd2a4',
    fogNear: 50,
    fogFar: 400,
    groundColor: '#86704f',
  }),
  [time(18, 0)]: point('18:00', {
    lightColor: '#ff9f70',
    lightIntensity: 2.0,
    hemiSkyColor: '#f0b9c4',
    hemiGroundColor: '#9a6470',
    hemiIntensity: 1.0,
    skyColor: '#f0a890',
    fogColor: '#dc9488',
    fogNear: 20,
    fogFar: 360,
    groundColor: '#826a58',
  }),
  [time(19, 30)]: point('19:30', {
    lightColor: '#c69ad8',
    lightIntensity: 0.7,
    hemiSkyColor: '#7c6aa0',
    hemiGroundColor: '#3e2e4a',
    hemiIntensity: 0.9,
    skyColor: '#6a5a8c',
    fogColor: '#5c5482',
    fogNear: 10,
    fogFar: 340,
    groundColor: '#777777',
  }),
  [time(22, 0)]: point('22:00', {
    lightColor: '#9db2ff',
    lightIntensity: 0.5,
    hemiSkyColor: '#56638f',
    hemiGroundColor: '#2e2840',
    hemiIntensity: 0.9,
    skyColor: '#2c3354',
    fogColor: '#30385a',
    fogNear: 10,
    fogFar: 320,
    groundColor: '#777777',
  }),
  [time(24, 0)]: night,
}

// Сторона тени от солнца, по которой считается шэдоумапа вокруг героя
const SHADOW_EXTENT = 70
const SHADOW_MAP_SIZE = 2048
const SUN_DISTANCE = 150

export const EnvironmentSystem = () => {
  let currentTime = 10 * 60 * 60

  const hemiLight = new HemisphereLight(0xffffff, 0x8d8d8d, 0.3);
  hemiLight.position.set(0, 20, 0);
  hemiLight.updateMatrix();
  hemiLight.matrixAutoUpdate = false;

  scene.add(hemiLight);

  // Одно солнце на всю сцену, тень считается только в коробке вокруг героя и едет вместе с ним
  const sun = new DirectionalLight(0xffffff, 1);
  const { shadow } = sun;

  shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  shadow.camera.left = -SHADOW_EXTENT;
  shadow.camera.right = SHADOW_EXTENT;
  shadow.camera.top = SHADOW_EXTENT;
  shadow.camera.bottom = -SHADOW_EXTENT;
  shadow.camera.near = 1;
  shadow.camera.far = SUN_DISTANCE * 2;
  shadow.bias = -0.0005;
  shadow.normalBias = 0.3;
  shadow.radius = 4;
  shadow.camera.updateProjectionMatrix();
  sun.castShadow = true;

  scene.add(sun, sun.target);

  scene.background = new Color(0x06000f);
  const fog = scene.fog = new Fog(0x000000, 100, 400);

  const focus = new Vector3();
  const sunDirection = new Vector3();
  const texel = (SHADOW_EXTENT * 2) / SHADOW_MAP_SIZE;

  const entries = Object.entries(timePointsConfig)
  const values = point('00:00', {
    lightColor: '#000000',
    lightIntensity: 0,
    hemiSkyColor: '#000000',
    hemiGroundColor: '#000000',
    hemiIntensity: 0,
    skyColor: '#000000',
    fogColor: '#000000',
    fogNear: 100,
    fogFar: 400,
    groundColor: '#777777',
  })

  const updateSun = () => {
    // Светило делает полный круг за сутки: днём солнце, ночью с противоположной стороны луна.
    // Высоту держим невысокой: длинные мягкие тени — половина атмосферы
    const azimuth = (currentTime / MAX_TIME) * Math.PI * 2;
    // Выше всего в полдень (и луна в полночь), у горизонта на рассвете и закате
    const elevation = 0.3 + Math.abs(Math.cos(azimuth)) * 0.6;

    sunDirection.set(
      Math.cos(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(azimuth) * Math.cos(elevation)
    );

    // Центр тени двигаем шагами в тексель, иначе края теней дрожат при ходьбе
    const x = Math.round(focus.x / texel) * texel;
    const z = Math.round(focus.z / texel) * texel;

    sun.target.position.set(x, 0, z);
    sun.position.copy(sun.target.position).addScaledVector(sunDirection, SUN_DISTANCE);
    sun.target.updateMatrixWorld();
  };

  return {
    values,
    setTime(time: number) {
      currentTime = time
    },
    setFocus(position: Vector3) {
      focus.copy(position)
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
          const lerp = (key: 'lightIntensity' | 'hemiIntensity' | 'fogNear' | 'fogFar') =>
            fromPoint[key] + (toPoint[key] - fromPoint[key]) * amount

          assign(values, {
            lightColor: values.lightColor.lerpColors(fromPoint.lightColor, toPoint.lightColor, amount),
            lightIntensity: lerp('lightIntensity'),
            hemiSkyColor: values.hemiSkyColor.lerpColors(fromPoint.hemiSkyColor, toPoint.hemiSkyColor, amount),
            hemiGroundColor: values.hemiGroundColor.lerpColors(fromPoint.hemiGroundColor, toPoint.hemiGroundColor, amount),
            hemiIntensity: lerp('hemiIntensity'),
            skyColor: values.skyColor.lerpColors(fromPoint.skyColor, toPoint.skyColor, amount),
            fogColor: values.fogColor.lerpColors(fromPoint.fogColor, toPoint.fogColor, amount),
            fogNear: lerp('fogNear'),
            fogFar: lerp('fogFar'),
            groundColor: values.groundColor.lerpColors(fromPoint.groundColor, toPoint.groundColor, amount),
          })

          hemiLight.color.copy(values.hemiSkyColor)
          hemiLight.groundColor.copy(values.hemiGroundColor)
          hemiLight.intensity = values.hemiIntensity

          sun.color.copy(values.lightColor)
          sun.intensity = values.lightIntensity

          scene.background = values.skyColor
          fog.color = values.fogColor
          fog.near = values.fogNear
          fog.far = values.fogFar

          // Тени в цветокоррекции поднимаются к цвету воздуха
          systems.uiSettingsSystem.gradePass.uniforms.tint.value
            .copy(values.fogColor)
            .convertLinearToSRGB()

          break
        }
      }

      updateSun()

      const { gradePass } = systems.uiSettingsSystem
      gradePass.uniforms.time.value += timeElapsed
    }
  }
}
