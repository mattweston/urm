# Other Site Generation Options

Status: evaluated options

These options preserve useful ideas but are not recommended as the initial
tenant-site generator. The generator-neutral release, build, deployment, and
promotion contracts remain those in the
[Effect-native proposal](../effect-native/sitegen.md).

## Evaluation criteria

Any generator must consume an immutable `SiteReleaseSnapshot`, use a pinned
trusted template version, produce a validated `BuildManifest`, support local
reproduction, and stay behind the `SiteGenerator` interface. It must not read
mutable editorial state or receive deployment credentials.

Options are judged on compatibility withdeterministic artifacts,
routing and media support, Effect integration, Vite/Alchemy fit, maintenance
cost, API stability, and template ecosystem.

## Comparison

| Option | Main advantage | Main cost | Decision |
| --- | --- | --- | --- |
| Small generator inspired by Menimal and Docgen | Simple typed pipeline and complete control | URM owns site-framework policy | Use its pipeline ideas inside the Effect-native design |
| Effect Start primitives | Useful bundler-neutral and cache-aware seams | Not a complete SSG; JSX does not match Foldkit | Reuse selected lower-level patterns only |
| Prebuilt output plus generic uploader | Clean build/deployment separation | Adds staging and loses the single-Vite-build path | Keep as a deployment adapter fallback |
| Shared Worker plus object storage | Cheap atomic promotion at higher scale | Requires custom serving operations | Planned scale path, not the first deployment model |
| Arbitrary tenant-authored code | Maximum template flexibility | Requires a distinct hardened trust tier | Explicitly defer |

## Menimal and Docgen

Menimal demonstrates the essential static-site loop: decode configuration,
normalize pages, render templates, validate links, process assets, and write a
deterministically ordered output. Docgen adds a useful compiler-style pipeline
with explicit intermediate files and typed stages.

Adopt a small Effect program over replaceable services, Schema decoding at
input boundaries, normalized page and route representations, complete route
planning before output, link and artifact validation, deterministic ordering,
content digests, and tagged stage failures.

Do not adopt their filesystem-first content models, older Effect idioms, or
domain-specific renderers. Tenant builds begin with a release snapshot, not
mutable source discovery.

## Effect Start

Effect Start contributes useful references for bundler-neutral artifacts,
hashed entrypoints, rebuild capabilities, MIME types, ETags, byte ranges, and
traversal-safe static serving.

Its current primitives do not form a tenant SSG. Filesystem routes are serving
abstractions rather than publication routes, and its JSX renderer is not
compatible with Foldkit hydration. Adapt the invariants behind URM-owned
interfaces without depending on Effect Start as the framework.

## Build-then-upload

Running the generator first and passing a validated directory to a generic
artifact-store adapter is a sound portability fallback and useful local/test
path. It is not the preferred initial Alchemy path because the proposal relies
on one Alchemy-owned Vite build rather than a separate build and deployment.

Keep it viable through a provider-neutral `BuildManifest` and an artifact
store capable of accepting already-generated output.

## Shared serving Worker

A shared Worker backed by immutable object storage becomes attractive when
per-site deployments create measurable latency, provider-limit, cost, or state
contention. This is a deployment evolution, not a renderer choice. The initial
release/deployment/environment model already supports it; do not build it
before measurements establish the need.

## Arbitrary tenant code

Tenant-authored framework code, TypeScript, JavaScript, or packages must not run in the
initial privileged builder. If required later, it becomes a distinct trust
tier with a sandboxed worker pool, dependency allowlists, resource and network
limits, review or signing, and credentials incapable of promotion.

Initial customization should remain schema-decoded theme data and a bounded
declarative AST interpreted by trusted components.

## Recommendation

Build the enhanced Foldkit prerender path first, but keep `SiteGenerator`, the
snapshot, and the manifest renderer-neutral. Keep the custom surface bounded to
URM's product requirements. Move to the shared Worker only when operational
measurements justify it.
