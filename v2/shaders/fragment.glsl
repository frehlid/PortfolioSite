varying vec2 vUv;
uniform sampler2D texture;
uniform float distortionStrength;

void main() {
  vec2 centeredUv = vUv - vec2(0.5);
  float radius = length(centeredUv) * distortionStrength;
  vec2 distortedUv = vUv + centeredUv * radius;

  // Clamp to prevent sampling outside the texture
  distortedUv = clamp(distortedUv, vec2(0.0), vec2(1.0));

  gl_FragColor = texture2D(texture, distortedUv);
}

