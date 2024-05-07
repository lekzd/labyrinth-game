import './style.css'
import { render, items } from './render.ts';

import { generateRooms } from './generators/generateRooms'
import { loadModels, loadTextures, loadWorld } from './loader.ts';
import { state } from './state.ts';
import {send} from "./socket.ts";

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
  send();

  items.trees(state)
  items.ground(state)
})
