
export const pickBy = <T extends {}, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const next: Partial<T> = {};

  if (!obj) return next as Pick<T, K>;

  for (const key of keys) {
    if (key in obj)
      next[key] = obj[key];
  }

  return next as Pick<T, K>;
}