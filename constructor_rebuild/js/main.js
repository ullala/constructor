// main.js - Entry point and main loop
import * as THREE from 'three';
import { PhysicsWorld }     from './physics.js';
import { World3D }          from './world.js';
import { Constructor }      from './constructor.js';
import { Interaction }      from './interaction.js';
import { CameraController } from './camera.js';
import { WORLD }            from './config.js';

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------
let physicsWorld  = null;
let world3D       = null;
let currentCon    = null;
let interaction   = null;
let camCtrl       = null;

let sinusCounter  = 0;
let currentConfigIndex = 0;
let wallsEnabled  = false;
let wallBodies    = [];

let lastTime      = 0;
let accumulator   = 0;

// Director used pTimeStep=0.05, pSubSteps=5 (frame export).
// Shockwave 3D + Havok ran at ~10 fps on typical hardware of that era.
// That means:  10 ticks/s × 0.05 s = 0.5 s of physics per real second (half real-time).
// sinusCounter: 10 × 5 = 50/s → period = 200/50 = 4 s.
//
// Key insight: TICK_INTERVAL (how often a tick fires in wall-clock time) and
// PHYS_DT (how much physics time each tick advances) are independent.
// Using TICK_INTERVAL = 0.10 s → 10 ticks/s at any render frame rate.
const TICK_INTERVAL = 0.05;        // real-world gap between Director "frames"  (≈20 fps → real-time physics)
const PHYS_DT       = 0.05;        // physics advance per tick  (original pTimeStep)
const SUBSTEPS      = 5;
const SUB_DT        = PHYS_DT / SUBSTEPS;   // 0.01 s  (original sub-step size)
const MAX_STEPS     = 3;           // safety cap

// -------------------------------------------------------------------------
// Boot
// -------------------------------------------------------------------------
async function boot() {
  const canvas = document.getElementById('main-canvas');

  // Systems
  physicsWorld = new PhysicsWorld();
  physicsWorld.init();

  world3D = new World3D();
  world3D.init(canvas);

  camCtrl = new CameraController();
  camCtrl.init(world3D.camera, world3D.renderer);

  interaction = new Interaction();

  // Load first constructor
  await switchConstructor(0);

  // Event listeners
  canvas.addEventListener('mousedown',  e => interaction.onMouseDown(e));
  canvas.addEventListener('mousemove',  e => interaction.onMouseMove(e));
  canvas.addEventListener('mouseup',    e => interaction.onMouseUp(e));
  canvas.addEventListener('mouseleave', e => interaction.onMouseUp(e));

  canvas.addEventListener('touchstart', e => { e.preventDefault(); interaction.onTouchStart(e); }, { passive: false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); interaction.onTouchMove(e);  }, { passive: false });
  canvas.addEventListener('touchend',   e => { e.preventDefault(); interaction.onTouchEnd(e);   }, { passive: false });

  window.addEventListener('keydown', e => {
    camCtrl.onKeyDown(e.key);
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','W','s','S'].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', e => camCtrl.onKeyUp(e.key));

  window.addEventListener('resize', onResize);
  onResize();

  // UI buttons
  document.getElementById('btn-con1').addEventListener('click', () => switchConstructor(0));
  document.getElementById('btn-con2').addEventListener('click', () => switchConstructor(1));
  document.getElementById('btn-con3').addEventListener('click', () => switchConstructor(2));

  const wallCheckbox = document.getElementById('wall-toggle');
  wallCheckbox.addEventListener('change', () => toggleWalls(wallCheckbox.checked));

  // Hide loading
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';

  // Start loop
  requestAnimationFrame(loop);
}

