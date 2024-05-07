uniform float time; // Время
varying float vIndex;

void main() {
    // Используйте значение времени для анимации частиц
    float animation = sin(time * 2.0 + (vIndex * 2.0)); 

    // Примените анимацию к позиции, цвету или другим атрибутам частиц
    // gl_PointSize = 10.0 + animation * 5.0; // Изменение размера частиц во времени
    // gl_PointSize = 0.1;
    // gl_FragColor = vec4(animation, 0.0, 1.0 - animation, 1.0); // Изменение цвета частиц во времени
    gl_FragColor = vec4(animation, 0.0, 0.0, animation); // Изменение цвета частиц во времени
}
