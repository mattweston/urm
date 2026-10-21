export const initial_copy: Readonly<Record<string, string>> = {
    hero_title: "Your marketing website and your business data, in one system.",
    hero_lede:
        "A secure, unified platform for your website, user base, and communications. Own your data, enforce privacy, and connect meaningfully with your audience.",
    hero_detail:
        "Perfect for non-profits, artists, and creators who want to build a brand, connect newsletters, and engage audiences without the bloat of traditional CRMs.",
    philosophy_title:
        '"Urm" is the sound of thinking. We are here to help you speed up the alchemy of ideas into content.',
    philosophy_body:
        "URM was born out of working with clients frustrated by disjointed CRM and CMS systems that do not talk to each other.",
    features_title: "Built for security and real users",
    features_body:
        "Purpose-built for organisations that serve the public. Use URM as your hosted product — open source so you can inspect the code, contribute PRs, and export your data anytime.",
    modules_title: "What’s included",
    modules_body:
        "One system for your site and your people. Documents, forms, media, events, members, and more.",
    showcase_title: "Who's using URM",
    showcase_body: "Organisations running URM on their own domains.",
    integrations_title: "Integrations",
    integrations_body:
        "Email, social, and payments — connect the tools you use.",
    stack_title: "URM stack",
    stack_body: "Built with modern, open tools.",
    pricing_title: "Pricing",
    pricing_body:
        "Use URM as a service. Open source — contribute on GitHub, export your data anytime. Need something bespoke? Pay for custom modules or components.",
    faq_title: "FAQ",
    faq_body: "Common questions about URM.",
    cta_title: "Ready to get started?",
    cta_body:
        "Join the organisations already building their communities with URM.",
}

export const copy_text = (
    copy: Readonly<Record<string, string>>,
    key: string
): string => copy[key] ?? ""
