uniform float time; // Время
uniform float healing; // Лечение
varying float vIndex;
varying float vAnimation;
varying float vYFactor;

void main() {
    float opacityFactor = 7.0 - vYFactor;
    float redFactor = vYFactor;

    if(healing == 1.0) {
        gl_FragColor = vec4(0.1, redFactor, redFactor * 0.1, 1.0);
    } else {
        gl_FragColor = vec4(redFactor, redFactor * 0.05, 0.0, 1.0);
    }
}
