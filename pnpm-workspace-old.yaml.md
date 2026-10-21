# `llm-docs` is a workspace package so its examples resolve the @urm/* imports
# they demonstrate — the same arrangement as `ai-docs` in
# `.context/effect-smol`. It is not an Obsidian vault, so the node_modules a
# workspace symlink creates costs nothing here.
packages:
    - "apps/*"
    - "llm-docs"
    - "packages/*"
    - "projects/*"
    - "packages/tools/*"
allowBuilds:
    # Its postinstall downloads the PowerSync core wasm. The TanStack driver
    # loads `dist/wa-sqlite.mjs`, which ships in the tarball, so the download is
    # never read here.
    "@journeyapps/wa-sqlite": false
    "@mixedbread/cli": false
    "@nativescript/core": true
    "@parcel/watcher": false
    "@sentry/cli": true
    "@tailwindcss/oxide": true
    esbuild: false
    msgpackr-extract: true
    opencode-ai: true
    sharp: true
    workerd: false
peerDependencyRules:
    allowedVersions:
        "@foldkit/devtools>@effect/platform-browser": "4.0.0-rc.112"
        "@foldkit/devtools>effect": "4.0.0-rc.112"
        "@foldkit/devtools-mcp>effect": "4.0.0-rc.112"
        "@foldkit/markdown>effect": "4.0.0-rc.112"
        "@foldkit/ui>effect": "4.0.0-rc.112"
        "@foldkit/vite-plugin>effect": "4.0.0-rc.112"
        "foldkit>effect": "4.0.0-rc.112"
catalog:
    "@effect/platform-bun": "4.0.0-rc.112"
    "@effect/platform-node": 4.0.0-rc.112
    effect: 4.0.0-rc.112
    foldkit: 0.158.2
    typescript: 7.0.2
catalogs:
    api:
        "@withstudiocms/effect": "0.1.0-beta.30"
    auth:
        "@oslojs/crypto": "1.0.1"
        "@oslojs/encoding": "1.1.0"
        arctic: "3.7.0"
    browser:
        "@effect/platform-browser": "4.0.0-rc.112"
    build:
        turbo: "2.9.14"
        vite: 7.3.6
        vite-tsconfig-paths: "5.1.4"
    content:
        "@playform/compress": "0.2.0"
        "@types/sharp": "0.32.0"
        rehype-autolink-headings: "7.1.0"
        sharp: "0.35.0"
    database:
        "@effect/sql-pg": 4.0.0-rc.112
        "@journeyapps/wa-sqlite": 1.7.2
        "@tanstack/browser-db-sqlite-persistence": 0.2.9
        "@tanstack/db-sqlite-persistence-core": 0.2.9
        "@tanstack/db": 0.6.17
        "@tanstack/query-db-collection": 1.0.29
        "@types/pg": 8.18.0
        drizzle-kit: v1.0.0-rc.1
        drizzle-orm: v1.0.0-rc.1
        pg: 8.20.0
    dev:
        concurrently: "9.2.4"
        dotenv: "16.4.5"
    docs:
        "gray-matter": "4.0.3"
    env:
        "@dotenvx/dotenvx": "1.52.0"
        dotenv: "17.2.3"
        dotenv-cli: "10.0.0"
    frontend:
        "@types/node": 22.10.2
        tailwindcss: 4.0.6
        vite: 7.3.6
    infra:
        "@cloudflare/vite-plugin": "1.31.0"
        "@cloudflare/workers-types": "4.20251118.0"
        "@types/aws-lambda": "8.10.147"
        alchemy: "0.91.2"
        alchemy-effect: "0.6.0"
        "cloudflare": "4.2.0"
        distilled-cloudflare: "0.0.0"
        distilled-planetscale: "0.0.0"
        wrangler: "4.59.1"
    layout:
        "@fontsource-variable/inter": "5.2.8"
        "@fontsource/ibm-plex-mono": "5.2.7"
        "@tailwindcss/typography": "0.5.19"
        "@tailwindcss/vite": "4.1.14"
        animejs: "4.3.3"
        autoprefixer: "10.4.20"
        class-variance-authority: "0.7.1"
        classnames: "2.5.1"
        clsx: "2.1.1"
        combinate: "1.1.11"
        daisyui: "5.5.18"
        prettier-plugin-tailwindcss: "0.6.14"
        tailwind-merge: "3.3.1"
        tailwindcss: "4.1.11"
        tailwindcss-animate: "1.0.7"
        tw-animate-css: "1.4.0"
    lint:
        "@foldkit/oxlint-plugin": "0.5.0"
        "@prettier/plugin-oxc": "0.1.3"
        effect-oxlint: "0.1.0"
        eslint-plugin-better-tailwindcss: "3.8.0"
        eslint-plugin-oxlint: "1.58.0"
        oxfmt: "0.18.0"
        oxlint: "1.58.0"
        oxlint-tsgolint: "0.15.0"
        prettier: "3.6.2"
        prettier-plugin-organize-imports: "4.0.0"
        prettier-plugin-tailwindcss: "0.6.14"
    llms:
        "@ai-sdk/anthropic": "2.0.1"
        "@effect/ai": "0.35.0"
        agent-tail: "0.3.5"
        ai: "5.0.8"
        opencode-ai: "1.2.5"
        vibe-rules: "0.3.91"
    media:
        "@aws-sdk/client-s3": "3.840.0"
        "@aws-sdk/s3-request-presigner": "3.840.0"
    observability:
        "@sentry/browser": "10.65.0"
        "@sentry/cloudflare": "10.65.0"
    primitives:
        "@tanstack/store": "0.7.2"
    server:
        "@effect/platform-node": 4.0.0-rc.112
        "@effect/tsgo": 0.24.3
        "@types/node": 22.10.2
    state:
        nanostores: "1.1.0"
    testing:
        "@effect/vitest": "4.0.0-rc.112"
        "@faker-js/faker": "^10.0.0"
        "@playwright/test": "1.56.0"
        "@testing-library/dom": "10.4.0"
        vitest: "4.1.10"
    types:
        "@total-typescript/ts-reset": "0.6.1"
        "@types/three": "0.185.0"
        type-fest: "5.0.1"
        valibot: "1.1.0"
        zod: "4.3.6"
    ui:
        "@ark-ui/solid": "5.26.0"
        "@corvu/resizable": "0.2.5"
        "@foldkit/ui": "0.158.2"
        "@tanstack/table-core": "9.0.0-alpha.43"
        "@tiptap/core": "3.6.6"
        "@tiptap/extension-link": "3.6.6"
        "@tiptap/starter-kit": "3.6.6"
        "@types/three": "0.185.0"
        "abcjs": "6.6.3"
        "animejs": "4.5.0"
        chart.js: "4.5.0"
        tone: "15.1.22"
        uisfx: "0.4.0"
        cmdk-solid: "1.1.2"
        daisyui: "5.5.18"
        embla-carousel-solid: "8.6.0"
        lucide-solid: "1.8.0"
        mapbox-gl: "3.15.0"
        "maplibre-gl": "5.24.0"
        photoswipe: "5.4.4"
        prosekit: "0.15.8"
        three: "0.185.0"
    utils:
        date-fns: "4.1.0"
        immer: "10.1.3"
        jsdom: "27.0.0"
        lodash: "4.17.21"
        parse-multipart-data: "1.5.0"

