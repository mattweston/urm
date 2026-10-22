import assert from "node:assert/strict"
import { Chunk, Effect, Layer, Stream } from "effect"
import {
  Marko,
  TemplateLoadError,
  TemplateLoader,
  buildAll,
  buildDepMap,
  handle,
  inMemoryStore,
  makeMarkoLayer,
  memoryOutput,
  planPublish,
  publish,
  routeToFile,
  PATCH_MIME,
  type MarkoConfig,
  type PageBase,
  type TemplateModule,
} from "../src/index.js"

type TestBlock =
  | { readonly type: "hero"; readonly id: string; readonly props: { readonly heading: string } }
  | { readonly type: "text"; readonly id: string; readonly props: { readonly body: string } }

// Stub templates: real Marko is not involved in this smoke test.
const modules: Record<string, TemplateModule> = {
  page: {
    renderToString: async (input) => {
      const i = input as { page: { title: string }; blocksHtml?: string[] }
      return `<html><title>${i.page.title}</title>${(i.blocksHtml ?? []).join("")}</html>`
    },
    patch: async function* (input, headers) {
      const i = input as { blocks: unknown[] }
      yield `flush:blocks=${i.blocks.length}`
      yield `flush:token=${headers.get("x-marko-patch") ?? "none"}`
    },
  },
  hero: { renderToString: async (p) => `<h1>${(p as { heading: string }).heading}</h1>` },
  text: { renderToString: async (p) => `<p>${(p as { body: string }).body}</p>` },
}

const stubLoader = Layer.succeed(TemplateLoader, {
  load: (ref) => {
    const m = modules[ref.id]
    return m ? Effect.succeed(m) : Effect.fail(new TemplateLoadError({ template: ref.id, cause: "missing" }))
  },
})

const pages: PageBase<TestBlock>[] = [
  { route: "/", title: "Home", blocks: [{ type: "hero", id: "b1", props: { heading: "Home" } }] },
  {
    route: "/about",
    title: "About",
    blocks: [
      { type: "text", id: "b2", props: { body: "About us" } },
      { type: "hero", id: "b3", props: { heading: "About" } },
    ],
  },
  { route: "/live", title: "Live", mode: "ssr", blocks: [{ type: "text", id: "b2", props: { body: "About us" } }, { type: "text", id: "b9", props: { body: "Only live" } }] },
  // A block type missing from the registry: must fail this page only.
  { route: "/broken", title: "Broken", blocks: [{ type: "nope", id: "bx", props: {} } as unknown as TestBlock] },
]

const config = (pageStrategy: "dynamic-tags" | "prerendered-html"): MarkoConfig<TestBlock> => ({
  registry: { hero: { id: "hero" }, text: { id: "text" } },
  pageTemplate: { id: "page" },
  pageStrategy,
})

const makeEnv = (strategy: "dynamic-tags" | "prerendered-html") => {
  const files = new Map<string, string>()
  const purged: string[] = []
  const env = Layer.mergeAll(
    makeMarkoLayer(config(strategy)).pipe(Layer.provide(stubLoader)),
    inMemoryStore(pages),
    memoryOutput(files, purged),
  )
  return { env, files, purged }
}

