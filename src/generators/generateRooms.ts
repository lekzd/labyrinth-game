import { State } from "@/state";
import { RoomConfig } from "@/types";
import { Tiles } from "@/config";
import { random } from "@/utils/random";
import { shuffle } from "@/utils/shuffle";
import { some } from "@/utils/some";
import { drawRect, range } from "./utils";
import { assign } from "@/utils/assign";

const EXITS = [
  Tiles.NorthExit,
  Tiles.EastExit,
  Tiles.SouthExit,
  Tiles.WestExit,
];

const intersectRect = (r1: RoomConfig, r2: RoomConfig) => {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
};

const generateRoom = ({
  width,
  height,
  actions,
  direction,
  x,
  y,
}: Omit<RoomConfig, "tiles">): RoomConfig => {
  const tiles = Array.from<Tiles>({ length: width * height }).fill(Tiles.Floor);

  const getIndex = (x: number, y: number) => {
    return y * width + x;
  };

  drawRect(tiles, 0, 0, width, height, width, Tiles.Wall);
  drawRect(tiles, 1, 1, width - 2, height - 2, width, Tiles.Floor);

  const hc = width >> 1;
  const vc = height >> 1;

  if (actions.includes(Tiles.NorthExit)) {
    // road
    drawRect(tiles, hc, 0, 1, vc, width, Tiles.Empty);
    // exit gap
    drawRect(tiles, hc - 1, 0, 3, 1, width, Tiles.Floor);
    tiles[getIndex(hc, 0)] = Tiles.NorthExit;
  }

  if (actions.includes(Tiles.SouthExit)) {
    // road
    drawRect(tiles, hc, vc, 1, vc, width, Tiles.Empty);
    // exit gap
    drawRect(tiles, hc - 1, height - 1, 3, 1, width, Tiles.Floor);
    tiles[getIndex(hc, height - 1)] = Tiles.SouthExit;
  }

  if (actions.includes(Tiles.WestExit)) {
    // road
    drawRect(tiles, 0, vc, hc, 1, width, Tiles.Empty);
    // exit gap
    drawRect(tiles, 0, vc - 1, 1, 3, width, Tiles.Floor);
    tiles[getIndex(0, vc)] = Tiles.WestExit;
  }

  if (actions.includes(Tiles.EastExit)) {
    // road
    drawRect(tiles, hc, vc, hc, 1, width, Tiles.Empty);
    // exit gap
    drawRect(tiles, width - 1, vc - 1, 1, 3, width, Tiles.Floor);
    tiles[getIndex(width - 1, vc)] = Tiles.EastExit;
  }

  if (actions.includes(Tiles.PuzzleHandler)) {
    let itemsNumber = 3;

    while (itemsNumber) {
      const tileX = random(0, width);
      const tileY = random(0, height);
      const tileIndex = tileY * width + tileX;

      if (tiles[tileIndex] === Tiles.Floor) {
        tiles[tileIndex] = Tiles.PuzzleHandler;
        itemsNumber--;
      }
    }
  }

  if (actions.includes(Tiles.Weapon)) {
    let itemsNumber = 1;

    while (itemsNumber) {
      const tileX = random(0, width);
      const tileY = random(0, height);
      const tileIndex = tileY * width + tileX;

      if (tiles[tileIndex] === Tiles.Floor) {
        tiles[tileIndex] = Tiles.Weapon;
        itemsNumber--;
      }
    }
  }

  if (actions.includes(Tiles.Spawner)) {
    let itemsNumber = 1;

    while (itemsNumber) {
      const tileX = random(0, width);
      const tileY = random(0, height);
      const tileIndex = tileY * width + tileX;

      if (tiles[tileIndex] === Tiles.Floor) {
        tiles[tileIndex] = Tiles.Spawner;
        itemsNumber--;
      }
    }
  }


  return {
    id: `${x}_${y}`,
    width,
    height,
    actions,
    direction,
    tiles,
    x,
    y,
  };
};

const getPerpendicularExits = (from: Tiles): Tiles[] => {
  if (from === Tiles.NorthExit || from === Tiles.SouthExit) {
    return [Tiles.EastExit, Tiles.WestExit];
  }

  return [Tiles.NorthExit, Tiles.SouthExit];
};

type GeneratorConfig = {
  state: State;
  ROOM_SIZE: number;
};

const MAX_SEQUENCE = 10;
const MAX_DEEP = 1;

