//shred kaplay friendly theme tokens from our existing index.css
//kaplay wants plain 0-255 rgb tuples not css so this and the hook
//need to be kep in sync manually for theme changes

export const GAME_COLORS = {
    bg: [11, 9, 10], //-bg
    surface: [22, 26, 29], //-surface
    ink: [245, 243, 244], //-ink
    dim: [177, 167, 166], //-dim
    red: [229, 56, 59], //-red
    redDeep: [186, 24, 27], //-red-deep
    redShadow: [102, 7, 8], //-red-shadow
    success: [27, 127, 58], //-success green
    warning: [199, 119, 0] //-warning-yellow
}

export const GAME_CANVAS = {
    width: 1064,
    height: 600
}