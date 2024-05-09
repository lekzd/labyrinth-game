// Вершинный шейдер для анимации частиц
attribute float size; // Атрибут для размера частиц
attribute vec3 values; // Атрибут для размера частиц
uniform float time; // Uniform-переменная для времени
varying float vAnimation;
varying float vIndex;
varying float vYFactor;

void main() {
    // Передача размера частицы во фрагментный шейдер
    vIndex = values.x;
    float animation = sin(time * 2.0 * (values.x * 2.0));
    vAnimation = animation;

    vec4 mvPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
    #endif

    vec4 modelViewPosition = modelViewMatrix * mvPosition;

    vYFactor = (mod(time + values.y + (vIndex * 10.0), 10.0)) * 3.0;

    gl_PointSize = max(size + (20.0 - vYFactor), 1.0); // Установка размера частицы

    vec4 basePosition = projectionMatrix * modelViewPosition;

    basePosition.y += vYFactor;
    basePosition.x += vAnimation;

    gl_Position = basePosition;
}
