import "./style.css";
import { render, addObjects } from "./render.ts";
import * as THREE from "three";
import "./utils/threejsPatches.ts";

import { loaders } from "./loader.ts";
import {
  createHeroObject,
  createPlayerObject,
  state,
} from "./state.ts";
import { socket, } from "./socket.ts";
import { pickBy } from "./utils/pickBy.ts";
import { Spawners } from "@/spawner.ts";

const { send, onUpdate } = socket({ name: 'USER' });

onUpdate((next) => {
  if (!next.init) {
    state.setState(next, { server: true });
    return;
  }

  const personsCount = 2;
  const heroes = [];

  for (let i = 0; i < personsCount; i++) {
    const angle = (i / personsCount) * (Math.PI * 2);
    const x = 0, z = 0;
    const quaternion = new THREE.Quaternion();
    const axis = new THREE.Vector3(0, 1, 0);

    quaternion.setFromAxisAngle(axis, Math.PI * 1.5 - angle);

    heroes.push(
      createHeroObject({
        position: {
          x: x + Math.cos(angle) * 20,
          y: 0,
          z: z + Math.sin(angle) * 20,
        },
        rotation: pickBy(quaternion, ["x", "y", "z", "w"]),
      })
    );
  }

  state.setState({
    objects: heroes.reduce(
      (acc, item) => ({ ...acc, [item.id]: item }),
      {}
    ),
  });

  Spawners();
});

const seed = Math.random().toString(36).substring(2, 6)
const x = 0;
const z = 0;
const angle = (0 / 3) * (Math.PI * 2);
const quaternion = new THREE.Quaternion();

const objectHero = createHeroObject({
  position: {
    x: x + Math.cos(angle) * 20,
    y: 0,
    z: z + Math.sin(angle) * 20,
  },
  rotation: pickBy(quaternion, ["x", "y", "z", "w"]),
});

objectHero.id = `${seed}:${objectHero.id}`

export const currentPlayer = createPlayerObject(objectHero.id);

currentPlayer.id = `${seed}:${currentPlayer.id}`

Promise.all(loaders).then(() => {
  render(state);

  state.listen((_, next, params) => {
    if (next.objects) addObjects(next.objects);
  
    if (!params?.server) send(next);
  });

  state.setState({
    objects: {
      [objectHero.id]: objectHero,
    },
    players: {
      [currentPlayer.id]: currentPlayer,
    },
  });
});
