# URMCSS

URMCSS is URM's internal vanilla CSS methodology. It gives application code a
small, semantic presentation contract so feature work can concentrate on HTML,
accessibility, behavior, and data flow.

URMCSS combines:

- Colocation: a concept's defaults, parts, variants, states, responsive rules,
  and contextual adaptations live in one source file.
- ITCSS-style ordering through native cascade layers.
- ECSS-style ownership: one autonomous concept has one CSS source of truth.
- Semantic HTML before classes or custom attributes.
- Theme values expressed as custom properties rather than theme-specific
  component selectors.
- Native nesting, `:where()`, `:has()`, and appended `&` selectors used for
  explicit relationships.

The administration client imports an isolated Button experiment at
`/labs/design/urmcss/button`. Production components and generated public sites
have not migrated.

## Colocation

Colocation is a core URMCSS feature. A concept file owns every rule that changes
that concept, including rules triggered by its children or ancestors. A
sidebar therefore does not patch button styles from `sidebar.css`; the button
declares its supported sidebar adaptation in `button.css`:

```css
button {
    &:where([data-content="icon"]) {
        /* Explicit icon-only content; text nodes do not affect :only-child. */
    }

    :where(.sidebar) & {
        /* The button reacts to a documented ancestor context. */
    }
}
```

The appended `&` form is called **reverse-context nesting** in URMCSS. It
compiles to `:where(.sidebar) button`; it does not select the parent. `:has()`
is the relational selector used when the element being styled must react to a
child. See [examples/button.css](examples/button.css) for the complete example.

## Entry point

```css
@import "@urm/ui/urmcss/styles.css";
```

The entry point declares this stable order:

```css
@layer reset, tokens, base, objects, components, utilities, overrides;
```

See [METHODOLOGY.md](METHODOLOGY.md) for authoring rules and
[INTEGRATION.md](INTEGRATION.md) for URM-specific adoption constraints.

## Experimental Button contract

Import `Button` from `@urm/ui/urmcss/button.ts`. Supply `children` and an
`onClick` message; optionally select `variant` (primary, secondary, outline,
quiet, danger), `size` (small, standard, large), `disabled`, or an accessible `label`.
Set `icon_only: true` for an icon-only button; its type requires `label`.
Defaults are primary and standard. Do not infer icon-only content with
`svg:only-child`: CSS ignores text nodes when matching that selector.

The lab host imports `button.css` and places examples under `.urmcss-preview`.
This scope is a migration boundary, not an application-wide activation.
Disabled buttons preserve Foldkit's focusable ARIA-disabled behavior and have
no click handler. The wrapper intentionally exposes only button actions.
Feature authors reuse these options; presentation changes belong in
`button.css`. No caller class or inline-style escape hatch is exposed.

## Context migration examples

The Button lab includes the following existing application relationships:

| Source                        | Migration contract                                                                                                                                    | Owner                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `foldkit/date-picker.view.ts` | Preserve Calendar cell/button attribute groups; add `urmcss-calendar-cell` to cells and `urmcss-calendar-day` or `urmcss-calendar-period` to buttons. | `button.css` consumes parent selected/today/focused/outside-month/disabled state. |
| `labs/todo/todo.view.ts`      | `urmcss-action-row` contains direct action buttons; nested controls retain their own presentation.                                                    | `button.css` owns destructive appearance and hover/focus reveal.                  |
| `media/platform/app.view.ts`  | `urmcss-media-card` contains a direct `urmcss-media-actions` group; its buttons use secondary/danger variants.                                        | `media-actions.css` owns group visibility; `button.css` owns button sizing.       |

Calendar buttons must retain the headless Calendar's `buttonAttributes` rather
than being passed through the generic Button wrapper, which would replace its
roving tab order and specialized events. The lab reuses Calendar's existing
model/update, including selection and month/year navigation. Tomorrow is
unavailable to expose the disabled-cell state.

Contextual actions are visible by default. Only fine pointers with hover hide
them until hover or focus-within; touch users keep visible actions. No ancestor
selector names a route. Calendar state ordering is default, outside-month,
today, selected, focused, then disabled. Forced colors preserve selected state.

These examples cover the listed contexts, not every button in the repository.
Keep the preview scope until each production consumer is verified in its host.
