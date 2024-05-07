import './style.css'
import { render, items } from './render.ts';

import { generateRooms } from './generators/generateRooms'
import {loadModels, loadTextures, loadWorld, modelType} from './loader.ts';
import { initState } from './state.ts';
import { Player } from './generators/types.ts';
import { DynamicObject } from './types/DynamicObject.ts';
import { something } from './utils/something.ts';

const ROWS = 100
const COLLS = 100
const ROOM_SIZE = 13

const createPersonObject = (): DynamicObject => {
  return {
    id: Math.floor(Math.random() * 1e9),
    type: something(Object.values(modelType)),
    x: 0,
    y: 0,
    z: 0,
  }
}

const createPlayerObject = (activeObjectId: number): Player => {
  return {
    id: Math.floor(Math.random() * 1e9),
    activeObjectId,
  }
}

const firstPerson = createPersonObject()
const firstPlayer = createPlayerObject(firstPerson.id)

const state = initState({
  rows: ROWS,
  colls: COLLS,
  objects: [
    firstPerson,
    createPersonObject(),
  ],
  players: [
    createPlayerObject(firstPerson.id)
  ],
  activePlayerId: firstPlayer.id
})

generateRooms({
  state,
  ROOM_SIZE,
})

Promise.all([
  loadTextures(),
  loadModels(),
  loadWorld()
]).then(() => {
  render(state)

  items.trees(state)
  items.ground(state)
})
