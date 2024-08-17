// Вершинный шейдер для анимации частиц
attribute float size; // Атрибут для размера частиц
attribute vec3 values; // Атрибут для размера частиц
attribute vec3 directions; // Атрибут для направления частиц
uniform float time; // Uniform-переменная для времени
varying float vTime;
varying float vYFactor;
varying vec2 vUv;

void main() {
    vTime = time;
    vUv = uv;

    vec4 mvPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
    #endif

    vec4 modelViewPosition = modelViewMatrix * mvPosition;

    vYFactor = time * directions.y * 5.0;

    gl_PointSize = max(size + (8.0 - vYFactor), 3.0); // Установка размера частицы

    vec4 basePosition = projectionMatrix * modelViewPosition;

    basePosition.x += cos(directions.x) * vYFactor * 2.0;
    basePosition.y += max(-23.0, (sin(directions.x) * vYFactor) - (vYFactor * vYFactor));

    gl_Position = basePosition;
}
