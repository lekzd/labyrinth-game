import { random } from './random'
import { shuffle } from './shuffle'

export const some = <T = any>(array: T[], count: number = 1): T[] => {
  if (count < 2) {
    return [array[random(0, array.length)]]
  } else {
    return shuffle(array).slice(0, count)
  }
}
