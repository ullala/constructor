// config.js - World constants and constructor configurations
// All coordinates are already in Three.js space: X=right, Y=up, Z=toward viewer
// Conversion from Director: Dir(x,y,z) -> Three(x, z, -y)

export const WORLD = {
  gravity: { x: 0, y: -327, z: 0 },  // Director original: -327 Dir-units/s² = -9.81 m/s² × (1/0.03)
  groundPosition: { x: 0, y: -250, z: 0 },
  groundSize: { x: 2000, y: 15, z: 2000 },
  groundTopY: -250,
  massRadius: 10,
  massMass: 10,
  springRadius: 1.5,
  springStiffness: 150,  // original value — works correctly when timing is right
  springDamping: 8,
  sinusStrength: 0.5,
};

export const CONSTRUCTORS = [
  {
    // Constructor 1 - 5 masses
    name: 'Constructor 1',
    positions: [
      [-70, 100,   0],  // Dir(-70,  0, 100)
      [-50,   0,  50],  // Dir(-50,-50,   0)
      [ 50,   0, -50],  // Dir( 50,-50,   0)
      [ 70, 100,   0],  // Dir( 70,  0, 100)
      [  0,   0, -50],  // Dir(  0, 50,   0)  -- was Dir(0,50,0) -> [0,0,-50]
    ],
    connections: [
      [0,1],[1,2],[2,3],[3,0],[0,2],[1,3],[0,4],[1,4],[2,4],[3,4]
    ],
    sinus: [2/3, 2/3, 4/3, 4/3, 0, 0, 1, 0, 1, 0],
  },
  {
    // Constructor 2 - 7 masses
    name: 'Constructor 2',
    positions: [
      [-30,   0,  75],  // Dir(-30,-75,  0)
      [ 30,   0,  75],  // Dir( 30,-75,  0)
      [ 50,   0,   0],  // Dir( 50,  0,  0)
      [ 30,   0, -75],  // Dir( 30, 75,  0)
      [-30,   0, -75],  // Dir(-30, 75,  0)
      [-50,   0,   0],  // Dir(-50,  0,  0)
      [  0, 100,  50],  // Dir(  0,-50,100)
    ],
    connections: [
      [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],
      [0,2],[0,3],[0,4],[1,3],[1,4],[1,5],[2,4],[2,5],[3,5],
      [0,6],[1,6],[2,6],[3,6],[4,6],[5,6]
    ],
    sinus: [0,1.5,2.5,0,2.5,1.5, 0,0,0,0,0,0,0,0,0, 1,1,2,0.5,0.5,2],
  },
  {
    // Constructor 3 - 8 masses
    name: 'Constructor 3',
    positions: [
      [ 50, 100,   0],  // Dir( 50,  0,100)
      [-50, 100, -30],  // Dir(-50, 30,100)
      [-50, 100,  30],  // Dir(-50,-30,100)
      [ 50,   0,  50],  // Dir( 50,-50,  0)
      [ 50,   0, -50],  // Dir( 50, 50,  0)
      [-50,   0, -50],  // Dir(-50, 50,  0)
      [-50,   0,  50],  // Dir(-50,-50,  0)
      [-70,   0,   0],  // Dir(-70,  0,  0)
    ],
    connections: [
      [0,1],[1,2],[2,0],
      [3,0],[3,1],[3,2],
      [4,0],[4,1],[4,2],
      [5,0],[5,1],[5,2],
      [6,0],[6,1],[6,2],
      [3,4],
      [7,0],[7,1],[7,2],[7,3],[7,4],
      [5,6]
    ],
    sinus: [0,0,0, 0,0,0, 0,0,0, 1,2.5,2.5, 1,2.5,2.5, 0, 0,0,1,1,1, 0],
  },
];
