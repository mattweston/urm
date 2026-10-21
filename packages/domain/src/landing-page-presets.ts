import type { LandingPageDocument } from "./schemas/landing-pages.ts"

export const blank_landing_page = {
    schema_version: 1,
    blocks: [],
} satisfies LandingPageDocument

export const marketing_starter_landing_page = {
    schema_version: 1,
    preset_id: "marketing_starter",
    motion: "rise",
    blocks: [
        {
            _tag: "Hero",
            id: "hero",
            eyebrow: "Welcome",
            heading: "A clear promise for the people you serve.",
            body: "Explain what you do, who it is for, and why it matters.",
            actions: [
                { label: "Get started", href: "/contact/", style: "primary" },
            ],
        },
        {
            _tag: "FeatureGrid",
            id: "features",
            heading: "Why choose us",
            items: [
                {
                    heading: "Focused",
                    body: "Describe one concrete benefit for your audience.",
                },
                {
                    heading: "Dependable",
                    body: "Add the evidence that makes your promise credible.",
                },
                {
                    heading: "Human",
                    body: "Show how people can expect to work with you.",
                },
            ],
        },
        {
            _tag: "Faq",
            id: "faq",
            heading: "Frequently asked questions",
            items: [
                {
                    question: "What should people know first?",
                    answer: "Give a concise, useful answer here.",
                },
            ],
        },
        {
            _tag: "Cta",
            id: "cta",
            heading: "Ready to take the next step?",
            body: "Tell people exactly what will happen when they continue.",
            actions: [
                { label: "Contact us", href: "/contact/", style: "primary" },
            ],
        },
    ],
} satisfies LandingPageDocument

export const urm_marketing_landing_page = {
    schema_version: 1,
    preset_id: "urm_marketing",
    motion: "stagger",
    blocks: [
        {
            _tag: "Hero",
            id: "hero",
            eyebrow: "URM",
            heading:
                "Your marketing website and your business data, in one system.",
            body: "A secure, unified platform for your website, user base, and communications. Own your data, enforce privacy, and connect meaningfully with your audience.",
            actions: [
                {
                    label: "Get started",
                    href: "https://docs.urm.dev",
                    style: "primary",
                },
                { label: "Learn more", href: "#features", style: "link" },
            ],
        },
        {
            _tag: "Intro",
            id: "intro",
            eyebrow: "Philosophy",
            heading: "“Urm” is the sound of thinking.",
            body: "We help speed up the alchemy of ideas into content, without splitting websites and customer data across disconnected systems.",
        },
        {
            _tag: "FeatureGrid",
            id: "features",
            heading: "Built for security and real users",
            items: [
                {
                    heading: "Content and contacts",
                    body: "Your website and your people in one place.",
                },
                {
                    heading: "Own your data",
                    body: "Export anytime, with no vendor lock-in.",
                },
                {
                    heading: "Open source",
                    body: "Inspect the code, contribute, and shape the roadmap.",
                },
            ],
        },
        {
            _tag: "LogoGrid",
            id: "integrations",
            heading: "Integrations",
            logos: [
                {
                    name: "Bento",
                    image: {
                        _tag: "BundledAsset",
                        asset_id: "urm.integration.bento",
                        alt: "Bento",
                    },
                },
                {
                    name: "Instagram",
                    image: {
                        _tag: "BundledAsset",
                        asset_id: "urm.integration.instagram",
                        alt: "Instagram",
                    },
                },
                {
                    name: "Stripe",
                    image: {
                        _tag: "BundledAsset",
                        asset_id: "urm.integration.stripe",
                        alt: "Stripe",
                    },
                },
                {
                    name: "Polar",
                    image: {
                        _tag: "BundledAsset",
                        asset_id: "urm.integration.polar",
                        alt: "Polar",
                    },
                },
            ],
        },
        {
            _tag: "Faq",
            id: "faq",
            heading: "FAQ",
            items: [
                {
                    question: "Who is URM for?",
                    answer: "Non-profits, artists, creators, and organisations that want their website and audience data in one secure system.",
                },
                {
                    question: "Who owns my data?",
                    answer: "You do. Your content and user data remain exportable.",
                },
            ],
        },
        {
            _tag: "Cta",
            id: "cta",
            heading: "Ready to get started?",
            body: "Join the organisations already building their communities with URM.",
            actions: [
                {
                    label: "See the demo",
                    href: "https://urm.urm.dev",
                    style: "primary",
                },
                {
                    label: "Read the docs",
                    href: "https://docs.urm.dev",
                    style: "secondary",
                },
            ],
        },
    ],
} satisfies LandingPageDocument

export const landing_page_presets = {
    blank: blank_landing_page,
    marketing_starter: marketing_starter_landing_page,
    urm_marketing: urm_marketing_landing_page,
} satisfies Readonly<Record<string, LandingPageDocument>>
