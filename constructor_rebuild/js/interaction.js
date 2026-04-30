// interaction.js - Mouse drag interaction with mass spheres
import * as THREE from 'three';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const DRAG_SPRING_STRENGTH = 10;
const DRAG_SPRING_DAMPING  = 1;
const MASS_VALUE = 10;

export class Interaction {
  constructor() {
    this._camera = null;
    this._renderer = null;
    this._masses = null;         // array of {body, mesh}
    this._physicsWorld = null;

    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    this._dragging = false;
    this._dragBody = null;
    this._dragPlane = new THREE.Plane();
    this._dragTarget = new THREE.Vector3();
    this._hitPoint = new THREE.Vector3();
    this._planeNormal = new THREE.Vector3(0, 1, 0);
  }

  init(camera, renderer, masses, physicsWorld) {
    this._camera = camera;
    this._renderer = renderer;
    this._masses = masses;
    this._physicsWorld = physicsWorld;
  }

  /** Update masses reference (call after constructor switch) */
  setMasses(masses) {
    this._masses = masses;
    this._dragging = false;
    this._dragBody = null;
  }

  get isDragging() {
    return this._dragging;
  }

  _getNormalizedCoords(event) {
    const rect = this._renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width)  * 2 - 1,
      -((event.clientY - rect.top)  / rect.height) * 2 + 1
    );
  }

  onMouseDown(event) {
    if (!this._masses || this._masses.length === 0) return;

    const mouse = this._getNormalizedCoords(event);
    this._raycaster.setFromCamera(mouse, this._camera);

    const meshes = this._masses.map(m => m.mesh);
    const hits = this._raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object;
      const massObj = this._masses.find(m => m.mesh === hitMesh);
      if (massObj) {
        this._dragging = true;
        this._dragBody = massObj.body;

        // Set drag plane: horizontal at the mass's Y position
        const massY = massObj.body.position.y;
        this._dragPlane.setFromNormalAndCoplanarPoint(
          this._planeNormal,
          new THREE.Vector3(0, massY, 0)
        );

        // Initial target at hit point
        this._dragTarget.copy(hits[0].point);
      }
    }
  }

  onMouseMove(event) {
    if (!this._dragging) return;

    const mouse = this._getNormalizedCoords(event);
    this._raycaster.setFromCamera(mouse, this._camera);

    const intersectPt = new THREE.Vector3();
    if (this._raycaster.ray.intersectPlane(this._dragPlane, intersectPt)) {
      this._dragTarget.copy(intersectPt);
    }
  }

  onMouseUp(event) {
    this._dragging = false;
    this._dragBody = null;
  }

  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.onMouseDown(event.touches[0]);
    }
  }

  onTouchMove(event) {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.onMouseMove(event.touches[0]);
    }
  }

  onTouchEnd(event) {
    this.onMouseUp(event);
  }

  /** Called each frame: apply spring force from drag body toward target */
  update() {
    if (!this._dragging || !this._dragBody) return;

    const body = this._dragBody;
    const p = body.position;
    const t = this._dragTarget;

    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const dz = t.z - p.z;

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.001) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;

    const relVel = body.velocity.x * nx + body.velocity.y * ny + body.velocity.z * nz;
    const forceMag = (DRAG_SPRING_STRENGTH * dist - DRAG_SPRING_DAMPING * relVel) * MASS_VALUE;

    body.applyForce(new CANNON.Vec3(
      forceMag * nx,
      forceMag * ny,
      forceMag * nz
    ));
  }
}