# 7 days × 24 hours × 60 minutes = 10,080 minutes
minimumReleaseAge: 10080
minimumReleaseAgeExclude:
    - "alchemy@2.0.0-beta.67"
    - "@effect/platform-browser@4.0.0-rc.112"
    - "@effect/platform-node-shared@4.0.0-rc.112"
    - "@effect/platform-node@4.0.0-rc.112"
    - "@effect/sql-pg@4.0.0-rc.112"
    - "@effect/vitest@4.0.0-rc.112"
    - effect@4.0.0-rc.112
    - "@foldkit/devtools-mcp@0.19.5"
    - "@foldkit/devtools@0.158.2"
    - "@foldkit/markdown@0.9.2"
    - "@foldkit/ui@0.158.2"
    - "@foldkit/vite-plugin@0.20.2"
    - animejs@4.5.0
    - foldkit@0.158.2
    - foldkit-remote@0.3.0
    - foldkit-remote-server@0.3.0
    - foldkit-surface@0.2.0
    - three@0.185.0
    - "@types/three@0.185.0"
    - "@effect/ai-openai@4.0.0-rc.112"

# @effect/vitest imports @vitest/runner at runtime but only declares it as a
# devDependency; keep this version in sync with the testing catalog's vitest.
packageExtensions:
    "@effect/vitest":
        dependencies:
            "@vitest/runner": "4.0.16"
    # expressive-code-twoslash pins its peers to ^0.41.7, which forced a second
    # copy of @expressive-code/core alongside astro-expressive-code's 0.44.0 —
    # the two copies made ecTwoSlash()'s plugin type unassignable in the docs and
    # labs astro configs. Widen the range so both resolve to one 0.44 instance.
    expressive-code-twoslash:
        peerDependencies:
            "@expressive-code/core": "^0.41.7 || ^0.44.0"
            expressive-code: "^0.41.7 || ^0.44.0"
overrides:
    "@effect/platform-browser": "4.0.0-rc.112"
    # Keep the Node platform packages on the same Effect release candidate.
    "@effect/platform-node>@effect/platform-node-shared": "4.0.0-rc.112"
    # Alchemy beta.67 accepts the Effect 4 beta/RC line but leaves these two
    # dependencies floating. Keep its internal tooling on the workspace RC.
    "alchemy@2.0.0-beta.67>@effect/sql-d1": "4.0.0-rc.112"
    "alchemy@2.0.0-beta.67>@effect/vitest": "4.0.0-rc.112"
    "@foldkit/vite-plugin": "0.20.2"
    # @effect/sql-pg's pg range floats ahead of the database catalog, which gave
    # drizzle-orm two peer variations and made every SQL<unknown> crossing a
    # package boundary unassignable. Keep pg on the catalog version.
    pg: "8.20.0"
    "@cloudflare/vite-plugin": "1.31.0"
    miniflare: "4.20260730.0"
    wrangler: "4.102.0"
    # @aws-sdk/core pins fast-xml-parser at exactly 4.4.1 (no range), which no
    # SDK release has moved. 4.5.7 is the last 4.x and carries both fxml fixes
    # (>=4.5.4 / >=4.5.5); the unscoped 5.x copies elsewhere stay untouched.
    "@aws-sdk/core>fast-xml-parser": "4.5.7"
    # agent-tail's next-plugin pins next, which drags vulnerable postcss/sharp.
    next: "16.2.12"
    "next>postcss": "8.5.23"
    "next>sharp": "^0.35.0"
    # miniflare pins undici 7.28.0 exactly; 7.29.0 carries the socket-reuse fix.
    "miniflare>undici": "7.29.0"
    "@cloudflare/vite-plugin>ws": "8.21.0"
strictDepBuilds: true
patchedDependencies:
    effect@4.0.0-rc.112: patches/effect@4.0.0-rc.112.patch
    drizzle-orm@1.0.0-rc.1: patches/drizzle-orm@1.0.0-rc.1.patch
    alchemy@2.0.0-beta.67: patches/alchemy@2.0.0-beta.67.patch
