// physics.js - Cannon-es physics world wrapper
import * as CANNON from '../lib/cannon-es.js';

export class PhysicsWorld {
  constructor() {
    this.world = null;
    this.groundBody = null;
    this.defaultMaterial = null;
  }

  init() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -327, 0);  // original Director value (-9.81 m/s² / 0.03 scale)

    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.allowSleep = false;

    this.defaultMaterial = new CANNON.Material('default');
    const contactMat = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      { friction: 0.5, restitution: 0.1 }
    );
    this.world.addContactMaterial(contactMat);
    this.world.defaultContactMaterial = contactMat;

    // Ground: static box, top surface at y = -250
    const groundShape = new CANNON.Box(new CANNON.Vec3(1000, 7.5, 1000));
    this.groundBody = new CANNON.Body({ mass: 0, material: this.defaultMaterial });
    this.groundBody.addShape(groundShape);
    this.groundBody.position.set(0, -257.5, 0);
    this.world.addBody(this.groundBody);
  }

  addSphere(pos, radius, mass) {
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass,
      material: this.defaultMaterial,
      linearDamping: 0.05,
      angularDamping: 0.99,
    });
    body.addShape(shape);
    body.position.set(pos.x, pos.y, pos.z);
    this.world.addBody(body);
    return body;
  }

  addStaticBox(pos, halfExtents) {
    const shape = new CANNON.Box(new CANNON.Vec3(halfExtents.x, halfExtents.y, halfExtents.z));
    const body = new CANNON.Body({ mass: 0, material: this.defaultMaterial });
    body.addShape(shape);
    body.position.set(pos.x, pos.y, pos.z);
    this.world.addBody(body);
    return body;
  }

  removeBody(body) {
    if (body && this.world) this.world.removeBody(body);
  }

  step(dt) {
    this.world.step(dt);
  }

  // Mouse-spring force for interactive dragging (kept separate from structure constraints)
  applyForce(body, fx, fy, fz) {
    body.applyForce(new CANNON.Vec3(fx, fy, fz));
  }
}
