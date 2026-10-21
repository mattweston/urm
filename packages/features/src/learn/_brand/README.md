# Foldkit Branded Types port

This bundle is a local, reviewable port of the approved vanilla TypeScript
prototype into the existing `packages/features/src/learn/foldkit` lesson
structure.

**Nothing in this bundle writes to GitHub.**

## What it adds

- Example 13 at `/learn/foldkit/branded-types/`
- `examples/branded-types.ts`
    - Foldkit `Model`
    - Foldkit `Message`
    - pure `update`
    - Effect branded types
    - `Brand.nominal`
    - Effect 4 `Brand.make` validation
    - `Brand.all`
- `branded-types.view.ts`
    - four-stage interactive visual lab
    - structural alias mix-up
    - nominal type gate
    - runtime-erasure inspector
    - refined value validation
    - combined brand validation

The repository currently uses Effect `4.0.0-rc.112`. The Effect v3 guide calls
the validating constructor `Brand.refined`; Effect 4 exposes that role as
`Brand.make`, so the port uses the API that matches the repository while
calling out the v3/v4 naming difference in the lesson.

## Apply locally

From the repository root:

```sh
git apply --check /path/to/integration.patch
git apply /path/to/integration.patch
pnpm typecheck
pnpm lint
```

Or copy the two new source files into the matching paths and apply the small
integration edits from `integration.patch` by hand.

## Files in this bundle

- `packages/features/src/learn/foldkit/examples/branded-types.ts`
- `packages/features/src/learn/foldkit/branded-types.view.ts`
- `integration.patch`

## Integration points

The patch only touches:

- `model.ts` — nests the example Model
- `message.ts` — adds its Message union
- `update.ts` — initializes and routes its messages
- `route.ts` — adds `/branded-types/`
- `index.ts` — exports the href helper
- `view.ts` — adds highlighted source, page 13, and the interactive view

No subscriptions, commands, managed resources, or browser-only effects are
needed for this lesson.
