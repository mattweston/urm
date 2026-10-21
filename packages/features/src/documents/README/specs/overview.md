# Foldkit Static Publication Overview

Status: concise architecture overview

## Pipeline

### 1. Create an immutable snapshot

```text
CMS content
    -> SiteReleaseSnapshot
```

The snapshot contains the exact public pages, theme, media, routes, component
configuration, and template version being published. It contains no editor
state, private content, or credentials.

### 2. Render with the Foldkit server API

```text
SiteReleaseSnapshot + Foldkit template
    -> non-routing build application
    -> Server.renderToString({ isHydratable: false })
```

Foldkit resolves `init`, runs the pure public view once, and returns HTML. The
static option emits no application stamp, build ID, serialized Flags, key
marker, or view-identity marker. No Foldkit client application is delivered to
visitors.

### 3. Generate the planned routes

```text
route planner selects each published page
    -> pass the page as build-time Flags
    -> Foldkit renders the public page on the server
    -> injectIntoTemplate creates the complete document
```

Each route becomes a real document:

```text
dist/index.html
dist/about/index.html
dist/products/index.html
```

### 4. Finalize the static build

```text
server-rendered HTML
    -> assemble metadata and structured data
    -> inject declared JavaScript behaviors
    -> generate images, sitemap, redirects, and 404
    -> validate HTML, links, scripts, and assets
    -> write BuildManifest
```

A static page contains noEffect, router, or client application. An
enhanced page contains only the JavaScript required by its declared behaviors.

### 5. Deploy with Alchemy

```text
final dist/
    -> Alchemy Cloudflare.Website.StaticSite
    -> Cloudflare static assets
```

Sites requiring forms, carts, chat, Stripe, or uploads can route `/api/*`
through a small Worker:

```text
/api/*
    -> Cloudflare Worker
    -> URM runtime API

all other requests
    -> Cloudflare static assets
```

The complete pipeline is:

```text
snapshot
    -> Foldkit server render
    -> Vite CSS, asset, and behavior build
    -> finalized static directory
    -> Alchemy deployment
    -> Cloudflare delivery
```

## Manifest-driven client behavior

Final scripts are not discovered from the rendered HTML.
Dependencies come from typed declarations:

```text
template/page definition
    -> declares required behaviors
    -> Vite builds registered behavior entrypoints
    -> Vite manifest supplies hashed filenames
    -> document assembler injects those scripts
```

A public Foldkit view emits a behavior host:

```html
<div
    data-behavior="three-gallery"
    data-config="/assets/gallery.json"
></div>
```

The same typed page result declares the behavior:

```typescript
const rendered_page = {
    document: view_public_gallery(gallery),
    behaviors: [
        {
            id: "three-gallery",
            loading_policy: "interaction",
        },
    ],
}
```

The trusted registry maps that identifier to a source entry:

```text
three-gallery
    -> src/behaviors/three-gallery.ts
    -> Vite
    -> dist/assets/three-gallery.A81F2.js
```

The finalizer injects only the route's declared behavior entries:

```text
final document
|-- styles.ABC.css
`-- three-gallery.A81F2.js      inject from Vite manifest
```

HTML scanning validates the result rather than discovering dependencies:

- a marker without a declaration fails;
- an unknown behavior fails;
- a declared behavior without a host warns or fails;
- aEffect, hydration, or router entry fails;
- any client script on a `static` route fails; and
-Effect, or router code on a `static` or `enhanced` route fails.

The route plan, template manifest, behavior registry, and Vite output manifest
are authoritative.

## Public components

The prerender process renders only a component's public version. It never
renders the editable CMS submodel.

```text
CMS/editor application
|-- editing controls
|-- uploads
|-- reordering
|-- draft state
|-- validation messages
`-- public preview

publication snapshot
`-- public component configuration only

server renderer
`-- public Foldkit view only

final site
`-- server-rendered public HTML + matching client behavior
```

For a 3D gallery, the explicit public Schema might be:

```typescript
const PublishedThreeGallery = Schema.Struct({
    id: GalleryId,
    title: Schema.String,
    models: Schema.Array(PublishedGalleryModel),
    camera: CameraConfig,
    controls: GalleryControls,
    loading_policy: LoadingPolicy,
})
```

The editor Model may contain additional state that cannot cross the publication
boundary:

```typescript
interface GalleryEditorModel {
    readonly published: PublishedThreeGallery
    readonly selected_editor_tab: EditorTab
    readonly upload_progress: Option.Option<number>
    readonly pending_uploads: ReadonlyArray<Upload>
    readonly validation_errors: ReadonlyArray<ValidationError>
    readonly drag_state: Option.Option<DragState>
    readonly asset_picker_open: boolean
}
```

Publishing performs a validated projection:

```text
GalleryEditorModel
    -> validate and select public values
    -> PublishedThreeGallery
    -> encode into SiteReleaseSnapshot
