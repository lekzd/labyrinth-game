import { createNoise2D } from 'simplex-noise';

function seedRandom(seed: string): () => number {
  // Используем хеш-функцию для преобразования seed строки в число
  const xmur3 = (str: string) => {
      let h = 1779033703 ^ str.length;
      for (let i = 0; i < str.length; i++) {
          h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
          h = (h << 13) | (h >>> 19);
      }
      return () => {
          h = Math.imul(h ^ (h >>> 16), 2246822507);
          h = Math.imul(h ^ (h >>> 13), 3266489909);
          return (h ^= h >>> 16) >>> 0;
      };
  };

  // Функция, которая возвращает псевдослучайное число
  const sfc32 = (a: number, b: number, c: number, d: number) => {
      return () => {
          a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
          let t = (a + b) | 0;
          a = b ^ (b >>> 9);
          b = (c + (c << 3)) | 0;
          c = (c << 21) | (c >>> 11);
          d = (d + 1) | 0;
          t = (t + d) | 0;
          c = (c + t) | 0;
          return (t >>> 0) / 4294967296;
      };
  };

  const seedFunction = xmur3(seed);
  const a = seedFunction();
  const b = seedFunction();
  const c = seedFunction();
  const d = seedFunction();
  
  return sfc32(a, b, c, d);
}

export let pseudoRandom = () => 1;
export let noise: (x: number, y: number) => number;

export const updateSeed = (seed: string) => {
  pseudoRandom = seedRandom(seed);
  noise = createNoise2D(pseudoRandom);
}

export const random = (from: number, to: number) => {
  return (from + Math.floor(pseudoRandom() * (to - from)))
}

export const frandom = (from: number, to: number) => {
  return (from + pseudoRandom() * (to - from))
}