export const assign = (from: any, to: any) => {
  for (const key in to)
    from[key] = to[key]
}