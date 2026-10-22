import { Cache, Context, Duration, Effect, Exit, Layer, Stream } from "effect"
import { RenderError, TemplateLoadError, UnknownBlockType } from "./errors.js"
import { TemplateLoader, type TemplateModule } from "./TemplateLoader.js"
import type { BlockBase, PageBase, Registry, TemplateRef } from "./types.js"

export type MarkoError = TemplateLoadError | RenderError | UnknownBlockType

export interface MarkoService {
  /** Render one block to an HTML fragment wrapped in a marker element (for fragment endpoints). */
  readonly renderBlock: (block: BlockBase) => Effect.Effect<string, MarkoError>
  /** Render a whole page to an HTML document string. */
  readonly renderPage: (page: PageBase) => Effect.Effect<string, MarkoError>
  /**
   * Patch render of a page. One emitted chunk = one flush line.
   * `headers` must be the request headers (the held-shell token travels in `x-marko-patch`).
   */
  readonly patchPage: (page: PageBase, headers: Headers) => Stream.Stream<string, MarkoError>
  /** Drop cached templates (call after a template or layout change). */
  readonly invalidateTemplates: Effect.Effect<void>
}

export class Marko extends Context.Tag("effect-marko/Marko")<Marko, MarkoService>() {}

export interface MarkoConfig<B extends BlockBase> {
  readonly registry: Registry<B>
  /** The page/layout template. */
  readonly pageTemplate: TemplateRef
  /**
   * How the page template receives its blocks:
   *  - "dynamic-tags": input `{ page, blocks: [{ id, type, props, template }] }`; the page template
   *    renders each block through the loaded template module. Needed for patch renders, because
   *    the template (not the wrapper) must own the block structure. Assumes a loaded module can be
   *    used as a dynamic tag: UNVERIFIED. The template must emit the data-block-id marker itself.
   *  - "prerendered-html": input `{ page, blocksHtml: string[] }`; blocks are rendered first by the
   *    wrapper. Simplest and robust for plain SSG, but not usable for patch renders.
   */
  readonly pageStrategy?: "dynamic-tags" | "prerendered-html"
}

const escapeAttr = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")

export const makeMarkoLayer = <B extends BlockBase>(config: MarkoConfig<B>) =>
  Layer.effect(
    Marko,
    Effect.gen(function* () {
      const loader = yield* TemplateLoader
      const strategy = config.pageStrategy ?? "dynamic-tags"
      const registry: Readonly<Record<string, TemplateRef | undefined>> = config.registry

      // Failures are not cached: a template that failed to load can be retried.
      const cache = yield* Cache.makeWith({
        capacity: 1024,
        lookup: (id: string) => loader.load({ id }),
        timeToLive: (exit) => (Exit.isFailure(exit) ? Duration.zero : Duration.infinity),
      })

      const refFor = (block: BlockBase): Effect.Effect<TemplateRef, UnknownBlockType> => {
        const ref = registry[block.type]
        return ref
          ? Effect.succeed(ref)
          : Effect.fail(new UnknownBlockType({ blockType: block.type, blockId: block.id }))
      }

      const renderWith = (tpl: TemplateModule, ref: TemplateRef, input: unknown) =>
        Effect.tryPromise({
          try: () => tpl.renderToString(input),
          catch: (cause) => new RenderError({ template: ref.id, cause }),
        })

      const renderBlock = (block: BlockBase): Effect.Effect<string, MarkoError> =>
        Effect.gen(function* () {
          const ref = yield* refFor(block)
          const tpl = yield* cache.get(ref.id)
          const html = yield* renderWith(tpl, ref, block.props)
          return `<div data-block-id="${escapeAttr(block.id)}" data-block-type="${escapeAttr(block.type)}">${html}</div>`
        })

      const loadBlock = (block: BlockBase) =>
        Effect.gen(function* () {
          const ref = yield* refFor(block)
          const template = yield* cache.get(ref.id)
          return { id: block.id, type: block.type, props: block.props, template }
        })

      const pageInput = (page: PageBase): Effect.Effect<unknown, MarkoError> =>
        strategy === "prerendered-html"
          ? Effect.map(Effect.forEach(page.blocks, renderBlock), (blocksHtml) => ({ page, blocksHtml }))
          : Effect.map(Effect.forEach(page.blocks, loadBlock), (blocks) => ({ page, blocks }))

      const renderPage = (page: PageBase): Effect.Effect<string, MarkoError> =>
        Effect.gen(function* () {
          const tpl = yield* cache.get(config.pageTemplate.id)
          const input = yield* pageInput(page)
          return yield* renderWith(tpl, config.pageTemplate, input)
        })

      const patchPage = (page: PageBase, headers: Headers): Stream.Stream<string, MarkoError> =>
        Stream.unwrap(
          Effect.gen(function* () {
            const tpl = yield* cache.get(config.pageTemplate.id)
            const patch = tpl.patch
            if (!patch) {
              return yield* new RenderError({
                template: config.pageTemplate.id,
                cause: "template module has no patch(); was it compiled with the patches option?",
              })
            }
            const input = yield* pageInput(page)
            return Stream.fromAsyncIterable(
              patch(input, headers),
              (cause) => new RenderError({ template: config.pageTemplate.id, cause }),
            )
          }),
        )

      return {
        renderBlock,
        renderPage,
        patchPage,
        invalidateTemplates: cache.invalidateAll,
      }
    }),
  )
