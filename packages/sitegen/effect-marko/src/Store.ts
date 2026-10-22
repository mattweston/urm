import { Context, Effect, Layer, Option } from "effect"
import type { StoreError } from "./errors.js"
import type { PageBase } from "./types.js"

/**
 * Where page and block data lives (the thing the Foldkit admin writes to).
 * Data coming out of a real store should be decoded with the shared Effect Schema
 * before it reaches this interface.
 */
export interface StoreService {
  readonly allPages: Effect.Effect<ReadonlyArray<PageBase>, StoreError>
  readonly page: (route: string) => Effect.Effect<Option.Option<PageBase>, StoreError>
}

export class Store extends Context.Tag("effect-marko/Store")<Store, StoreService>() {}

export const inMemoryStore = (pages: ReadonlyArray<PageBase>) =>
  Layer.succeed(Store, {
    allPages: Effect.succeed(pages),
    page: (route) => Effect.succeed(Option.fromNullable(pages.find((p) => p.route === route))),
  })
