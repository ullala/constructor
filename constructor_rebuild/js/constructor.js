// constructor.js - Manages masses, constraints, and spring visuals
import * as THREE from 'three';
import { CONSTRUCTORS, WORLD } from './config.js';

const _up   = new THREE.Vector3(0, 1, 0);
const _dir  = new THREE.Vector3();
const _mid  = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export class Constructor {
  constructor() {
    this.masses  = [];   // [{ body, mesh }]
    this.springs = [];   // [{ massA, massB, constraint, mesh, initialDist, sinusVal }]
    this._physicsWorld = null;
    this._world3D      = null;
  }

  init(physicsWorld, world3D, configIndex) {
    this._physicsWorld = physicsWorld;
    this._world3D      = world3D;

    const cfg = CONSTRUCTORS[configIndex];

    // --- masses ---
    for (const pos of cfg.positions) {
      const body = physicsWorld.addSphere(
        { x: pos[0], y: pos[1], z: pos[2] },
        WORLD.massRadius,
        WORLD.massMass
      );
      const mesh = world3D.createMassMesh();
      mesh.position.set(pos[0], pos[1], pos[2]);
      this.masses.push({ body, mesh });
    }

    // --- connections: spring-damper forces applied per sub-step ---
    for (let i = 0; i < cfg.connections.length; i++) {
      const [iA, iB] = cfg.connections[i];
      const sinusVal  = cfg.sinus[i];

      const posA = cfg.positions[iA];
      const posB = cfg.positions[iB];
      const dx = posB[0] - posA[0];
      const dy = posB[1] - posA[1];
      const dz = posB[2] - posA[2];
      const initialDist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      const mesh = world3D.createSpringMesh();

      this.springs.push({ massA: this.masses[iA], massB: this.masses[iB],
                          mesh, initialDist, sinusVal });
    }
  }

  destroy() {
    for (const s of this.springs) {
      this._world3D.removeMesh(s.mesh);
    }
    for (const m of this.masses) {
      this._physicsWorld.removeBody(m.body);
      this._world3D.removeMesh(m.mesh);
    }
    this.masses  = [];
    this.springs = [];
  }

  // Called once per sub-step — applies spring-damper forces (Hooke + dashpot).
  // Smooth and continuous: no sudden impulse corrections like rigid constraints.
  applySpringForces(sinusCounter) {
    const sinValue = sinusCounter / 100.0;
    const k = WORLD.springStiffness;
    const c = WORLD.springDamping;

    for (const spring of this.springs) {
      const bodyA = spring.massA.body;
      const bodyB = spring.massB.body;
      const pA = bodyA.position;
      const pB = bodyB.position;

      const dx = pB.x - pA.x;
      const dy = pB.y - pA.y;
      const dz = pB.z - pA.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < 0.001) continue;

      let restLength = spring.initialDist;
      if (spring.sinusVal !== 0) {
        const s = Math.sin(Math.PI * (sinValue + spring.sinusVal));
        restLength *= (1.0 + WORLD.sinusStrength * s);
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      // Relative velocity projected onto spring axis
      const relVel = (bodyB.velocity.x - bodyA.velocity.x) * nx
                   + (bodyB.velocity.y - bodyA.velocity.y) * ny
                   + (bodyB.velocity.z - bodyA.velocity.z) * nz;

      const forceMag = k * (dist - restLength) + c * relVel;

      this._physicsWorld.applyForce(bodyA,  forceMag * nx,  forceMag * ny,  forceMag * nz);
      this._physicsWorld.applyForce(bodyB, -forceMag * nx, -forceMag * ny, -forceMag * nz);
    }
  }

  // Called every render frame — syncs Three.js visuals from physics positions.
  updateVisuals() {
    let cx = 0, cy = 0, cz = 0;

    for (const m of this.masses) {
      const p = m.body.position;
      m.mesh.position.set(p.x, p.y, p.z);
      cx += p.x;  cy += p.y;  cz += p.z;
    }

    // Update spring rod meshes
    for (const spring of this.springs) {
      const pA = spring.massA.body.position;
      const pB = spring.massB.body.position;

      const dx = pB.x - pA.x;
      const dy = pB.y - pA.y;
      const dz = pB.z - pA.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if (dist < 0.01) { spring.mesh.visible = false; continue; }
      spring.mesh.visible = true;

      _mid.set((pA.x+pB.x)*0.5, (pA.y+pB.y)*0.5, (pA.z+pB.z)*0.5);
      spring.mesh.position.copy(_mid);

      _dir.set(dx/dist, dy/dist, dz/dist);
      _quat.setFromUnitVectors(_up, _dir);
      spring.mesh.quaternion.copy(_quat);

      spring.mesh.scale.set(1, dist, 1);  // cylinder height = actual distance
    }

    const n = this.masses.length;
    return new THREE.Vector3(cx/n, cy/n, cz/n);
  }

  // Convenience: visuals only — used during constructor switch (no physics step needed)
  update(sinusCounter) {
    return this.updateVisuals();
  }

  getBodies()  { return this.masses.map(m => m.body); }
  getMeshes()  { return this.masses.map(m => m.mesh); }
}
