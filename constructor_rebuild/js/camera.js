// camera.js - Orbital camera controller
import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;

// Degrees per second for each axis
const AZ_SPEED   = 60;   // azimuth (left/right arrows)
const DIST_SPEED = 200;  // zoom    (up/down arrows)
const EL_SPEED   = 30;   // elevation (W / S)

export class CameraController {
  constructor() {
    this._camera = null;

    this.azimuth   = 0;    // degrees, horizontal rotation
    this.elevation = 40;   // degrees above horizontal (positive = camera above scene)
    this.distance  = 800;

    this._smoothCenter = new THREE.Vector3(0, 0, 0);
    this._keys = {};

    this._minDist = 200;
    this._maxDist = 2500;
    this._minElev = 10;   // clamp: never go below ground
    this._maxElev = 85;   // clamp: don't flip over the top
  }

  init(camera) {
    this._camera = camera;
    this._applyOrbit(new THREE.Vector3(0, 0, 0));
  }

  /**
   * @param {THREE.Vector3} centerOfMass
   * @param {boolean} isDragging
   * @param {number} dt  frame delta in seconds
   */
  update(centerOfMass, isDragging, dt) {
    if (!isDragging) {
      if (this._keys['ArrowLeft'])  this.azimuth   -= AZ_SPEED   * dt;
      if (this._keys['ArrowRight']) this.azimuth   += AZ_SPEED   * dt;
      if (this._keys['ArrowUp'])    this.distance   = Math.max(this._minDist, this.distance - DIST_SPEED * dt);
      if (this._keys['ArrowDown'])  this.distance   = Math.min(this._maxDist, this.distance + DIST_SPEED * dt);
      if (this._keys['w'] || this._keys['W']) this.elevation = Math.min(this._maxElev, this.elevation + EL_SPEED * dt);
      if (this._keys['s'] || this._keys['S']) this.elevation = Math.max(this._minElev, this.elevation - EL_SPEED * dt);
    }

    // Smooth-follow center of mass (lerp, frame-rate independent)
    const lerpFactor = 1 - Math.pow(1 - 1 / 6, dt * 60);
    this._smoothCenter.lerp(centerOfMass, lerpFactor);

    this._applyOrbit(this._smoothCenter);
  }

  _applyOrbit(center) {
    const azRad = this.azimuth   * DEG2RAD;
    const elRad = this.elevation * DEG2RAD;

    const cosEl = Math.cos(elRad);
    const sinEl = Math.sin(elRad);

    this._camera.position.set(
      center.x + this.distance * cosEl * Math.sin(azRad),
      center.y + this.distance * sinEl,
      center.z + this.distance * cosEl * Math.cos(azRad)
    );
    this._camera.up.set(0, 1, 0);
    this._camera.lookAt(center);
  }

  onKeyDown(key) { this._keys[key] = true;  }
  onKeyUp(key)   { this._keys[key] = false; }

  resetCenter(pos) { this._smoothCenter.copy(pos); }
}
