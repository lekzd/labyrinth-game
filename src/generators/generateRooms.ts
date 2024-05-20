import { State } from "@/state";
import { Tiles, RoomConfig } from "@/types";
import { random } from "@/utils/random";
import { shuffle } from "@/utils/shuffle";
import { some } from "@/utils/some";
import { drawRect, drawTiles, range } from "./utils";

const EXITS = [
  Tiles.NorthExit,
  Tiles.EastExit,
  Tiles.SouthExit,
  Tiles.WestExit,
];

let id = 0;
const getId = () => id++;

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

  return {
    id: getId(),
    width,
    height,
    actions,
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
    id: getId(),
    width: ROOM_SIZE,
    height: ROOM_SIZE,
    x: roomStartX,
    y: roomStartY,
    actions: [Tiles.NorthExit, Tiles.EastExit, Tiles.SouthExit, Tiles.WestExit],
  });

  const { staticGrid, rooms } = state;

  drawTiles(
    staticGrid,
    roomStartX,
    roomStartY,
    centralRoom.width,
    centralRoom.height,
    state.colls,
    centralRoom.tiles
  );

  rooms.push(centralRoom);

  // draw branches
  const branches = shuffle(range(4, 8));

  const addSequence = (
    parentRoom: RoomConfig,
    action: Tiles,
    length: number,
    deep: number
  ) => {
    const result: RoomConfig[] = [];

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

      const perpendicularExits = getPerpendicularExits(action);

      if (deep < MAX_DEEP) {
        actions.push(...some(perpendicularExits, random(0, 3)));
      }

      const room = { id: getId(), width, height, actions, x, y, tiles: [] };

      perpendicularExits.forEach((exit) => {
        if (actions.includes(exit)) {
          const length = random(1, MAX_SEQUENCE);
          let success = false;

          for (let i = length; i > 0; i--) {
            const roomsSequence = addSequence(room, exit, i, deep + 1);
            const hasIntersection = roomsSequence.some((newRoom) =>
              rooms.find((addedRoom) => intersectRect(newRoom, addedRoom))
            );
            const hasOutOfBounds = roomsSequence.some(
              (newRoom) =>
                newRoom.x < 0 ||
                newRoom.y < 0 ||
                newRoom.x + newRoom.width > state.colls ||
                newRoom.y + newRoom.height > state.rows
            );

            if (hasIntersection || hasOutOfBounds) {
              continue;
            }
            result.push(...roomsSequence);
            success = true;
            break;
          }

          if (!success) {
            room.actions = actions.filter((a) => a !== exit);
          }
        }
      });

      result.push(generateRoom(room));

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

    const roomsSequence = addSequence(parentRoom, action, length, 0).filter(
      (newRoom) =>
        !(
          newRoom.x < 0 ||
          newRoom.y < 0 ||
          newRoom.x + newRoom.width > state.colls ||
          newRoom.y + newRoom.height > state.rows
        )
    );
    rooms.push(...roomsSequence);
  }

  rooms.forEach((room) => {
    drawTiles(
      staticGrid,
      room.x,
      room.y,
      room.width,
      room.height,
      state.colls,
      room.tiles
    );
  });

  return {
    staticGrid,
    rooms,
  };
};
