// Вершинный шейдер для анимации частиц
attribute float size; // Атрибут для размера частиц
attribute vec3 values; // Атрибут для размера частиц
uniform float time; // Uniform-переменная для времени
varying float vAnimation; // Передача данных во фрагментный шейдер
varying float vIndex;

void main() {
    // Передача размера частицы во фрагментный шейдер
    vAnimation = size;
    vIndex = values.x;
    float animation = sin(time * 2.0 * (values.x * 2.0)); 

    // Используйте фиксированные позиции вершин для частиц
    // vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    vec4 mvPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
    #endif

    vec4 modelViewPosition = modelViewMatrix * mvPosition;


    // Вы можете применить здесь дополнительные преобразования, если это необходимо

    gl_PointSize = size + ((1.0 - mod(time, 1.0)) * 10.0); // Установка размера частицы

    vec4 basePosition = projectionMatrix * modelViewPosition;

    basePosition.y += (values.x * 10.0) + ((mod(time, 1.0)) * 10.0);
    basePosition.x += animation;

    gl_Position = basePosition;
}
