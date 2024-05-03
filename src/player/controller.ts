const BasicCharacterControllerInput = () => {
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    enter: false,
  };

  Object.entries({
    keydown: (event) => {
      switch (event.keyCode) {
        case 87: // w
          keys.forward = true;
          break;
        case 38: // arrow up
          keys.forward = true;
          break;

        case 65: // a
          keys.left = true;
          break;
        case 37: // arrow left
          keys.left = true;
          break;

        case 83: // s
          keys.backward = true;
          break;
        case 40: // arrow down
          keys.backward = true;
          break;

        case 68: // d
          keys.right = true;
          break;
        case 39: // arrow right
          keys.right = true;
          break;

        case 13: // ENTER
          keys.enter = true;
          break;
      }
    },
    keyup: (event) => {
      switch(event.keyCode) {
        case 87: // w
          keys.forward = false;
          break;
        case 38: // arrow up
          keys.forward = false;
          break;

        case 65: // a
          keys.left = false;
          break;
        case 37: // arrow left
          keys.left = false;
          break;

        case 83: // s
          keys.backward = false;
          break;
        case 40: // arrow down
          keys.backward = false;
          break;

        case 68: // d
          keys.right = false;
          break;
        case 39: // arrow right
          keys.right = false;
          break;

        case 13: // ENTER
          keys.enter = false;
          break;
      }
    }
  }).forEach(args => document.addEventListener(...args, false))

  // TODO listerns for btn events
  
  return keys;
};

export default BasicCharacterControllerInput;