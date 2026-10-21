import { Array, Match as M } from "effect"
import { Command } from "foldkit"
import { evo } from "foldkit/struct"

import { generateApplePosition } from "./command.ts"
import { CONTROLS, GAME } from "./constants.ts"
import * as Direction from "./domain/direction.ts"
import * as Position from "./domain/position.ts"
import * as Snake from "./domain/snake.ts"
import { type Message } from "./message.ts"
import { type GameState, type Model } from "./model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const withUpdateReturn = M.withReturnType<UpdateReturn>()

const nextGameState = (gameState: GameState): GameState =>
    M.value(gameState).pipe(
        M.withReturnType<GameState>(),
        M.when("NotStarted", () => "Playing"),
        M.when("Playing", () => "Paused"),
        M.when("Paused", () => "Playing"),
        M.when("GameOver", () => "GameOver"),
        M.exhaustive
    )

export const init = (): UpdateReturn => {
    const snake = Snake.create(GAME.INITIAL_POSITION)

    return [
        {
            snake,
            apple: GAME.INITIAL_APPLE_POSITION,
            direction: GAME.INITIAL_DIRECTION,
            nextDirection: GAME.INITIAL_DIRECTION,
            gameState: "NotStarted",
            points: 0,
            highScore: 0,
        },
        [generateApplePosition(snake)],
    ]
}

const mapMovementKey = (key: string): Direction.Direction => {
    if (key === CONTROLS.ARROW_UP || key === CONTROLS.W) {
        return "Up"
    }

    if (key === CONTROLS.ARROW_DOWN || key === CONTROLS.S) {
        return "Down"
    }

    if (key === CONTROLS.ARROW_LEFT || key === CONTROLS.A) {
        return "Left"
    }

    return "Right"
}

const updateOnTick = (model: Model): UpdateReturn => {
    if (model.gameState !== "Playing") {
        return [model, []]
    }

    const currentDirection = Direction.isOpposite(
        model.direction,
        model.nextDirection
    )
        ? model.direction
        : model.nextDirection
    const headPosition = Array.headNonEmpty(model.snake)
    const nextHeadPosition = Position.move(headPosition, currentDirection)
    const willEatApple = Position.equivalence(nextHeadPosition, model.apple)
    const nextSnake = willEatApple
        ? Snake.grow(model.snake, currentDirection)
        : Snake.move(model.snake, currentDirection)

    if (Snake.hasCollision(nextSnake)) {
        return [
            evo(model, {
                gameState: () => "GameOver",
                highScore: (highScore) => Math.max(model.points, highScore),
            }),
            [],
        ]
    }

    const commands = willEatApple ? [generateApplePosition(nextSnake)] : []

    return [
        evo(model, {
            snake: () => nextSnake,
            direction: () => currentDirection,
            points: (points) =>
                willEatApple ? points + GAME.POINTS_PER_APPLE : points,
        }),
        commands,
    ]
}

const updateOnPressedKey = (model: Model, key: string): UpdateReturn =>
    M.value(key).pipe(
        withUpdateReturn,
        M.whenOr(
            CONTROLS.ARROW_UP,
            CONTROLS.ARROW_DOWN,
            CONTROLS.ARROW_LEFT,
            CONTROLS.ARROW_RIGHT,
            CONTROLS.W,
            CONTROLS.A,
            CONTROLS.S,
            CONTROLS.D,
            (movementKey) => {
                if (model.gameState !== "Playing") {
                    return [model, []]
                }

                return [
                    evo(model, {
                        nextDirection: () => mapMovementKey(movementKey),
                    }),
                    [],
                ]
            }
        ),
        M.when(CONTROLS.SPACE, () => [
            evo(model, { gameState: () => nextGameState(model.gameState) }),
            [],
        ]),
        M.when(CONTROLS.RESTART, () => {
            const snake = Snake.create(GAME.INITIAL_POSITION)

            return [
                evo(model, {
                    snake: () => snake,
                    apple: () => GAME.INITIAL_APPLE_POSITION,
                    direction: () => GAME.INITIAL_DIRECTION,
                    nextDirection: () => GAME.INITIAL_DIRECTION,
                    gameState: () => "NotStarted",
                    points: () => 0,
                }),
                [generateApplePosition(snake)],
            ]
        }),
        M.orElse(() => [model, []])
    )

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
            TickedClock: () => updateOnTick(model),
            PressedKey: ({ key }) => updateOnPressedKey(model, key),
            GeneratedApplePosition: ({ position }) => [
                evo(model, {
                    apple: () => position,
                }),
                [],
            ],
        })
    )
