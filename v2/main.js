import * as THREE from 'three';
import html2canvas from 'html2canvas';

import { crtShader } from './shader.js';

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  -window.innerWidth / 2,
  window.innerWidth / 2,
  window.innerHeight / 2,
  -window.innerHeight / 2,
  0.1,
  10
);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const contentElement = document.getElementById('content');

// Shader material setup
const texture = new THREE.CanvasTexture(document.createElement('canvas'));
const material = new THREE.ShaderMaterial({
  uniforms: {
    ...crtShader.uniforms,
    tDiffuse: { value: texture },
    resolution: { value: [window.innerWidth, window.innerHeight] },
  },
  vertexShader: crtShader.vertexShader,
  fragmentShader: crtShader.fragmentShader,
});

const geometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Ensure content is visible during capture
function temporarilyShowContent() {
  contentElement.style.visibility = 'visible';
}

function hideContent() {
  contentElement.style.visibility = 'hidden';
}

// Capture content using html2canvas
function captureContent() {
  temporarilyShowContent();

  // Wait for the page to fully load before capturing
  setTimeout(() => {
    html2canvas(contentElement, { scale: 2, useCORS: true }).then((canvas) => {
      // Update the texture with the captured canvas
      texture.image = canvas;
      texture.needsUpdate = true;
      hideContent();
    }).catch((err) => {
      console.error('Error capturing content with html2canvas:', err);
    });
  }, 500); // Adjust delay if needed
}

// Initial capture
window.onload = () => {
  captureContent();
};

// Animation loop
function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.left = -window.innerWidth / 2;
  camera.right = window.innerWidth / 2;
  camera.top = window.innerHeight / 2;
  camera.bottom = -window.innerHeight / 2;
  camera.updateProjectionMatrix();

  // Update plane geometry
  geometry.dispose();
  const newGeometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight);
  mesh.geometry = newGeometry;

  // Update shader resolution
  material.uniforms.resolution.value = [window.innerWidth, window.innerHeight];

  // Re-capture content
  captureContent();
});

