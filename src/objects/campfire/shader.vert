// Вершинный шейдер для анимации частиц
attribute float size; // Атрибут для размера частиц
uniform float time; // Uniform-переменная для времени
varying float vAnimation; // Передача данных во фрагментный шейдер

void main() {
    // Передача размера частицы во фрагментный шейдер
    vAnimation = size;

    // Используйте фиксированные позиции вершин для частиц
    // vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    vec4 mvPosition = vec4(position, 1.0);
    #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
    #endif

    vec4 modelViewPosition = modelViewMatrix * mvPosition;


    // Вы можете применить здесь дополнительные преобразования, если это необходимо

    gl_PointSize = size; // Установка размера частицы

    gl_Position = projectionMatrix * modelViewPosition;
}
