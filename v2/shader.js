export const crtShader = {
  uniforms: {
    "tDiffuse": { type: "t", value: null },
    "time": { value: 0.0 },
    "distortion": { value: 1.5 },
    "resolution": { value: [1.0, 1.0] },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float distortion;
    uniform vec2 resolution;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      uv.x *= resolution.x / resolution.y;

      // Apply CRT-style barrel distortion
      float r = length(uv);
      uv *= mix(1.0, r, distortion * 0.1);

      uv = uv * 0.5 + 0.5; // Map back to 0..1 space

      // Sample the texture
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black outside bounds
      } else {
        gl_FragColor = texture2D(tDiffuse, uv);
      }
    }
  `,
};

