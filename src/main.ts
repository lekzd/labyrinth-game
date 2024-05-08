import './style.css'
import { render, items } from './render.ts';

import { generateRooms } from './generators/generateRooms'
import { loadModels, loadTextures, loadWorld } from './loader.ts';
import {createHeroObject, state} from './state.ts';
import {onUpdate, send} from "./socket.ts";

const ROOM_SIZE = 13

export const player = createHeroObject()

// Слушаем обновление с сокета
onUpdate((message) => {
  if (!message.init) {
    state.setState(message, { server: true })
    return;
  }

  // TODO: меню с выбором персонажей,
  //  генерация мира на основе количества персов

  // Стартуем мир
  state.setState(
    generateRooms({
      state,
      ROOM_SIZE,
    })
  )
})

state.listen((next, params) => {
  if (next.rooms || next.staticGrid) {
    items.trees({ ...state, ...next })
    items.ground({ ...state, ...next })
  }
  if (!params?.server)
    send(next)
})

// Входим с готовым персонажем

state.setState({
  objects: {
    [player.id]: player
  }
});

Promise.all(
  [loadWorld, loadModels, loadTextures]
    .map(func => func())
).then(() => {
  render(state)
})
