// Neon Harbor — rendering: the three.js renderer, sun and sky, and the
// third-person follow camera that trails the player on foot and in a car.

import * as THREE from 'three';
import { PALETTE } from './config.js';

export class Render {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.sky);
    this.scene.fog = new THREE.Fog(PALETTE.fog, 180, 520);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(0, 30, 40);

    const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x4a4238, 0.9);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d0, 2.4);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -160;
    sun.shadow.camera.right = 160;
    sun.shadow.camera.top = 160;
    sun.shadow.camera.bottom = -160;
    sun.shadow.camera.far = 500;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);
    this.sun = sun;

    this.camYaw = 0;
    this.camPitch = 0.32;
    this.camDistance = 13;
    this.smoothed = new THREE.Vector3(0, 4, 20);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /** Orbit the camera with mouse deltas; yaw follows the car when driving. */
  orbit(dx, dy, driving, carHeading) {
    this.camYaw -= dx * 0.0032;
    this.camPitch = Math.max(0.08, Math.min(1.1, this.camPitch + dy * 0.0022));
    if (driving) {
      let diff = carHeading - this.camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.camYaw += diff * 0.02;
    }
  }

  /** Follow the target with a springy chase camera and look slightly ahead. */
  follow(target, speed, dt) {
    const dist = 11 + Math.min(6, speed * 0.16);
    const height = 4.6 + Math.min(2.4, speed * 0.05);
    const ideal = new THREE.Vector3(
      target.x - Math.sin(this.camYaw) * dist * Math.cos(this.camPitch),
      target.y + height + Math.sin(this.camPitch) * dist * 0.4,
      target.z - Math.cos(this.camYaw) * dist * Math.cos(this.camPitch),
    );
    const k = 1 - Math.exp(-dt * 7);
    this.smoothed.lerp(ideal, k);
    this.camera.position.copy(this.smoothed);
    const look = new THREE.Vector3(target.x, target.y + 1.6, target.z);
    this.camera.lookAt(look);
  }

  snapTo(target) {
    const dist = 11;
    this.smoothed.set(
      target.x - Math.sin(this.camYaw) * dist,
      target.y + 5,
      target.z - Math.cos(this.camYaw) * dist,
    );
    this.camera.position.copy(this.smoothed);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
