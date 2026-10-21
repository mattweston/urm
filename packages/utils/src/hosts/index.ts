/**
 * # Host classification
 *
 * One rule for which surface a hostname names, shared by the browser and the
 * server so the two cannot drift.
 */
export {
    classifyHost,
    generatedDomainSlug,
    hostnameOf,
    isCentralHostname,
    isCustomHostname,
    isGeneratedHostname,
    localPublicationHost,
} from "./classify.ts"
export type { HostKind, LocalPublicationHost } from "./classify.ts"
