import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { Tiles } from "./generators/types.ts";
import { Camera } from "./player/camera.ts";
import { Player } from "./player/player.ts";
import { textures } from './loader.ts';
import { State } from './state.ts';

const scale = 10;
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1.0, 1000.0)
const renderer = new THREE.WebGLRenderer({ antialias: true })
const stats = new Stats()

let personCamera;

const persons: ReturnType<typeof Player>[] = []

export const render = (state: State) => {
  const activePlayer = state.players.find(player => player.id = state.activePlayerId)

  state.objects.forEach(object => {
    const controllable = activePlayer?.activeObjectId === object.id
    const person = Player({ controllable, scene, ...object })
    persons.push(person)

    if (controllable) {
      personCamera = Camera({ camera, target: person })
    }
  })

  const container = document.getElementById('app');
  scene.background = new THREE.Color(0xa000000);
  scene.fog = new THREE.Fog(0x000000, 1, 200);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 3);
  dirLight.position.set(3, 10, 10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 2;
  dirLight.shadow.camera.bottom = - 2;
  dirLight.shadow.camera.left = - 2;
  dirLight.shadow.camera.right = 2;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 40;
  scene.add(dirLight);

  // Stats
  container.appendChild(stats.dom);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  /*
  * Рендерит рекурсивно сцену, пробрасывая в подписчиков (персонаж, камера)
  * тайминг для апдейта сцены
  * */
  let prevTime = null;
  const subscribers = [...persons, personCamera].flat(1)

  const renderLoop = () => {
    requestAnimationFrame((t) => {
      if (prevTime === null) prevTime = t;

      renderLoop();

      renderer.render(scene, camera);

      const timeElapsedS = (t - prevTime) * 0.001;

      // Updates
      for (const item of subscribers) {
        const upd = item.update;

        upd(timeElapsedS);
      }

      prevTime = t;
    });
  }

  renderLoop();

}

// TODO: стандартизировать
export const items = {
  block: (x, y, z = 0, type) => {
    const render = items[type];

    if (!render) return;

    const item = render();

    scene.add(item);
    item.position.set(x * scale, 2, y * scale);
  },
  ground: (rows, colls) => {
    const texture = textures.wood_floor.clone()

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(rows, colls);

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(rows * scale, colls * scale),
      new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false, map: texture })
    );

    const x = rows * scale / 2
    const z = colls * scale / 2

    Object.assign(mesh.position, { x, z })
    persons.forEach(person => {
      person.setPosition({ x, z })
    })

    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);
  },
  [Tiles.Wall]: () => {
    const texture = textures.stone_wall.clone()

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);

    const geometry = new THREE.BoxGeometry(1 * scale, 4 * scale, 1 * scale);
    const material = new THREE.MeshLambertMaterial({ color: 'white', map: texture });
    const cube = new THREE.Mesh(geometry, material);

    cube.castShadow = true;
    cube.receiveShadow = true;

    return cube;
  },
}
