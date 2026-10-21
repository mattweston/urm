import { Match, Schema } from "effect"

export const Direction = Schema.Literals(["Up", "Down", "Left", "Right"])

export type Direction = typeof Direction.Type

export const opposite = (direction: Direction): Direction =>
    Match.value(direction).pipe(
        Match.withReturnType<Direction>(),
        Match.when("Up", () => "Down"),
        Match.when("Down", () => "Up"),
        Match.when("Left", () => "Right"),
        Match.when("Right", () => "Left"),
        Match.exhaustive
    )

export const isOpposite = (left: Direction, right: Direction): boolean =>
    opposite(left) === right
