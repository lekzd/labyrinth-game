export const shuffle = <T = any>(array: T[]): T[] => {
  const result = array.slice(0)
  let i = result.length - 1
  while (i > 0) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
    i--
  }
  return result
}