export const generateRooms = ({ state, ROOM_SIZE }: GeneratorConfig) => {
  // draw central room
  const roomStartX = Math.round((state.colls - ROOM_SIZE) / 2);
  const roomStartY = Math.round((state.rows - ROOM_SIZE) / 2);
  const centralRoom = generateRoom({
    id: `${roomStartX}_${roomStartY}`,
    width: ROOM_SIZE,
    height: ROOM_SIZE,
    x: roomStartX,
    y: roomStartY,
    direction: Tiles.Empty,
    actions: [Tiles.NorthExit, Tiles.EastExit, Tiles.SouthExit, Tiles.WestExit],
  });

  const { rooms } = state;

  rooms[centralRoom.id] = centralRoom;

  // draw branches
  const branches = shuffle(range(4, 8));

  const addSequence = (
    parentRoom: RoomConfig,
    action: Tiles,
    length: number,
    deep: number
  ) => {
    const result: Record<string, RoomConfig> = {};

    for (let i = 0; i < length; i++) {
      let isLast = i === length - 1;
      let x = parentRoom.x;
      let y = parentRoom.y;
      const width = random(3, 8) * 2 + 1;
      const height = random(3, 8) * 2 + 1;
      const actions: Tiles[] = [];

      if (action === Tiles.NorthExit) {
        x += (parentRoom.width - width) >> 1;
        y -= height;
        if (y < 0) {
          y = 0;
          isLast = true;
        }
        actions.push(Tiles.SouthExit);
        if (!isLast) {
          actions.push(Tiles.NorthExit);
        }
      }

      if (action === Tiles.SouthExit) {
        x += (parentRoom.width - width) >> 1;
        y += parentRoom.height;
        if (y > state.rows) {
          y = state.rows;
          isLast = true;
        }
        actions.push(Tiles.NorthExit);
        if (!isLast) {
          actions.push(Tiles.SouthExit);
        }
      }

      if (action === Tiles.WestExit) {
        y += (parentRoom.height - height) >> 1;
        x -= width;
        if (x < 0) {
          x = 0;
          isLast = true;
        }
        actions.push(Tiles.EastExit);
        if (!isLast) {
          actions.push(Tiles.WestExit);
        }
      }

      if (action === Tiles.EastExit) {
        y += (parentRoom.height - height) >> 1;
        x += parentRoom.width;
        if (x > state.colls) {
          x = state.colls;
          isLast = true;
        }
        actions.push(Tiles.WestExit);
        if (!isLast) {
          actions.push(Tiles.EastExit);
        }
      }

      if (random(0, 3) === 0) {
        actions.push(Tiles.PuzzleHandler);
      }

      actions.push(Tiles.Weapon);
      actions.push(Tiles.Spawner);

      const perpendicularExits = getPerpendicularExits(action);

      if (deep < MAX_DEEP) {
        actions.push(...some(perpendicularExits, random(0, 3)));
      }

      const room = { id: `${x}_${y}`, width, height, actions, x, y, tiles: [], direction: action };

      perpendicularExits.forEach((exit) => {
        if (actions.includes(exit)) {
          const length = random(1, MAX_SEQUENCE);
          let success = false;

          for (let i = length; i > 0; i--) {
            const roomsSequence = addSequence(room, exit, i, deep + 1);
            const hasIntersection = Object.values(roomsSequence).some((newRoom) =>
              Object.values(rooms).find((addedRoom) => intersectRect(newRoom, addedRoom))
            );
            const hasOutOfBounds = Object.values(roomsSequence).some(
              (newRoom) =>
                newRoom.x < 0 ||
                newRoom.y < 0 ||
                newRoom.x + newRoom.width > state.colls ||
                newRoom.y + newRoom.height > state.rows
            );

            if (hasIntersection || hasOutOfBounds) {
              continue;
            }

            assign(result, roomsSequence);
            success = true;
            break;
          }

          if (!success) {
            room.actions = actions.filter((a) => a !== exit);
          }
        }
      });

      const newRoom = generateRoom(room);

      result[newRoom.id] = newRoom;
      parentRoom = room;

      if (isLast) {
        break;
      }
    }

    return result;
  };

  for (let i = 0; i < centralRoom.actions.length; i++) {
    let parentRoom = centralRoom;
    const action = parentRoom.actions[i];
    const length = branches[i];

    if (!EXITS.includes(action)) {
      continue;
    }

    Object.values(addSequence(parentRoom, action, length, 0))
      .filter(
        (newRoom) =>
          !(
            newRoom.x < 0 ||
            newRoom.y < 0 ||
            newRoom.x + newRoom.width > state.colls ||
            newRoom.y + newRoom.height > state.rows
          )
      ).forEach(newRoom => {
        rooms[newRoom.id] = newRoom;
      });
  }

  return {
    rooms,
  };
};
