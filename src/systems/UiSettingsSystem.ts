import { Emitter } from "strict-event-emitter";
import * as THREE from "three";
import * as dat from "dat.gui";
import { mergeDeep } from "../utils/mergeDeep";
import { systems } from ".";

const DEFAULTS = {
  renderer: {
    antialias: true,
    alpha: false,
    precision: "highp",
    pixelRatio: window.devicePixelRatio,
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 1.0,
    shadows: true
  },
  camera: {
    fov: 40,
    aspect: window.innerWidth / window.innerHeight,
    near: 1.0,
    far: 500.0
  },
  game: {
    physics: true,
    physics_boxes: false,
    enemy_ai: true,
    time: 0
  }
};

type Settings = typeof DEFAULTS;

type Transform<T> = {
  [K in keyof T]: [T[K]]
};

type EventsMap = Transform<Settings>;

export const UiSettingsSystem = () => {
  const gui = new dat.GUI({
    closed: true,
    autoPlace: false,
    width: 360
  });

  const events = new Emitter<EventsMap>();

  gui.useLocalStorage = true;
  gui.domElement.style.position = "fixed";
  gui.domElement.style.right = "0";
  gui.domElement.style.top = "0";

  const loadSettings = (): typeof DEFAULTS => {
    try {
      if (localStorage.getItem("savedSettings")) {
        return mergeDeep(
          {},
          DEFAULTS,
          JSON.parse(localStorage.getItem("savedSettings")!)
        );
      }
      return structuredClone(DEFAULTS);
    } catch (e) {
      return structuredClone(DEFAULTS);
    }
  };

  const store = loadSettings();
  const renderer = new THREE.WebGLRenderer(store.renderer);
  const camera = new THREE.PerspectiveCamera(
    store.camera.fov,
    window.innerWidth / window.innerHeight,
    store.camera.near,
    store.camera.far
  );

  type ApplyFn = (attr: string, value: any) => void;

  type Store = typeof store;

  const addParam = <K extends keyof Store>(
    gui: dat.GUI,
    dir: K,
    applyFunction: ApplyFn,
    label: string,
    name: string,
    ...rest: any[]
  ) => {
    return (
      gui
        // @ts-expect-error
        .add(store[dir], name, ...rest)
        .name(label)
        .onChange(applyChange.bind(0, name, applyFunction, dir))
    );
  };

  const applyChange = (
    attr: string,
    applyFunction: ApplyFn,
    dir: keyof EventsMap,
    value: any
  ) => {
    localStorage.setItem("savedSettings", JSON.stringify(store));

    applyFunction(attr, value);

    events.emit(dir, store[dir]);
  };

  const addRenderingControlls = () => {
    const toneMappingTypes = {
      off: THREE.NoToneMapping,
      Linear: THREE.LinearToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
      Custom: THREE.CustomToneMapping,
      Cineon: THREE.CineonToneMapping,
      ACESFilmic: THREE.ACESFilmicToneMapping,
      AgX: THREE.AgXToneMapping,
      Neutral: THREE.NeutralToneMapping
    };

    const rederingGui = gui.addFolder("Рендеринг");

    const applyRenderingChange = (attr: string, value: any) => {
      switch (attr) {
        case "antialias":
        case "alpha":
        case "precision":
          location.reload();
          break;
        case "toneMapping":
          renderer[attr] =
            toneMappingTypes[value as keyof typeof toneMappingTypes];
          break;
        case "shadows":
          renderer.shadowMap.enabled = value as boolean;
          break;
        default:
          // @ts-expect-error
          renderer[attr] = value;
      }
    };

    const addRenderingParam = addParam.bind(
      0,
      rederingGui,
      "renderer",
      applyRenderingChange
    );

    // Добавляем на панель управления параметры рендерера
    addRenderingParam("Антиалиасинг", "antialias");
    addRenderingParam(
      "Pixel ratio",
      "pixelRatio",
      0.5,
      window.devicePixelRatio
    );
    addRenderingParam("Прозрачность", "alpha");
    addRenderingParam("Точность", "precision", ["highp", "mediump", "lowp"]);
    addRenderingParam(
      "Tone mapping",
      "toneMapping",
      Object.keys(toneMappingTypes)
    );
    addRenderingParam("Яркость", "toneMappingExposure", 0, 5);
    addRenderingParam("Тени", "shadows");
  };

  const addCameraControlls = () => {
    const rederingGui = gui.addFolder("Камера");

    const applyCameraChange = (attr: string, value: any) => {
      switch (attr) {
        default:
          // @ts-expect-error
          camera[attr] = value;
      }
      camera.updateProjectionMatrix();
    };

    const addRenderingParam = addParam.bind(
      0,
      rederingGui,
      "camera",
      applyCameraChange
    );

    // Добавляем на панель управления параметры рендерера
    addRenderingParam("Поле зрения", "fov", 1, 180);
    addRenderingParam("Соотношение сторон", "aspect");
    addRenderingParam("Ближняя границв", "near", 0.1, 100);
    addRenderingParam("Дальность отрисовки", "far", 100, 1000);
  };

  const addGameControlls = () => {
    const rederingGui = gui.addFolder("Игра");

    const applyGameChange = (attr: string, value: any) => {
      switch (attr) {
        case "time":
          systems.environmentSystem.setTime(value);
          break;
        case "physics_boxes":
          location.reload();
          break;
      }
    };

    const addRenderingParam = addParam.bind(
      0,
      rederingGui,
      "game",
      applyGameChange
    );

    addRenderingParam("Физика", "physics");
    addRenderingParam("Физические_боксы", "physics_boxes");
    addRenderingParam("ИИ врагов", "enemy_ai");
    addRenderingParam("Время", "time", 0, 24 * 60 * 60);
  };

  addRenderingControlls();
  addCameraControlls();
  addGameControlls();

  return {
    settings: store,
    renderer,
    camera,
    dom: gui.domElement,
    events
  };
};
