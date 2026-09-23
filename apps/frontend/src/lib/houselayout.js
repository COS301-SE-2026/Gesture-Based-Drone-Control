//trying some bs house

const WALL_THICK = 12

//remeber xywh is a rectangle
function vSeg(x, y0, y1) {
  return { x: x - WALL_THICK / 2, y: y0, w: WALL_THICK, h: y1 - y0 }
}

function hSeg(x0, x1, y) {
  return { x: x0, y: y - WALL_THICK / 2, w: x1 - x0, h: WALL_THICK }
}

export const HOUSE = { x: 20, y: 50, w: 1024, h: 500 }

export const WALLS = [
  //exterior
  hSeg(HOUSE.x, HOUSE.x + HOUSE.w, HOUSE.y + WALL_THICK / 2),
  hSeg(HOUSE.x, HOUSE.x + HOUSE.w, HOUSE.y + HOUSE.h - WALL_THICK / 2),
  vSeg(HOUSE.x + WALL_THICK / 2, HOUSE.y, HOUSE.y + HOUSE.h),
  vSeg(HOUSE.x + HOUSE.w - WALL_THICK / 2, HOUSE.y, HOUSE.y + HOUSE.h),

  //vert divider at x = 340 (door gap will be y:260-340)
  vSeg(340, HOUSE.y, 260),
  vSeg(340, 340, 550),
  //vert divider at x = 720 (door gap will be y:260-340)
  vSeg(720, HOUSE.y, 260),
  vSeg(720, 340, 550),

  //horizontal divider at y=300
  hSeg(HOUSE.x, 120, 300), //left of kitchen door
  hSeg(220, 340, 300), //right of kitchen door
  hSeg(340, 480, 300), //left of hallway door
  hSeg(600, 720, 300), //right of kitchen door
  hSeg(720, HOUSE.x + HOUSE.w, 300), //solid bedroom | garage
]

//doorway markers for doorframe sprite => gaps let things pass through
export const DOORS = [
  { x: 120, y: 255, w: 100, h: 90 }, //kitchen to livingroom
  { x: 480, y: 255, w: 120, h: 90 }, //hallway opening
  { x: 295, y: 260, w: 90, h: 80 }, //livingroom to bedroom
  { x: 675, y: 260, w: 90, h: 80 }, //hallway to garage
]

//furniture w "kind" mappings are in sprites.js
//if collide: false then purely decorative
export const FURNITURE = [
  //livingroom
  { x: 80, y: 100, w: 200, h: 55, kind: "sofa" },
  { x: 440, y: 140, w: 100, h: 50, kind: "coffeeTable" },
  { x: 400, y: 175, w: 140, h: 70, kind: "rug", collide: false },
  //bedroom
  { x: 830, y: 90, w: 160, h: 110, kind: "bed" },
  { x: 780, y: 90, w: 35, h: 35, kind: "nightstand" },
  //kitchen
  { x: 50, y: 340, w: 30, h: 140, kind: "sink" },
  { x: 110, y: 90, w: 35, h: 40, kind: "sink" },
  //hallway
  { x: 500, y: 420, w: 90, h: 70, kind: "consoleTable" },
  //garage
  { x: 800, y: 380, w: 80, h: 80, kind: "crateStack" },
  { x: 940, y: 380, w: 40, h: 140, kind: "shelf" },
]

//visual zones for each room
//gameplay doesnt look at this is just background stuff
export const FLOOR_ZONES = [
  { x: HOUSE.x, y: HOUSE.y, w: 700, h: 250, floor: "main" }, //living room
  { x: 720, y: HOUSE.y, w: HOUSE.x + HOUSE.w - 720, h: 250, kind: "bedroom" }, //bedroom
  { x: 340, y: 300, w: 380, h: HOUSE.y + HOUSE.h - 300, kind: "kitchen" }, //kitchen
  { x: 340, y: 300, w: 380, h: HOUSE.y + HOUSE.H - 300, kind: "main" }, //hallway
  {
    x: 720,
    y: 300,
    w: HOUSE.x + HOUSE.w - 720,
    h: HOUSE.y + HOUSE.h - 300,
    kind: "garage",
  },
]

export function getObstacles() {
  const furnitureRects = FURNITURE.filter((f) => f.collide !== false).map(
    (f) => ({
      x: f.x,
      y: f.y,
      w: f.w,
      h: f.h,
    })
  )
  return [...WALLS, ...furnitureRects]
}

//drone and intruders wanter inside the padded rect
//per frame collision resolution keeps them out of walls/furniture
export const FLOOR = {
  x: HOUSE.x + 30,
  y: HOUSE.y + 30,
  w: HOUSE.w - 60,
  h: HOUSE.h - 60,
}
