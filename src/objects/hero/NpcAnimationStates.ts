export enum NpcBaseAnimations {
  idle = "idle_weapon",
  walk = "walk",
  run = "run_weapon",
  death = "death",
  pickup = "pickup",
  receivehit = "receivehit"
}

export enum NpcAdditionalAnimations {
  "dagger_attack" = "dagger_attack",
  "dagger_attack2" = "dagger_attack2",

  "staff_attack" = "staff_attack",

  "sword_attack" = "sword_attack",
  "sword_attackfast" = "sword_attackfast",
  "hammer_attack" = "hammer_attack",
  "bow_attack" = "bow_attack",
  "gunplay" = "gunplay",

  "spell1" = "spell1",
  "spell2" = "spell2",

  attack = "attack",
  attack2 = "attack2"
}

export const NpcAnimationStates = {
  ...NpcBaseAnimations,
  ...NpcAdditionalAnimations
};
