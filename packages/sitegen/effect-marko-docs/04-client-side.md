# 04. Client-side code (carts etc.) and Marko Run

## Short answer

**Marko Run is not required.** Client-side Marko needs a bundler plugin, and `@marko/vite` is that plugin. Marko Run builds on Vite and adds file-based routing, layouts, middleware and deployment adapters on top. If your routes come from data (your block store) you may not want its file-based routing at all.

## Patch navigations and Marko Run

The one place Marko Run matters is the patch protocol. Per your notes, `@marko/run` negotiates `accept: text/marko-patch`, streams the response into `patch($global)`, and falls back to a full navigation on failure. Without it, the transport has to be built in the Effect server and the client. Client-owned state such as a cart is what the protocol is designed to keep across navigations. See `05-live-patches.md`.

## What `@marko/vite` gives you

- Compiles `.marko` for server and browser.
- **Linked mode** (default): while compiling the server it discovers entry `.marko` files and tells Vite which modules to load in the browser. Scripts and styles are injected into your `.marko` output automatically, so you do not write `.html` entry files.
- You use Vite's SSR API: `ssrLoadModule` in dev, the built `dist` server bundle in production.
- Options of interest: `linked`, `runtimeId` (isolated Marko runtimes on one page), `basePathVar` (asset base path at runtime), `babelConfig`.

## What this means for the wrapper

Two implementations of the `Marko` service, same interface:

| | `MarkoCompiler` | `MarkoVite` |
|---|---|---|
| Output | Server HTML only | HTML + hashed client assets |
| Client interactivity | None | Yes (hydration / resume) |
| Setup | `@marko/compiler` | `vite`, `@marko/vite` |
| Use for | Pure content blocks | Cart, filters, anything interactive |

Marko maintainers have said they recommend a bundler over the compiler require hook (`@marko/compiler/register`), because Marko is designed to load only the JS the client needs. So even for a mostly static site, prefer `MarkoVite` and let the "pure content" case just ship no client JS.

### Build step as an Effect

```ts
// sketch
const viteBuild = Effect.tryPromise({
  try: () => build({ plugins: [marko()], /* client + server builds */ }),
  catch: (cause) => new BuildError({ cause }),
})
// then: import the built server bundle, render pages with it
```

After the build, rendering through the built bundle should inline the Vite asset tags into the HTML. **To verify:** the exact output layout and how to produce both client and server builds in one run. The `@marko/vite` Express SSR example is the reference to follow.

## Shopping cart design

- **Cart UI** is a Marko component inside a block (`cart-button`, `cart-drawer`, `add-to-cart`). It is the only code that needs client JS.
- **Cart state** lives client-side (memory + `localStorage`) and syncs to the server for logged-in users.
- **Server API** is an Effect HTTP API: `GET/POST /api/cart`, `POST /api/checkout`. Share request/response Schemas with the client.
- **Checkout page** is SSR (per-user, never cached).
- **Static pages** carry the "add to cart" button in HTML; hydration makes it live. Prices and stock shown in static HTML can be stale, so re-check on add.

Keep interactive blocks small so only they pay for client JS (this is the point of partial hydration / islands-style loading).

## Foldkit on the public site?

Not needed. Foldkit is a full SPA runtime built on Effect, and `Runtime.embed` can mount a Foldkit widget inside another app. That would work for something like a live preview or an admin-only inline editor, but using it for the public cart would give you two UI runtimes on one page. Default to Marko components for public interactivity.

## Marko version note

You reported runtime-tags 6.4.4 and compiler 5.42.11, so this is Marko 6: compiler output is streaming HTML with resume state, or fine-grained DOM code. Marko 5 notes (class API, hydration state read from `window.$components`) do not apply. Component syntax in your templates should follow the Marko 6 tags API; I have not written any in these notes.