// -------------------------------------------------------------------------
// Constructor switching
// -------------------------------------------------------------------------
async function switchConstructor(index) {
  if (currentCon) {
    currentCon.destroy();
    currentCon = null;
  }

  currentConfigIndex = index;
  currentCon = new Constructor();
  currentCon.init(physicsWorld, world3D, index);

  // Update interaction with new masses
  interaction.setMasses(currentCon.masses);
  interaction.init(world3D.camera, world3D.renderer, currentCon.masses, physicsWorld);

  // Snap camera center to new constructor COM (avoid big swoop)
  const com = currentCon.update(sinusCounter, false);
  camCtrl.resetCenter(com);

  // Highlight active button
  ['btn-con1','btn-con2','btn-con3'].forEach((id, i) => {
    const btn = document.getElementById(id);
    btn.classList.toggle('active', i === index);
  });
}

// -------------------------------------------------------------------------
// Walls
// -------------------------------------------------------------------------
function toggleWalls(enabled) {
  wallsEnabled = enabled;

  // Remove existing walls
  for (const b of wallBodies) {
    physicsWorld.removeBody(b);
  }
  wallBodies = [];

  if (!enabled) return;

  // 4 walls at x=±1000, z=±1000 (Three.js coords)
  // Wall half-extents: thick in one axis, tall, wide
  const wallHeight  = 750;
  const wallThick   = 25;
  const wallWidth   = 1000;
  const wallYCenter = wallHeight / 2 - 250; // center so bottom touches floor at y=-250

  // +X wall
  wallBodies.push(physicsWorld.addStaticBox(
    { x: 1000, y: wallYCenter, z: 0 },
    { x: wallThick, y: wallHeight, z: wallWidth }
  ));
  // -X wall
  wallBodies.push(physicsWorld.addStaticBox(
    { x: -1000, y: wallYCenter, z: 0 },
    { x: wallThick, y: wallHeight, z: wallWidth }
  ));
  // +Z wall
  wallBodies.push(physicsWorld.addStaticBox(
    { x: 0, y: wallYCenter, z: 1000 },
    { x: wallWidth, y: wallHeight, z: wallThick }
  ));
  // -Z wall
  wallBodies.push(physicsWorld.addStaticBox(
    { x: 0, y: wallYCenter, z: -1000 },
    { x: wallWidth, y: wallHeight, z: wallThick }
  ));
}

// -------------------------------------------------------------------------
// Resize
// -------------------------------------------------------------------------
function onResize() {
  const canvas = document.getElementById('main-canvas');
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  world3D.onResize(w, h);
}

// -------------------------------------------------------------------------
// Main loop
// -------------------------------------------------------------------------
function loop(timestamp) {
  requestAnimationFrame(loop);

  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  if (dt <= 0) return;

  // Fixed-rate physics accumulator.
  // Matches original Director behaviour: one 0.025 s physics step per 40fps frame.
  // At 60fps we get ~1.5 render frames per physics step — physics runs at real speed.
  accumulator += dt;
  let steps = 0;

  // Fire one Director "frame" of physics every TICK_INTERVAL real seconds.
  // Each tick advances PHYS_DT seconds via SUBSTEPS sub-steps.
  // Total physics per real second = PHYS_DT / TICK_INTERVAL = 0.05/0.10 = 0.5×
  // — matches original ~10 fps Director running at half real-time speed.
  while (accumulator >= TICK_INTERVAL && steps < MAX_STEPS) {
    sinusCounter = (sinusCounter + 5) % 200;

    for (let i = 0; i < SUBSTEPS; i++) {
      if (currentCon) currentCon.applySpringForces(sinusCounter);
      interaction.update();
      physicsWorld.step(SUB_DT);
    }

    accumulator -= TICK_INTERVAL;
    steps++;
  }

  // Sync visuals and camera every render frame (decoupled from physics rate)
  let com = new THREE.Vector3(0, 0, 0);
  if (currentCon) com = currentCon.updateVisuals();

  camCtrl.update(com, interaction.isDragging, dt);
  world3D.render();

  const info = document.getElementById('info-text');
  if (info && currentCon) {
    info.textContent = `COM: (${com.x.toFixed(0)}, ${com.y.toFixed(0)}, ${com.z.toFixed(0)})`;
  }
}

// -------------------------------------------------------------------------
// Start
// -------------------------------------------------------------------------
boot().catch(err => {
  console.error('Boot error:', err);
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = 'Error: ' + err.message;
});
