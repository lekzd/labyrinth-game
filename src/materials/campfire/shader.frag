uniform sampler2D map;
uniform vec3 colorHot;
uniform vec3 colorCool;

varying float vLife;

#include <fog_pars_fragment>

void main() {
  vec4 texel = texture2D(map, gl_PointCoord);

  vec3 color = mix(colorHot, colorCool, smoothstep(0.0, 0.6, vLife));
  float fade = smoothstep(0.0, 0.05, vLife) * (1.0 - smoothstep(0.5, 1.0, vLife));

  gl_FragColor = vec4(color, texel.a * fade);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
