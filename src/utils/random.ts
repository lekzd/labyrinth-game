export const random = (from: number, to: number) => {
  return (from + Math.floor(Math.random() * (to - from)))
}

export const frandom = (from: number, to: number) => {
  return (from + Math.random() * (to - from))
}