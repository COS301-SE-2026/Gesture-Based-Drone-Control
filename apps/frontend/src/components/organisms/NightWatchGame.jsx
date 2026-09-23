import { useRef } from "react"
import { useGameCommands } from "@/hooks/useGameCommands"
import { useKaplayCanvas } from "@/hooks/useKaplayCanvas"
import { GAME_CANVAS, GAME_COLORS } from "@/lib/gameTheme"
import {
    HOUSE,
    WALLS,
    DOORS,
    FURNITURE,
    FLOOR_ZONES,
    FLOOR,
    getObstacles
} from "../../lib/houselayout"
import {
    loadNightWatchSprites,
    FURNITURE_SPRITES,
    FLOOR_SPRITES,
    WALL_SPRITES,
    DOOR_SPRITE
} from "../../lib/sprites"
import {
    clamp,
    angleDiff,
    dist,
    resolveCollisions,
    randRange,
    hasLineOfSight
} from "../../constants/DroneSearchgameUtils"