const main = async () => {
  // 1. Full SSG: ssr page skipped, broken page isolated.
  {
    const { env, files } = makeEnv("prerendered-html")
    const report = await Effect.runPromise(buildAll.pipe(Effect.provide(env)))
    assert.deepEqual([...report.rendered].sort(), ["/", "/about"])
    assert.deepEqual(report.failed.map((f) => f.route), ["/broken"])
    assert.equal(report.failed[0]?.error._tag, "UnknownBlockType")
    assert.deepEqual([...files.keys()].sort(), ["/", "/about"])
    assert.ok(files.get("/")?.includes('<div data-block-id="b1" data-block-type="hero"><h1>Home</h1></div>'))
  }

  // 2. Publish planning (pure).
  {
    const dep = buildDepMap(pages)
    const none = { routes: [], templates: false }
    assert.deepEqual(planPublish({ ...none, blocks: ["b3"] }, pages, dep), { _tag: "Incremental", routes: ["/about"] })
    // b2 is on /about (ssg) and /live (ssr): only the ssg page is rendered.
    assert.deepEqual(planPublish({ ...none, blocks: ["b2"] }, pages, dep), { _tag: "Incremental", routes: ["/about"] })
    assert.deepEqual(planPublish({ ...none, blocks: ["b9"] }, pages, dep), { _tag: "StoreOnly" })
    assert.deepEqual(planPublish({ ...none, blocks: [], templates: true }, pages, dep), { _tag: "Full" })
  }

  // 3. Publish executes the plan.
  {
    const { env, files, purged } = makeEnv("prerendered-html")
    const incremental = await Effect.runPromise(
      publish({ blocks: ["b3"], routes: [], templates: false }).pipe(Effect.provide(env)),
    )
    assert.equal(incremental.plan._tag, "Incremental")
    assert.deepEqual([...files.keys()], ["/about"])
    assert.deepEqual(purged, ["/about"])

    files.clear()
    purged.length = 0
    const storeOnly = await Effect.runPromise(
      publish({ blocks: ["b9"], routes: [], templates: false }).pipe(Effect.provide(env)),
    )
    assert.equal(storeOnly.plan._tag, "StoreOnly")
    assert.equal(files.size, 0)
    assert.equal(purged.length, 0)

    const full = await Effect.runPromise(
      publish({ blocks: [], routes: [], templates: true }).pipe(Effect.provide(env)),
    )
    assert.equal(full.plan._tag, "Full")
    assert.deepEqual([...files.keys()].sort(), ["/", "/about"])
  }

  // 4. Request handling and patch negotiation.
  {
    const { env } = makeEnv("dynamic-tags")
    const run = (url: string, headers: Record<string, string> = {}) =>
      Effect.runPromise(handle({ url, headers: new Headers(headers) }).pipe(Effect.provide(env)))

    const doc = await run("/about")
    assert.equal(doc.status, 200)
    assert.equal(typeof doc.body, "string")
    assert.ok(String(doc.body).includes("<title>About</title>"))

    const patch = await run("/", { accept: PATCH_MIME, "x-marko-patch": "tok1" })
    assert.equal(patch.status, 200)
    assert.equal(patch.headers["content-type"], PATCH_MIME)
    assert.equal(typeof patch.body, "object")
    const lines = await Effect.runPromise(
      Stream.runCollect(patch.body as Stream.Stream<string, never>).pipe(Effect.map(Chunk.toReadonlyArray)),
    )
    assert.deepEqual(lines, ["flush:blocks=1", "flush:token=tok1"])

    assert.equal((await run("/nope")).status, 404)
    assert.equal((await run("/broken")).status, 500)
    assert.equal((await run("/about/")).status, 200) // trailing slash normalized
  }

  // 5. Output path safety.
  {
    assert.throws(() => routeToFile("dist", "/a/../../etc"))
    assert.throws(() => routeToFile("dist", "/a\\b"))
    assert.ok(routeToFile("dist", "/a/b").endsWith("/dist/a/b/index.html"))
    assert.ok(routeToFile("dist", "/").endsWith("/dist/index.html"))
  }

  // 6. Template load failures are not cached.
  {
    let attempts = 0
    const flaky = Layer.succeed(TemplateLoader, {
      load: (ref) =>
        ++attempts === 1
          ? Effect.fail(new TemplateLoadError({ template: ref.id, cause: "transient" }))
          : Effect.succeed(modules[ref.id]!),
    })
    const layer = makeMarkoLayer(config("prerendered-html")).pipe(Layer.provide(flaky))
    const program = Effect.gen(function* () {
      const marko = yield* Marko
      const first = yield* Effect.either(marko.renderPage(pages[0]!))
      const second = yield* Effect.either(marko.renderPage(pages[0]!))
      return { first, second }
    })
    const { first, second } = await Effect.runPromise(program.pipe(Effect.provide(layer)))
    assert.equal(first._tag, "Left")
    assert.equal(second._tag, "Right")
  }

  console.log("smoke ok")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
