import { Array, Schema as S } from "effect"

import type { Direction } from "./direction.ts"
import * as Position from "./position.ts"

export const INITIAL_LENGTH = 3

export const Snake = S.NonEmptyArray(Position.Position)

export type Snake = typeof Snake.Type

export const create = (startPosition: Position.Position): Snake =>
    Array.makeBy(INITIAL_LENGTH, (index) => ({
        x: startPosition.x - index,
        y: startPosition.y,
    }))

export const move = (snake: Snake, direction: Direction): Snake =>
    Array.matchLeft(snake, {
        onEmpty: () => snake,
        onNonEmpty: (head, tail) => {
            const nextHead = Position.move(head, direction)

            return [nextHead, head, ...Array.dropRight(tail, 1)]
        },
    })

export const grow = (snake: Snake, direction: Direction): Snake =>
    Array.matchLeft(snake, {
        onEmpty: () => snake,
        onNonEmpty: (head, tail) => {
            const nextHead = Position.move(head, direction)

            return [nextHead, head, ...tail]
        },
    })

export const hasCollision = (snake: Snake): boolean =>
    Array.matchLeft(snake, {
        onEmpty: () => false,
        onNonEmpty: (head, tail) =>
            Array.some(tail, (segment) => Position.equivalence(head, segment)),
    })

export const contains = (snake: Snake, position: Position.Position): boolean =>
    Array.some(snake, (segment) => Position.equivalence(segment, position))
