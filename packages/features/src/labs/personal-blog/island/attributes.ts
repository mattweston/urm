import { Schema as S } from "effect"

// Shared by two callers that must agree: the Vite plugin checks every directive
// in the markdown against these schemas at build time, and islandsFor decodes
// the attributes again before handing them to a view. A directive the plugin
// does not recognise fails the build rather than rendering an empty div.
//
// Imported by astro.config.ts, so it stays free of anything but Schema.
export const islandAttributes = {
    Counter: S.Struct({ label: S.optionalKey(S.String) }),
    Note: S.Struct({}),
}
