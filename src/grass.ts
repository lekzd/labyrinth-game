import * as THREE from 'three';
import {scene} from './scene.ts';

let simpleNoise = `
    float N (vec2 st) { // https://thebookofshaders.com/10/
        return fract( sin( dot( st.xy, vec2(12.9898,78.233 ) ) ) *  43758.5453123);
    }
    
    float smoothNoise( vec2 ip ){ // https://www.youtube.com/watch?v=zXsWftRdsvU
    	vec2 lv = fract( ip );
      vec2 id = floor( ip );
      
      lv = lv * lv * ( 3. - 2. * lv );
      
      float bl = N( id );
      float br = N( id + vec2( 1, 0 ));
      float b = mix( bl, br, lv.x );
      
      float tl = N( id + vec2( 0, 1 ));
      float tr = N( id + vec2( 1, 1 ));
      float t = mix( tl, tr, lv.x );
      
      return mix( b, t, lv.y );
    }
  `;

const vertexShader = `
  uniform float time;
  uniform vec3 directionalLightColor;
  uniform vec3 fogColor; // Цвет тумана
  uniform float fogNear; // Начальная дистанция тумана
  uniform float fogFar; // Конечная дистанция тумана

  varying float vNoise;
  varying vec2 vUv;
  varying vec4 vViewPosition;
  varying float vFogFactor;
  varying vec3 vFogColor;
  
  ${simpleNoise}
  
	void main() {
    vUv = uv;

    float t = time * 2.;
    
    // VERTEX POSITION
    
    vec4 mvPosition = vec4( position, 1.0 );
    #ifdef USE_INSTANCING
    	mvPosition = instanceMatrix * mvPosition;
    #endif
    
    // DISPLACEMENT
    
    float noise = smoothNoise(mvPosition.xz * 0.5 + vec2(0., t));
    noise = pow(noise * 0.5 + 0.5, 2.) * 2.;
    vNoise = noise;
    
    // here the displacement is made stronger on the blades tips.
    float dispPower = 1. - cos( uv.y * 3.1416 * 0.5 );
    
    float displacement = noise * ( 0.3 * dispPower );
    mvPosition.z -= displacement;
    mvPosition.x += displacement;
    
    //
    
    vec4 modelViewPosition = modelViewMatrix * mvPosition;
    vViewPosition = modelViewPosition;
    vFogFactor = smoothstep(fogNear, fogFar, length(modelViewPosition)) * 3.0;
    vFogColor = mix(directionalLightColor, fogColor, vFogFactor);

    gl_Position = projectionMatrix * modelViewPosition;
	}
`;

const fragmentShader = `
  uniform vec3 directionalLightColor;
  uniform vec3 fogColor; // Цвет тумана

  varying float vNoise;
  varying vec2 vUv;
  varying vec4 vViewPosition;
  varying float vFogFactor;
  varying vec3 vFogColor;
  
  void main() {
    if (vFogFactor > 1.99) {
      discard;
    }

  	vec3 baseColor = vec3( 0.31 * vNoise, 1.0 * vNoise, 0.5 );

    float clarity = ( vUv.y * 0.875 ) + 0.125;

    gl_FragColor = vec4( baseColor * clarity * vFogColor, 1.0 );
  }
`;

const uniforms = {
  time: {
    value: 0
  },
  directionalLightColor: {
    value: [0.3, 0.15, 0]
  },
  fogColor: {
    value: scene.fog.color,
  },
  fogNear: {
    value: scene.fog.near,
  },
  fogFar: {
    value: scene.fog.far,
  },
}

const leavesMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide
});

/////////
// MESH
/////////

const dummy = new THREE.Object3D();

export const update = (time) => {
  leavesMaterial.uniforms.time.value += time;
  leavesMaterial.uniformsNeedUpdate = true;
}

export const render = (width, height) => {
  const instanceNumber = width * height * 2
  const geometry = new THREE.PlaneGeometry(width, height);
  const instancedMesh = new THREE.InstancedMesh(geometry, leavesMaterial, instanceNumber );

  for ( let i=0 ; i<instanceNumber ; i++ ) {

    dummy.position.set(
      ( Math.random() - 0.5 ) * width,
      0,
      ( Math.random() - 0.5 ) * height
    );

    dummy.scale.setScalar( 0.001 + Math.random() * 0.001 );

    dummy.rotation.y = Math.random() * Math.PI;
    dummy.rotation.x = Math.random() * (Math.PI / 2);

    dummy.updateMatrix();
    instancedMesh.setMatrixAt( i, dummy.matrix );
    instancedMesh.receiveShadow = true;
  }

  return instancedMesh
}