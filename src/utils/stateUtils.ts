import { currentPlayer } from "@/main";
import { State } from "@/state";

export const getObjectFromState = (id: string) => (state: Partial<State>) => {
  return state.objects?.[id];
};

export const getActiveObjectFromState = (state: Partial<State>) =>
  getObjectFromState(currentPlayer.activeObjectId)(state);

export const selectObjectsByType = (...types: string[]) => (state: Partial<State>) => {
  return Object.values(state.objects ?? {}).filter((object) => types.includes(object.type));
};

export const selectAllPlayerObjects = selectObjectsByType("Monk", "Cleric", "Rogue", "Warrior", "Wizard")
