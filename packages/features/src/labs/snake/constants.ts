import * as Direction from "./domain/direction.ts"

export const GAME: Readonly<{
    GRID_SIZE: number
    INITIAL_POSITION: Readonly<{ x: number; y: number }>
    INITIAL_APPLE_POSITION: Readonly<{ x: number; y: number }>
    INITIAL_DIRECTION: Direction.Direction
    POINTS_PER_APPLE: number
}> = {
    GRID_SIZE: 20,
    INITIAL_POSITION: {
        x: 10,
        y: 10,
    },
    INITIAL_APPLE_POSITION: {
        x: 15,
        y: 15,
    },
    INITIAL_DIRECTION: "Right",
    POINTS_PER_APPLE: 10,
}

export const GAME_SPEED: Readonly<{
    MIN_INTERVAL: number
    BASE_INTERVAL: number
}> = {
    MIN_INTERVAL: 80,
    BASE_INTERVAL: 150,
}

export const CONTROLS: Readonly<{
    SPACE: " "
    RESTART: "r"
    ARROW_UP: "ArrowUp"
    ARROW_DOWN: "ArrowDown"
    ARROW_LEFT: "ArrowLeft"
    ARROW_RIGHT: "ArrowRight"
    W: "w"
    A: "a"
    S: "s"
    D: "d"
}> = {
    SPACE: " ",
    RESTART: "r",
    ARROW_UP: "ArrowUp",
    ARROW_DOWN: "ArrowDown",
    ARROW_LEFT: "ArrowLeft",
    ARROW_RIGHT: "ArrowRight",
    W: "w",
    A: "a",
    S: "s",
    D: "d",
}
