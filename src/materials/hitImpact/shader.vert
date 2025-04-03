// Вершинный шейдер для анимации частиц
attribute float size; // Атрибут для размера частиц
attribute vec3 values; // Атрибут для размера частиц
attribute vec3 directions; // Атрибут для направления частиц
uniform float time; // Uniform-переменная для времени
varying float vTime;
varying float vYFactor;
varying vec2 vUv;
uniform float animationEnd;

void main() {
    vTime = time;
    vUv = uv;

    vec4 mvPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
    #endif

    vec4 modelViewPosition = modelViewMatrix * mvPosition;

    float progressFactor = time / animationEnd;
    vYFactor = progressFactor * directions.y * 0.05;

    gl_PointSize = (1.0 - progressFactor) * values.x; // Установка размера частицы

    vec4 basePosition = projectionMatrix * modelViewPosition;

    float yFactor = vYFactor - 2.0;

    basePosition.y = basePosition.y + (vYFactor);

    gl_Position = basePosition;
}
