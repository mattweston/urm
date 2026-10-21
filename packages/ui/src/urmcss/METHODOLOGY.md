# URMCSS methodology

## Objectives

URMCSS makes the intended styling mechanism obvious from the markup and keeps
all rules for a concept together. It avoids requiring feature authors or coding
agents to invent visual decisions while implementing application behavior.

## Colocation

Colocation is one of URMCSS's core features. A concept's source file contains
every rule that changes that concept:

- Default presentation and internal parts.
- Bounded variants and semantic states.
- Responsive and input-mode adaptations.
- Reactions to the concept's own contents with `:has()`.
- Documented ancestor-context adaptations with reverse-context nesting.

This is ownership colocation, not markup colocation: CSS does not have to live
in a component's TypeScript file. It lives in a concept stylesheet with a
stable cascade layer and can be assembled into one production asset.

Other concept files must not patch the concept. For example, `button.css` may
contain a supported sidebar adaptation, but `sidebar.css` must not target
buttons. The parent still owns external flow, gap, alignment, and placement;
the child owns changes to its own appearance and internal layout.

### Reverse-context nesting

URMCSS calls an ancestor selector placed before an appended `&`
**reverse-context nesting**:

```css
button {
    :where(.sidebar) & {
        inline-size: 100%;
    }
}
```

The browser expands this to `:where(.sidebar) button`. It reads in reverse
inside the button rule, but it is not a reverse parent selector and does not
style `.sidebar`. Compare the direction of these selectors:

```css
button {
    & .icon {} /* button .icon: styles a descendant */
    :where(.sidebar) & {} /* :where(.sidebar) button: styles this button */
    &:has(> .icon) {} /* button:has(> .icon): styles this button from a child */
}
```

Use reverse-context nesting only for a small, stable structural relationship.
Do not name a route, page, or one-off screen. If many independently evolving
contexts should produce the same adaptation, prefer an inherited semantic
custom property so neither concept has to name the other.

### Choosing a relationship

| Intention                                    | Mechanism                             |
| -------------------------------------------- | ------------------------------------- |
| Intrinsic option selected by markup          | Semantic data attribute               |
| Concept reacts to its own child/content      | Narrowly anchored `:has()`            |
| Concept supports one stable ancestor context | Reverse-context nesting: `.context &` |
| Theme, density, or shared semantic context   | Inherited custom property             |
| Parent itself reacts to a child              | `:has()` in the parent's concept file |

Colocation does not mean every relationship should become a coupled selector.
It means that, after choosing the least-coupled mechanism, the resulting rule
stays with the concept it changes.

## Cascade layers

Layers move precedence out of selector specificity and file import accidents.

| Layer        | Responsibility                             |
| ------------ | ------------------------------------------ |
| `reset`      | Narrow normalization for native elements   |
| `tokens`     | Literal and semantic custom properties     |
| `base`       | Defaults for semantic HTML elements        |
| `objects`    | Reusable layout and composition primitives |
| `components` | Autonomous named interface concepts        |
| `utilities`  | Small, explicit exceptions                 |
| `overrides`  | Temporary or integration-level corrections |

All URMCSS rules belong to a layer. Unlayered application CSS is outside the
methodology and takes precedence over normal declarations in every layer.

## Selector vocabulary

Use the smallest selector that expresses the design intention.

### Semantic elements

Style an element directly when every instance should participate:

```css
button {}
dialog {}
input {}
```

Do not duplicate native meaning with `data-ui="button"`.

### Named concepts

Use a class when HTML has no element for an autonomous reusable concept:

```css
.card {}
.sidebar {}
.toolbar {}
```

The concept owns its CSS file. Other component files must not patch it.

### Variants and configuration

Use data attributes for a closed set of visual options:

```css
button:where([data-variant="primary"]) {}
.card:where([data-tone="quiet"]) {}
```

Names describe purpose rather than appearance. Prefer `primary` to `blue` and
`quiet` to `gray`.

### State

Prefer native and ARIA state. Use library-provided data state when no native
selector represents it:

```css
button:where(:disabled, [aria-disabled="true"], [data-disabled]) {}
[aria-current="page"] {}
input:user-invalid {}
```

Application code must not duplicate an available semantic state solely for
styling.

### Relationships

Use `:has()` when a concept reacts to its own contents or child state. Anchor
it to the narrowest responsible component:

```css
.field:where(:has(> input:user-invalid)) {}
```

Icon-only sizing uses `button:where([data-content="icon"])`, supplied by the
typed Button contract. Do not infer it from `svg:only-child`: text nodes do not
count as siblings for that selector, so an icon with visible text also matches.

Use reverse-context nesting with an appended `&` when a component has a
documented contextual adaptation:

```css
button {
    :where(.sidebar) & {}
}
```

This remains button CSS, even though it expands to `:where(.sidebar) button`.
It styles the button, not the ancestor. Prefer an inherited custom property
when the context is thematic or should be produced by multiple unrelated
containers. Contextual exceptions must not name individual routes or screens.

### Specificity

Use `:where()` around variants, states, and contexts that should not increase
specificity. Do not use `!important` to repair ordering. Keep nesting shallow;
nest only rules that belong to the same concept.

## Ownership and layout

- A component controls its internal layout, never its external margin or
  placement.
- Parent objects own flow, gaps, alignment, and placement of their children.
- Responsive and interaction rules stay beside the concept they modify.
- Themes configure semantic custom properties; components do not branch on a
  theme identifier.
- Repetition is acceptable until a stable reusable concept is evident.

## Foldkit

`@foldkit/ui` remains the headless behavior and accessibility layer. URM views
provide semantic elements and compose the attribute groups returned by Foldkit.
URMCSS consumes those native, ARIA, and data attributes without introducing a
styling runtime.

```typescript
Button.view(
    {
        onClick: SaveClicked(),
        toView: ({ button }) =>
            h.button(
                [...button, h.DataAttribute("variant", "primary")],
                ["Save"]
            ),
    },
    h
)
```

## Agent contract

Feature work uses semantic HTML and existing URMCSS concepts. It must not add
inline styles, arbitrary utility classes, tokens, variants, or selectors unless
the task explicitly changes presentation. When the vocabulary cannot express a
required interface, report the missing design-system capability.
