import { some } from './some'

export const something = <T = any>(array: T[]): T => {
  return some(array, 1)[0]
}
