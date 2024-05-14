
export const InputSystem = () => {
  const input = {
    forward: false,
    backward: false,
    jumping: false,
    left: false,
    right: false,
    enter: false,
    speed: false,
    attack: false,
    interact: false,
  };

  type Callback = (state: typeof input) => void

  const handlers: Record<string, Callback[]> = {
    keyDown: [],
    update: [],
    keyUp: [],
  }

  const runAll = (callbacks: Callback[]) => {
    callbacks.forEach(callback => {
      callback(input)
    })
  }

  const addKeyBoardEventListeners = () => {
    Object.entries({
      mousedown: () => {
        input.attack = true
  
        runAll(handlers.keyDown)
      },
      mouseup: () => {
        input.attack = false
  
        runAll(handlers.keyUp)
      },
      keydown: (event) => {
        input.speed = event.shiftKey;
  
        switch (event.keyCode) {
          case 32: // space
            input.jumping = true
            break;
          case 87: // w
            input.forward = true;
            break;
          case 38: // arrow up
            input.forward = true;
            break;
  
          case 65: // a
            input.left = true;
            break;
          case 37: // arrow left
            input.left = true;
            break;
  
          case 83: // s
            input.backward = true;
            break;
          case 40: // arrow down
            input.backward = true;
            break;
  
          case 68: // d
            input.right = true;
            break;
          case 39: // arrow right
            input.right = true;
            break;
  
          case 13: // ENTER
            input.enter = true;
            break;
  
          case 70: // F
            input.interact = true;
            break;
        }
  
        runAll(handlers.keyDown)
      },
      keyup: (event) => {
        switch(event.keyCode) {
          case 32: // space
            input.jumping = false
            break;
          case 87: // w
            input.forward = false;
            break;
          case 38: // arrow up
            input.forward = false;
            break;
  
          case 65: // a
            input.left = false;
            break;
          case 37: // arrow left
            input.left = false;
            break;
  
          case 83: // s
            input.backward = false;
            break;
          case 40: // arrow down
            input.backward = false;
            break;
  
          case 68: // d
            input.right = false;
            break;
          case 39: // arrow right
            input.right = false;
            break;
  
          case 13: // ENTER
            input.enter = false;
            break;
  
          case 70: // F
            input.interact = false;
            break;
        }
  
        runAll(handlers.keyUp)
      }
    }).forEach(args => document.addEventListener(...args, false))
  }

  // TODO: add mobile and gamepad controlls
  addKeyBoardEventListeners()

  return {
    input,
    update: () => {
      runAll(handlers.update)
    },
    onKeyDown: (callback: Callback) => {
      handlers.keyDown.push(callback)

      return () => {
        handlers.keyDown = handlers.keyDown.filter(c => c !== callback)
      }
    },
    onUpdate: (callback: Callback) => {
      handlers.update.push(callback)

      return () => {
        handlers.update = handlers.update.filter(c => c !== callback)
      }
    },
    onKeyUp: (callback: Callback) => {
      handlers.keyUp.push(callback)

      return () => {
        handlers.keyUp = handlers.keyUp.filter(c => c !== callback)
      }
    },
  }
}