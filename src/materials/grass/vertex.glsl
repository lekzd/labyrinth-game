uniform float time;

varying float vNoise;
varying vec3 vInstanceColor;
varying vec2 vUv;

float N(vec2 st) { // https://thebookofshaders.com/10/
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float smoothNoise(vec2 ip) { // https://www.youtube.com/watch?v=zXsWftRdsvU
  vec2 lv = fract(ip);
  vec2 id = floor(ip);

  lv = lv * lv * (3. - 2. * lv);

  float bl = N(id);
  float br = N(id + vec2(1, 0));
  float b = mix(bl, br, lv.x);

  float tl = N(id + vec2(0, 1));
  float tr = N(id + vec2(1, 1));
  float t = mix(tl, tr, lv.x);

  return mix(b, t, lv.y);
}

void main() {
  vUv = uv;
  vInstanceColor = instanceColor;

  vec4 pos = instanceMatrix * vec4(position, 1.0);

  // DISPLACEMENT

  float noise = smoothNoise(pos.xz * 0.5 + vec2(time, time));
  noise = pow(noise * 0.5 + 0.5, 2.) * 2.;
  vNoise = noise;

  // here the displacement is made stronger on the blades tips.
  float dispPower = 1. - cos(uv.y * 3.1416 * 0.5);

  float displacement = noise * (0.3 * dispPower);
  pos.z -= displacement;
  pos.x += displacement;

  // VERTEX POSITION

  csm_PositionRaw = projectionMatrix * modelViewMatrix * pos;
}
