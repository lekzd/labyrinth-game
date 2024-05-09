export const pickBy = <T>(obj, keys) => {
  const next = {};

  if (!obj) return next;

  for (const key of keys) {
    if (key in obj)
      next[key] = obj[key];
  }

  return next as T;
}