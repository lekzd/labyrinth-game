export const isObject = (item) => {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

export const mergeDeep = (target, ...sources) => {

  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) target[key] = {}
        mergeDeep(target[key], source[key]);
      } else if (Array.isArray(target[key]) && Array.isArray(source[key])) {
        target[key].push(...source[key]);
      } else {
        target[key] = source[key];
      }
    }
  } else if (Array.isArray(target) && Array.isArray(source)) {
    target.push(...source);
  }

  return mergeDeep(target, ...sources);
}