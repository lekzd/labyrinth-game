export const pickPrev = (base, next) => {
  if (typeof base !== 'object' || !base) return base;

  const res = {};

  for (const key in next)
    res[key] = pickPrev(base[key], next[key]);

  return res;
}