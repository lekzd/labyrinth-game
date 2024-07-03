import "./style.css";
import { render, items, addObjects } from "./render.ts";
import * as THREE from "three";
import "./utils/threejsPatches.ts";

import { generateRooms } from "./generators/generateRooms";
import { loaders } from "./loader.ts";
import {
  COLLS,
  createCampfireObject,
  createHeroObject,
  createPlayerObject,
  ROWS,
  scale,
  state,
} from "./state.ts";
import { onUpdate, send } from "./socket.ts";
import { pickBy } from "./utils/pickBy.ts";

const ROOM_SIZE = 13;

onUpdate((next) => {
  if (!next.init) {
    state.setState(next, { server: true });
    return;
  }

  const personsCount = 2;
  const heroes = [];

  for (let i = 0; i < personsCount; i++) {
    const angle = (i / personsCount) * (Math.PI * 2);
    const x = (COLLS * scale) >> 1;
    const z = (ROWS * scale) >> 1;
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

  const { rooms } = generateRooms({
    state,
    ROOM_SIZE,
  });

  state.setState({
    rooms,
    objects: [createCampfireObject(), ...heroes].reduce(
      (acc, item) => ({ ...acc, [item.id]: item }),
      {}
    ),
  });
});

const seed = Math.random().toString(36).substring(2, 6)
const x = (COLLS * scale) >> 1;
const z = (ROWS * scale) >> 1;
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

  state.listen((next, params) => {
    if (next.rooms) {
      items.roomChunks({ ...state });
    }
  
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
