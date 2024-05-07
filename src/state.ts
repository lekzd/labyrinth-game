import * as THREE from 'three';
import { Player, RoomConfig } from "./generators/types"
import { modelType } from "./loader"
import { DynamicObject } from "./types/DynamicObject"
import { Tiles } from "./types/Tiles"
import { something } from "./utils/something"

// TODO: засунуть сюда какой-нибудь стейт-менеджер
export type State = {
  rows: number
  colls: number
  staticGrid: Tiles[]
  rooms: RoomConfig[]
  objects: DynamicObject[]
  players: Player[]
  activePlayerId: number
  setState: (state: Partial<State>) => void
}

export const initState = (initialState: Partial<State>): State => {
  const {
    rows = 100,
    colls = 100,
    objects = [],
    rooms = [],
    players = [],
    activePlayerId = -1,
  } = initialState

  const staticGrid = Array.from<number>({ length: rows * colls }).fill(Tiles.Floor)

  const setState = (newState: Partial<State>) => {
    Object.assign(state, newState)
  }

  const state = {
    ...initialState,
    rows,
    colls,
    staticGrid,
    objects,
    players,
    activePlayerId,
    rooms,
    setState
  }

  return state
}

const ROWS = 100
const COLLS = 100

let id = 0
const getId = () => id++

const createObject = (data: Partial<DynamicObject>): DynamicObject => {
  return {
    id: getId(),
    type: 'Box',

    position: {
      x: 0,
      y: 0,
      z: 0,
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0,
      w: 0,
    },

    ...data,
  }
}

const createHeroObject = (data: Partial<DynamicObject>): DynamicObject => {
  return createObject({ ...data, type: something(Object.values(modelType)) })
}

const createPlayerObject = (activeObjectId: number): Player => {
  return {
    id: Math.floor(Math.random() * 1e9),
    activeObjectId,
  }
}

const scale = 10

const createCampfireObject = (): DynamicObject => {
  return createObject({
    type: 'Campfire',
    position: {
      x: (COLLS * scale) >> 1,
      y: 0,
      z: (ROWS * scale) >> 1,
    }
  })
}

const personsCount = 3
const heroes = []

for (let i = 0; i < personsCount; i++) {
  const angle = (i / personsCount) * (Math.PI * 2)
  const x = (COLLS * scale) >> 1
  const z = (ROWS * scale) >> 1
  const quaternion = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 1, 0);

  quaternion.setFromAxisAngle(axis, Math.PI * 1.5 - angle);

  heroes.push(createHeroObject({
    position: {
      x: x + (Math.cos(angle) * 20),
      y: 0,
      z: z + (Math.sin(angle) * 20),
    },
    rotation: quaternion
  }))
}

const firstHero = heroes[0]
const firstPlayer = createPlayerObject(firstHero.id)

export const state = initState({
  rows: ROWS,
  colls: COLLS,
  objects: [
    createCampfireObject(),
    ...heroes,
    createObject({
      type: 'Box',
      position: {
        x: 80 + (COLLS * scale) >> 1,
        y: 5,
        z: (ROWS * scale) >> 1,
      }
    })
  ],
  players: [
    createPlayerObject(firstHero.id)
  ],
  activePlayerId: firstPlayer.id
})