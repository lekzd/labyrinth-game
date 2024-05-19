export const isEqual = (a: any, b: any) => {
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