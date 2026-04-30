// world.js - Three.js scene setup and visual elements
import * as THREE from 'three';

export class World3D {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }

  init(canvas) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 1200, 3000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      canvas.clientWidth / canvas.clientHeight,
      1,
      5000
    );
    this.camera.position.set(0, 400, 800);
    this.camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(400, 600, 400); // 45 degrees
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 3000;
    dirLight.shadow.camera.left = -500;
    dirLight.shadow.camera.right = 500;
    dirLight.shadow.camera.top = 500;
    dirLight.shadow.camera.bottom = -500;
    this.scene.add(dirLight);

    // Hemisphere light for fill
    const hemi = new THREE.HemisphereLight(0x334455, 0x223322, 0.4);
    this.scene.add(hemi);

    // Floor
    this._buildFloor();
  }

  _buildFloor() {
    // Procedural 8x8 checkerboard DataTexture - green tones
    const size = 8;
    const data = new Uint8Array(size * size * 4);
    const colorA = [30, 60, 35, 255];   // dark green
    const colorB = [50, 90, 55, 255];   // lighter green

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const idx = (row * size + col) * 4;
        const c = (row + col) % 2 === 0 ? colorA : colorB;
        data[idx]     = c[0];
        data[idx + 1] = c[1];
        data[idx + 2] = c[2];
        data[idx + 3] = c[3];
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);  // tile across 2000 units
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    const geo = new THREE.BoxGeometry(2000, 15, 2000);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.0,
    });

    this.floorMesh = new THREE.Mesh(geo, mat);
    this.floorMesh.position.set(0, -257.5, 0);  // center at -257.5 so top is at -250
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);
  }

  createMassMesh() {
    const geo = new THREE.SphereGeometry(10, 16, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xdd2222,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0x330000,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  createSpringMesh() {
    const geo = new THREE.CylinderGeometry(1.5, 1.5, 1, 8, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.5,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  removeMesh(mesh) {
    if (mesh && this.scene) {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize(width, height) {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }
}
