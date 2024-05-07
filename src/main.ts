import './style.css'
import { render, items } from './render.ts';

import { generateRooms } from './generators/generateRooms'
import { loadModels, loadTextures, loadWorld } from './loader.ts';
import { state } from './state.ts';

const ROOM_SIZE = 13

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
