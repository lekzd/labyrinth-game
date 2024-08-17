varying float vTime;
varying vec2 vUv;
uniform vec3 color;

void main() {
    gl_FragColor = vec4(color, max(1.0 - vTime, 0.4));
}
