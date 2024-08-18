varying float vTime;
varying vec2 vUv;
uniform vec3 color;
uniform float animationEnd;

void main() {
    float redFactor = vTime / animationEnd;
    vec3 red = vec3(1.0, 0.0, 0.0);

    gl_FragColor = vec4(mix(color, red, redFactor), redFactor + 0.5);
}
