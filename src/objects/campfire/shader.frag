uniform float time; // Время
varying float vIndex;
varying float vAnimation;
varying float vYFactor;

void main() {
    
    float redFactor = vYFactor;
    float opacityFactor = 7.0 - vYFactor;

    gl_FragColor = vec4(redFactor, redFactor * 0.05, 0.0, 1.0);
}
