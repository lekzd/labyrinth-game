import { ActiveRoomSystem } from "./ActiveRoomSystem"
import { CullingSystem } from "./CullingSystem"
import { GrassSystem } from "./GrassSystem"
import { InputSystem } from "./InputSystem"
import { ObjectsSystem } from "./ObjectsSystem"
import { UiSettingsSystem } from "./UiSettingsSystem"

export const systems = {
  cullingSystem: CullingSystem(),
  grassSystem: GrassSystem(),
  uiSettingsSystem: UiSettingsSystem(),
  activeRoomSystem: ActiveRoomSystem(),
  inputSystem: InputSystem(),
  objectsSystem: ObjectsSystem(),
}