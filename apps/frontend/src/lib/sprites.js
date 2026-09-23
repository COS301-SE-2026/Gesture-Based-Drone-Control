//sprites for nightwatch game

import sofa from "../assets/games/nightwatch/sofa.png"
import coffeeTable from "../assets/games/nightwatch/coffee_table.png"
import bed from "../assets/games/nightwatch/bed.png"
import nightstand from "../assets/games/nightwatch/nightstand.png"
import sink from "../assets/games/nightwatch/sink.png"
import counter from "../assets/games/nightwatch/counter.png"
import consoleTable from "../assets/games/nightwatch/console_table.png"
import crateStack from "../assets/games/nightwatch/crate_stack.png"
import shelf from "../assets/games/nightwatch/shelf.png"
import rug from "../assets/games/nightwatch/rug.png"
import mainFloor from "../assets/games/nightwatch/main_floor.png"
import kitchenFloor from "../assets/games/nightwatch/kitchen_floor.png"
import bedroomFloor from "../assets/games/nightwatch/bedroom_floor.png"
import garageFloor from "../assets/games/nightwatch/garage_floor.png"
import horizontalWall from "../assets/games/nightwatch/wall_horizontal.png"
import verticalWall from "../assets/games/nightwatch/wall_vertical.png"
import doorframe from "../assets/games/nightwatch/door_frame.png"

const SPRITE_SOURCES = {
  sofa,
  coffeeTable,
  bed,
  nightstand,
  sink,
  counter,
  consoleTable,
  crateStack,
  shelf,
  rug,
  mainFloor,
  kitchenFloor,
  bedroomFloor,
  garageFloor,
  horizontalWall,
  verticalWall,
  doorframe,
}

export function loadNightWatchSprites(k) {
  Object.entries(SPRITE_SOURCES).forEach(([key, src]) => {
    k.loadSprite(key, src)
  })
}

//FURNITURE[i].kind
export const FURNITURE_SPRITES = {
  sofa: "sofa",
  coffeeTable: "coffeeTable",
  bed: "bed",
  nightstand: "nightstand",
  sink: "sink",
  counter: "counter",
  consoleTable: "consoleTable",
  crateStack: "crateStack",
  shelf: "shelf",
  rug: "rug",
}

//FLOOR_ZONES[i].floor
export const FLOOR_SPRITES = {
  main: "mainFloor",
  kitchen: "kitchenFloor",
  bedroom: "bedroomFloor",
  garage: "garageFloor",
}

//WALLS
export const WALL_SPRITES = {
  horizontal: "horizontalWall",
  vertical: "verticalWall",
}

export const DOOR_SPRITE = "doorFrame"
