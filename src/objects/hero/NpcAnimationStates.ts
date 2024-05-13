
export enum NpcBaseAnimations {
  idle = 'idle',
  walk = 'walk',
  run = 'run',
  death = 'death',
  pickup = 'pickup',
}

export enum NpcAdditionalAnimations {
  'dagger_attack' = 'dagger_attack',
  'dagger_attack2' = 'dagger_attack2',

  'staff_attack' = 'staff_attack',

  'sword_attack' = 'sword_attack',
  'sword_attackfast' = 'sword_attackfast',

  'spell1' = 'spell1',
  'spell2' = 'spell2',

  attack = 'attack',
  attack2 = 'attack2',
}

export const NpcAnimationStates = {
  ...NpcBaseAnimations,
  ...NpcAdditionalAnimations
}