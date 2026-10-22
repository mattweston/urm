# 02. Blocks and the registry

Sketches, untested. Assumes Effect 3.x.

## Block schemas (shared)

```ts
// @site/blocks
import { Schema as S } from "effect"

export const Hero = S.Struct({
  type: S.Literal("hero"),
  id: S.String,
  props: S.Struct({ heading: S.String, image: S.String, cta: S.optional(S.String) }),
})

export const ProductGrid = S.Struct({
  type: S.Literal("product-grid"),
  id: S.String,
  props: S.Struct({ collection: S.String, columns: S.Number }),
})

export const Block = S.Union(Hero, ProductGrid)
export type Block = S.Schema.Type<typeof Block>

export const Page = S.Struct({
  route: S.String,
  title: S.String,
  blocks: S.Array(Block),
})
export type Page = S.Schema.Type<typeof Page>
```

The Foldkit admin uses these for its Model/validation. The generator decodes stored JSON with them before rendering, so bad data fails with a typed error instead of a broken page.

## Registry

Maps a block `type` to a Marko template. Keyed on `Block["type"]` so adding a schema without a template is a compile error.

```ts
// effect-marko
type Registry = { [T in Block["type"]]: TemplateRef }

const registry: Registry = {
  hero: ref("./templates/hero.marko"),
  "product-grid": ref("./templates/product-grid.marko"),
}
```

`TemplateRef` is whatever your loading strategy needs: a path to compile, or a module loaded from a built server bundle (see `04-client-side.md`).

## The `Marko` service

```ts
import { Context, Data, Effect, Layer } from "effect"

export class TemplateLoadError extends Data.TaggedError("TemplateLoadError")<{
  template: string; cause: unknown
}> {}
export class RenderError extends Data.TaggedError("RenderError")<{
  template: string; cause: unknown
}> {}

export class Marko extends Context.Tag("Marko")<Marko, {
  readonly renderBlock: (b: Block) => Effect.Effect<string, TemplateLoadError | RenderError>
  readonly renderPage: (p: Page) => Effect.Effect<string, TemplateLoadError | RenderError>
}>() {}
```

Rules:

- `renderPage` = layout template + `renderBlock` for each block, in order.
- Each block render is wrapped with a block id marker (`data-block-id`) so live patching can target it (see `05-live-patches.md`).
- Template loading is cached (`Effect.cached`, or an Effect `Cache`) so a 500-page build compiles each template once.
- Two live implementations are possible behind the same interface: `MarkoCompiler` (explicit compile, server-only HTML) and `MarkoVite` (built bundle, with client hydration). Tests use a stub layer.

## Output shape

`renderBlock` returns an HTML string. If you later want streaming, add `renderPageStream` returning an Effect `Stream` of chunks. Marko supports streaming, but I have not verified the exact API for the version you run.
