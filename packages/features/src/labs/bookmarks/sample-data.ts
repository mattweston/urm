export type Bookmark = Readonly<{
    title: string
    url: string
    tags: ReadonlyArray<string>
    paths: ReadonlyArray<Bookmark>
}>

// https://www.patterns.dev/#patterns
const bookmarks: ReadonlyArray<Bookmark> = [
    {
        title: "1.1.1.1",
        url: "https://one.one.one.one",
        tags: ["dns"],
        paths: [],
    },
    {
        title: "3DMate",
        url: "https://3dmate.app/",
        tags: ["3d", "cad"],
        paths: [],
    },
    {
        title: "50 Docs Tips in 50 Days",
        url: "https://www.rainsberger.ca/blog/50-docs-tips-in-50-days/",
        tags: ["docs", "writing"],
        paths: [],
    },
    {
        title: "Accounts — Effect HTTP Example",
        url: "https://github.com/Effect-TS/examples/tree/main/examples/http-server/src/Accounts",
        tags: ["effect", "http", "example"],
        paths: [],
    },
    {
        title: "Agent Native",
        url: "https://www.agent-native.com",
        tags: ["agents", "LLMs"],
        paths: [],
    },
    {
        title: "Alchemy",
        url: "https://alchemy.run",
        tags: ["infra", "deploy", "cloudflare"],
        paths: [
            {
                title: "Astro",
                url: "/cloudflare/frontend/astro/",
                tags: ["astro", "deploy", "infra"],
                paths: [],
            },
            {
                title: "Send and Receive Email",
                url: "/cloudflare/email/send-and-receive",
                tags: ["cloudflare", "email"],
                paths: [],
            },
            {
                title: "Vite",
                url: "/cloudflare/frontend/vite/",
                tags: ["cloudflare", "deploy", "infra", "vite"],
                paths: [],
            },
        ],
    },
    {
        title: "Astro Docs Contributor Guide",
        url: "https://contribute.docs.astro.build/",
        tags: ["astro", "docs"],
        paths: [],
    },
    {
        title: "Astro Reveal",
        url: "https://astro-reveal.nicopicotto.dev",
        tags: ["astro", "animation", "scrollDriven"],
        paths: [],
    },
    {
        title: "Async History Stack",
        url: "https://github.com/kettanaito/async-history-stack",
        tags: ["javascript", "history"],
        paths: [],
    },
    {
        title: "Axolot CMS",
        url: "https://axolotcms.com/",
        tags: ["cms"],
        paths: [],
    },
    {
        title: "Better Upload",
        url: "https://better-upload.com/docs/quickstart",
        tags: ["upload", "files"],
        paths: [],
    },
    {
        title: "Building a Slide System in Astro",
        url: "https://xergioalex.com/blog/building-slide-system-inside-astro-revealjs/",
        tags: ["astro", "slides"],
        paths: [],
    },
    {
        title: "Capacitor",
        url: "https://capacitorjs.com/docs",
        tags: ["native", "mobile"],
        paths: [],
    },
    {
        title: "DeepSec",
        url: "https://github.com/vercel-labs/deepsec",
        tags: ["AI", "security"],
        paths: [],
    },
    {
        title: "dfx",
        url: "https://github.com/tim-smart/dfx",
        tags: ["effect", "discord"],
        paths: [],
    },
    {
        title: "Diffy",
        url: "https://docs.diffy.website/",
        tags: ["visualRegression", "testing"],
        paths: [],
    },
    {
        title: "Dovenvx",
        url: "https://dotenvx.com",
        tags: ["security", "envVars"],
        paths: [],
    },
    {
        title: "Effect",
        url: "https://www.effect.website",
        tags: ["effect"],
        paths: [],
    },
    {
        title: "Effect Chat AI Doc",
        url: "https://github.com/Effect-TS/effect-smol/blob/main/ai-docs/src/71_ai/30_chat.ts",
        tags: ["AI", "effect", "chat"],
        paths: [],
    },
    {
        title: "Effect Electron Example",
        url: "https://github.com/lucas-barake/effect-electron-example",
        tags: ["effect", "electron", "desktop"],
        paths: [],
    },
    {
        title: "Effect Form",
        url: "https://github.com/lucas-barake/effect-form",
        tags: ["effect", "forms"],
        paths: [],
    },
    {
        title: "Effect Grep",
        url: "https://effect-grep.timhanlon.com/",
        tags: ["Effect", "grep", "search"],
        paths: [],
    },
    {
        title: "Effect Institute",
        url: "https://www.effect.institute",
        tags: ["effect", "typescript"],
        paths: [],
    },
    {
        title: "Effect Start Studio",
        url: "https://github.com/nounder/effect-start/tree/main/src/studio",
        tags: ["effect", "studio"],
        paths: [],
    },
    {
        title: "Email SDK",
        url: "https://email-sdk.dev",
        tags: ["email", "sdk"],
        paths: [],
    },
    {
        title: "Emdash",
        url: "https://github.com/emdash-cms/emdash",
        tags: ["cms"],
        paths: [],
    },
    {
        title: "Executor",
        url: "https://executor.sh",
        tags: ["Effect", "LLMs", "MCP"],
        paths: [],
    },
    {
        title: "Foldkit",
        url: "https://foldkit.dev",
        tags: ["framework", "UI"],
        paths: [],
    },
    {
        title: "Github",
        url: "https://github.com",
        tags: ["openSource"],
        paths: [
            {
                title: "Classy",
                url: "https://github.com/djgrant/classy/tree/main/packages/foldkit",
                tags: ["framework", "UI", "classes"],
                paths: [],
            },
            {
                title: "Foldkit Alchemy Starter",
                url: "https://github.com/NolanGC/foldkit-alchemy-starter",
                tags: ["framework", "UI"],
                paths: [],
            },
            {
                title: "Solidtype",
                url: "https://github.com/samwillis/solidtype",
                tags: ["CAD"],
                paths: [],
            },
        ],
    },
    {
        title: "Hazel Chat",
        url: "https://github.com/HazelChat/hazel",
        tags: ["AI", "chat", "effect"],
        paths: [],
    },
    {
        title: "Herdr",
        url: "https://herdr.dev",
        tags: ["agentMultiplexer", "LLMS"],
        paths: [],
    },
    {
        title: "Hyperframes",
        url: "https://github.com/heygen-com/hyperframes",
        tags: ["AI", "videoGeneration", "textToVideo"],
        paths: [],
    },
    {
        title: "Image Compression",
        url: "https://www.makingsoftware.com/chapters/image-compression",
        tags: ["images", "performance"],
        paths: [],
    },
    {
        title: "img2threejs Showcase",
        url: "https://img2threejs.github.io/img2threejs-showcase/",
        tags: ["3d", "threejs", "images"],
        paths: [],
    },
    {
        title: "Is Ready for Launch?",
        url: "https://isreadyforlaunch.com",
        tags: ["accessibility", "audit", "SEO"],
        paths: [],
    },
    {
        title: "Learnable Programming",
        url: "https://worrydream.com/LearnableProgramming/",
        tags: ["docs", "teaching", "interaction"],
        paths: [],
    },
    {
        title: "Loro",
        url: "https://loro.dev/blog/loro-now-open-source",
        tags: ["crdt", "localFirst"],
        paths: [],
    },
    {
        title: "Observability Guides",
        url: "https://betterstack.com/community/guides/observability/",
        tags: ["observability", "monitoring"],
        paths: [],
    },
    {
        title: "Oxc",
        url: "https://oxc.rs",
        tags: ["formatting", "linting"],
        paths: [],
    },
    {
        title: "PayKit",
        url: "https://paykit.sh/",
        tags: ["payments"],
        paths: [],
    },
    {
        title: "PlanetScale Skills",
        url: "https://github.com/planetscale/skills",
        tags: ["database", "skills"],
        paths: [],
    },
    {
        title: "Shop",
        url: "https://shop.astro.build",
        tags: ["marketing", "shop"],
        paths: [],
    },
    {
        title: "Solid 2 Issue Tracker",
        url: "https://github.com/brenelz/solid-2/tree/issue-tracker",
        tags: ["solid", "example"],
        paths: [],
    },
    {
        title: "Specification",
        url: "https://specification.website/",
        tags: ["docs", "specs"],
        paths: [],
    },
    {
        title: "Tailscale",
        url: "tailscale.com",
        tags: ["vpn", "network"],
        paths: [],
    },
    {
        title: "Tangle",
        url: "https://github.com/worrydream/Tangle",
        tags: ["interaction", "teaching"],
        paths: [],
    },
    {
        title: "Try Hack Me",
        url: "https://tryhackme.com",
        tags: ["security", "learning"],
        paths: [],
    },
    {
        title: "Varlock",
        url: "https://varlock.dev",
        tags: ["security", "envVars"],
        paths: [],
    },
    {
        title: "Verrex",
        url: "https://m9tdev.github.io/verrex/",
        tags: ["regex"],
        paths: [],
    },
    {
        title: "Verrex (source)",
        url: "https://github.com/m9tdev/verrex",
        tags: ["regex"],
        paths: [],
    },
    {
        title: "Webworkers Example",
        url: "https://github.com/type-driven/rpc/tree/main/packages/webworkers-example",
        tags: ["webWorkers", "rpc", "typescript"],
        paths: [],
    },
    {
        title: "ZeroCMS",
        url: "https://www.zerocms.io/",
        tags: ["cms"],
        paths: [],
    },
]

export default bookmarks

// Pending schema change, from the retired learn app's bookmarks todo. Adopting
// it means widening the Bookmark type, so it is a decision rather than a
// backlog item:
//
//   title, url (no https://), author, tags[], domain: "urm.dev", owner
//
// It also called for an 'Add Bookmark' form.
