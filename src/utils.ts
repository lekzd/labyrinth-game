export const isObject = (item) => {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export const mergeDeep = (target, ...sources) => {

  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else if (Array.isArray(target[key]) && Array.isArray(source[key])) {
        target[key].push(...source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  } else if (Array.isArray(target) && Array.isArray(source)) {
    target.push(...source);
  }

  return mergeDeep(target, ...sources);
}

export const throttle = (func, ms = 300) => {

  let isThrottled = false,
    savedArgs,
    savedThis;

  function wrapper() {

    if (isThrottled) {
      savedArgs = arguments;
      savedThis = this;
      return;
    }

    func.apply(this, arguments);

    isThrottled = true;

    setTimeout(function() {
      isThrottled = false;
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, ms);
  }

  return wrapper;
}

export const isEqual = (a, b) => {
  if (!a || !b) {
    return !a === !b;
  }

  if (a instanceof Element || b instanceof Element)
    return a === b;

  if (typeof a === 'object' && typeof b === 'object') {
    if (Object.keys(a).length !== Object.keys(b).length)
      return false;

    for (const key in a)
      if (!isEqual(a[key], b[key]))
        return false;

    return true;
  }

  return a === b;
}