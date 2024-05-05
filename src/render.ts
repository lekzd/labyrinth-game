import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {Tiles} from "./generators/types.ts";
import {Camera} from "./player/camera.ts";
import {Player} from "./player/player.ts";
import * as grass from "./grass.ts";
import {textures, worlds} from './loader.ts';
import {State} from './state.ts';
import {scene} from './scene.ts';
import { frandom } from './generators/utils.ts';

const scale = 10;
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1.0, 1000.0)
const renderer = new THREE.WebGLRenderer({ antialias: true })
const stats = new Stats()

const subscribers: { update: (time: number) => void }[] = [grass]
const persons: ReturnType<typeof Player>[] = []

export const render = (state: State) => {
  const activePlayer = state.players.find(player => player.id = state.activePlayerId)
  state.objects.forEach(object => {
    const controllable = activePlayer?.activeObjectId === object.id
    const person = Player({ controllable, scene, ...object })
    persons.push(person)
    subscribers.push(person)

    if (controllable) {
      subscribers.push(Camera({ camera, target: person }))
    }
  })

  const container = document.getElementById('app')!;

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 0.1);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

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

  const renderLoop = () => {
    requestAnimationFrame((t) => {
      if (prevTime === null) prevTime = t;

      renderLoop();

      stats.update();
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
  wallsMerged: (state: State) => {
    const texture = textures.stone_wall.clone()
    const blocks: THREE.BoxGeometry[] = []

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);

    for (let i = 0; i < state.staticGrid.length; i++) {
      const x = i % state.colls
      const y = Math.floor(i / state.colls)

      if (state.staticGrid[i] === Tiles.Wall) {
        const blockGeometry = new THREE.BoxGeometry(1 * scale, 4 * scale, 1 * scale)
        blockGeometry.translate(x * scale, 2, y * scale);

        blocks.push(blockGeometry);
      }
    }

    const material = new THREE.MeshLambertMaterial({ color: 'white', map: texture });
    const cube = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(blocks, false),
      material
    );

    cube.castShadow = true;
    cube.receiveShadow = true;

    scene.add(cube)
  },
  trees: (state: State) => {
    for (let i = 0; i < state.staticGrid.length; i++) {
      const x = i % state.colls + frandom(-0.5, 0.5)
      const y = Math.floor(i / state.colls) + frandom(-0.5, 0.5)

      if (state.staticGrid[i] === Tiles.Wall) {
        const cube = items[Tiles.Tree]();

        Object.assign(cube.position, { x: x * scale, z: y * scale })

        scene.add(cube)
      }
    }
  },
  ground: (rows, colls) => {
    const texture = textures.wood_floor.clone()

    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(rows, colls);

    const geometry = new THREE.PlaneGeometry(rows * scale, colls * scale);

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshPhongMaterial({ color: 0x241b0f, depthWrite: false })
    );

    const grassMesh = grass.render(rows * scale, colls * scale, scene);

    const x = rows * scale / 2
    const z = colls * scale / 2

    Object.assign(mesh.position, { x, z })
    Object.assign(grassMesh.position, { x, z })
    persons.forEach(person => {
      person.setPosition({ x, z })
    })

    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;

    scene.add(mesh);
    scene.add(grassMesh);
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
  [Tiles.Tree]: () => {
    const model = Object.values(worlds)[Math.floor(Math.random()*Object.values(worlds).length)];

    const target = model.clone();

    target.scale.multiplyScalar(.05);

    target.traverse(o => {
      if (o.isMesh) {
        o.material.map = textures.tree;
        o.material.needsUpdate = true

        // o.castShadow = true;
        // o.receiveShadow = true;
      }
    });

    target.castShadow = true;
    target.receiveShadow = true;

    return target;
  }
}
