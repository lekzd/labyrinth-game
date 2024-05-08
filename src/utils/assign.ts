export const assign = (from, to) => {
  for (const key in to)
    from[key] = to[key]
}