```

The render worker cannot render uploads, draft state, or editor controls
because those values do not exist in its input Schema.

## Equivalent visitor functionality

The public static component can provide the same visitor-facing behavior as the
CMS preview. It does not automatically compile arbitrary Foldkit application
code into vanilla JavaScript.

Instead, both environments share a typed public feature contract:

```text
ThreeGalleryCore
|-- public configuration
|-- public state
|-- actions
|-- state transitions
`-- Three.js lifecycle contract

Foldkit adapter
`-- connects Messages and Model to the shared core

static-site adapter
`-- connects DOM events to the shared core
```

For example:

```typescript
type GalleryState = {
    readonly selected_index: number
    readonly fullscreen: boolean
    readonly loading: boolean
}

type GalleryAction =
    | { readonly _tag: "SelectModel"; readonly index: number }
    | { readonly _tag: "EnterFullscreen" }
    | { readonly _tag: "ExitFullscreen" }
    | { readonly _tag: "ModelLoaded" }

const transition = (
    state: GalleryState,
    action: GalleryAction
): GalleryState => {
    // Shared public state transition.
}
```

The adapters translate their events into the same actions:

```text
Foldkit Message
    -> GalleryAction
    -> shared transition
    -> Foldkit Model

DOM event
    -> GalleryAction
    -> shared transition
    -> DOM and Three.js update
```

Calling this “converting the public Foldkit component to static HTML and
vanilla JavaScript” is reasonable at the product level. At the implementation
level it is a shared feature definition with two adapters, not a compiler for
arbitrary Foldkit TypeScript.

## Published component definition

A typed component definition makes behavior inclusion automatic for template
authors:

```typescript
const ThreeGallery = PublishedComponent.define({
    id: "three-gallery",
    Config: PublishedThreeGallery,
    static_view: view_public_three_gallery,
    behavior: "three-gallery",
    loading: "interaction",
})
```

The template uses:

```typescript
PublishedComponent.render(ThreeGallery, config)
```

The generator then:

1. renders the public Foldkit view;
2. records the registered behavior;
3. asks Vite to bundle its static-site adapter;
4. emits Schema-encoded public configuration;
5. injects the hashed module;
6. verifies the behavior host; and
7. runs the public feature contract tests.

```text
published Foldkit component
    -> server-rendered static HTML
    -> matching behavior automatically included
```

## Parity testing

The CMS preview and finalized page run the same visitor acceptance suite:

```text
Given a gallery with three models
When the visitor selects model two
Then model two loads
And its title and description appear
And resources belonging to the previous model are disposed
```

Shared configuration, state transitions, assets, CSS, and acceptance tests keep
the two adapters functionally equivalent.

The governing rule is:

> The CMS preview and public prerender consume the same published component
> configuration and public view. The editor surrounds that public view; it does
> not implement a separate approximation.

## Snapshot-directed route generation

URM does not use Foldkit's hard-coded whole-website route list. `RoutePlanner`
derives the exact finite inventory from the supplied release snapshot:

```text
SiteReleaseSnapshot
    -> RoutePlanner
    -> finite route inventory
    -> render only planned routes
```

Example snapshot fragment:

```json
{
    "release_id": "release_42",
    "pages": [
        { "path": "/" },
        { "path": "/gallery/" },
        { "path": "/contact/" }
    ]
}
```

Only `/`, `/gallery/`, and `/contact/` are rendered.

### Complete production build

```text
snapshot
    -> plan every public route
    -> render every route
    -> validate the complete site
    -> produce deployable BuildManifest
```

Only a complete manifest can be promoted to production.

### Partial preview build

```text
snapshot
    -> select requested pages or components
    -> render the subset
    -> produce preview artifacts
```

The command may accept validated filters:

```bash
sitegen build \
    --snapshot ./release.json \
    --routes /gallery/,/contact/
```

or:

```bash
sitegen build \
    --snapshot ./release.json \
    --pages page_gallery,page_contact
```

Every requested route or page must belong to the supplied snapshot. A partial
manifest is explicitly non-promotable:

```typescript
const manifest = {
    completeness: "partial",
    requested_routes: ["/gallery/"],
}
```

Partial builds support CMS previews, template development, component fixtures,
visual regression tests, social images, and rapid testing of changed content.

### Component preview snapshot

A component preview may use a smaller typed input:

```typescript
interface ComponentPreviewSnapshot {
    readonly template_version: TemplateVersion
    readonly theme: SiteTheme
    readonly locale: Locale
    readonly component: PublishedThreeGallery
    readonly fixture_context: PreviewFixtureContext
}
```

```text
ComponentPreviewSnapshot
    -> public Foldkit component view
    -> preview shell
    -> Foldkit server render
    -> preview HTML or image
```

## Future affected-route builds

Production initially uses complete clean builds. Later, an explicit dependency
graph can determine affected routes:

```text
gallery content changed
    -> /gallery/

product changed
    -> product detail
    -> collection pages containing it
    -> sitemap and feed

navigation or shared layout changed
    -> every route
```

Dependencies come from projections and template declarations, not by inferring
them from rendered HTML. A forced complete build remains the correctness and
recovery path.
