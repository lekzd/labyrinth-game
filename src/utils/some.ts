import { shuffle } from './shuffle'

export const some = <T = any>(array: T[], count: number = 1): T[] => {
  if (count < 2) {
    return [array[Math.floor(Math.random() * array.length)]]
  } else {
    return shuffle(array).slice(0, count)
  }
}
