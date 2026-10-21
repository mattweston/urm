# Spreadsheet | Octane to Foldkit port

This directory ports `@urm/features-octane/spreadsheet` to the Foldkit Elm architecture. The public entry point is `@urm/features/spreadsheet`, and the client Labs route is `/labs/data/spreadsheets`.

This is also the canonical layout for `/data/spreadsheets`. Its table adapter
supplies real rows and column labels, validates edits, and sends revision-checked
requests through the existing Data client adapter. Table mode never uses the
sample workbook, formula evaluation, or browser persistence; Labs retains those
workbook behaviors. Both modes share the grid view, selection, inline editor,
address input, and viewport subscriptions.

## Architecture mapping

| Octane source                    | Foldkit destination                                   |
| -------------------------------- | ----------------------------------------------------- |
| `useState` state in `App.tsrx`   | `spreadsheet.model.ts`                                |
| callbacks and DOM event handlers | facts in `spreadsheet.message.ts`                     |
| callback state transitions       | pure `spreadsheet.update.ts`                          |
| localStorage effects             | `LoadWorkbook` and `SaveWorkbook` Commands            |
| TanStack row virtualizer         | `@foldkit/ui` `VirtualList` Submodel and Subscription |
| JSX and Tailwind classes         | pure `spreadsheet.view.ts`                            |
| helpers in `gridlab/domain.ts`   | framework-independent `spreadsheet.domain.ts`         |

The port retains the 1,000 by 80 workbook, deterministic seed data, cell selection, arrow-key navigation, address-box jumps, inline editing, basic formulas, and browser persistence. Rendering is virtualized in both directions: Foldkit's `VirtualList` owns the visible row range, while a scroll/resize Subscription computes a small overscanned column window. The full grid dimensions are preserved with spacer columns, but only visible cells are built.

The spreadsheet is a branded Foldkit `Submodel`. The application keeps its Model in the Labs Model, so workbook data and editor state survive route navigation instead of being rebuilt on every visit. The route-specific Subscription is gated with `when`, preventing storage, viewport, and scroll messages while another demo is active.

Rows use `createKeyedLazy` with stable scalar window bounds and cell/editor state. This is important: passing a freshly allocated mapper or visible-column array into the lazy arguments defeats identity-based memoization and causes every visible row to rebuild during scroll updates.

## Integration

`apps/client` owns the application shell. Its route table, parent Model and
Message, update fold, Subscription lift, registry, and navigation entry compose
this package module without importing package internals.

Persistence Commands return explicit success and failure Messages, and the editor is represented as a tagged `IdleEditor | EditingCell` state. Story and scene tests cover restore, editing/saving, address navigation, and invalid addresses.

## Verification

```sh
pnpm --filter @urm/features typecheck
pnpm --filter @urm/features test
pnpm exec oxlint packages/features/src/spreadsheet apps/client/src
pnpm --filter @urm/client typecheck
pnpm lint
pnpm test
```

The package checks above are the focused verification for this port. The repository-wide commands may still report failures in unrelated workspaces; review their paths before attributing them to the spreadsheet.
