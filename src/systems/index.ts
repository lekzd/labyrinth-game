import { CullingSystem } from "./CullingSystem"
import { EnvironmentSystem } from "./EnvironmentSystem"
import { GrassSystem } from "./GrassSystem"
import { InputSystem } from "./InputSystem"
import { LightSystem } from "./LightSystem"
import { ObjectsSystem } from "./ObjectsSystem"
import { UiSettingsSystem } from "./UiSettingsSystem"

export const systems = {
  cullingSystem: CullingSystem(),
  grassSystem: GrassSystem(),
  uiSettingsSystem: UiSettingsSystem(),
  inputSystem: InputSystem(),
  objectsSystem: ObjectsSystem(),
  environmentSystem: EnvironmentSystem(),
  lightSystem: LightSystem(),
}

window.systems = systems;