## Callout and Steps

Import `Callout` from `@urm/ui/foldkit/callout.view.ts` and `Steps` from
`@urm/ui/foldkit/steps.view.ts`. Load `@urm/ui/styles/callout-steps.css` once
in the host stylesheet (included by the documentation stylesheet).

```typescript
Callout({ tone: "Tip", title: "Next action", children: [h.p([], ["Review the result."])] })
Steps({ items: [[h.p([], ["Choose a component."])], [h.p([], ["Compose its content."])]] })
```

Callout defaults to the Note tone and uses the tone as its default title;
tones are Note, Tip, Warning, and Danger. Both helpers accept `class`. Steps
creates a semantic ordered list; each item contains ordinary Foldkit children.
`StepsContainer` wraps an existing ordered list, as used by Markdown islands.

## Navigation graph

Import `Graph` from `@urm/ui/foldkit/graph.view.ts` and `local_graph` from
`@urm/ui/foldkit/graph.ts`. Load `@urm/ui/styles/graph.css` in the host.

`local_graph(pages, current_id)` accepts records with `id` and `links`,
retains their extra fields, and places the current record among its incoming
and outgoing neighbors. Filter hidden records before passing them in.
`Graph({ graph, current_id, to_href, to_content })` renders the result with
keyboard-accessible links; `to_content` returns ordinary Foldkit children.
Optional `aria_label` and `class` customize the container.

## Canvas grid

`CanvasGrid` from `@urm/ui/foldkit/canvas-grid.view.ts` wraps Foldkit's
`Canvas.view` in a responsive viewport. Pass camera `x`, `y`, `zoom`,
`show_grid`, world-space Canvas `shapes`, HTML overlay `children`, and
pointer callbacks, followed by the current HTML builder. Internal coordinates
are 1000 × 600; overlay positions use percentages of those dimensions.
Load `@urm/ui/styles/canvas-grid.css`. The host owns interaction state.
The service-canvas lab demonstrates pan, zoom, selection, dragging, keyboard
movement, and undo/redo.

## Skeleton loading states

Import `Skeleton` from `@urm/ui/foldkit/skeleton.view.ts`. It is a decorative,
stateless surface with theme-aware color, rounded corners, and pulse animation
only when the user has not requested reduced motion. Size it with the same
layout classes as the content it replaces:

```typescript
Skeleton({ class: "h-4 w-48" })
```

Keep page-specific skeleton layouts beside their real view and reuse the real
container, grid, card, row-height, and spacing classes. Mark the stable results
container `aria-busy` while loading and keep a stable polite status element for
the textual update. Do not measure and clone the live DOM at runtime: that is
client-only, adds layout reads, and cannot represent data that has not arrived.
