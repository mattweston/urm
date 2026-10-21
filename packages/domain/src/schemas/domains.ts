import { Schema } from "effect"

/**
 * Human-readable domain name, distinct from its URL slug or hostname.
 * Rejects surrounding whitespace rather than trimming it.
 */
export const DomainName = Schema.Trimmed.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255)
)
export type DomainName = typeof DomainName.Type

/**
 * Domain URL slug, distinct from its DNS hostname. Uses lowercase ASCII
 * letters or digits with single hyphens between groups.
 */
export const DomainSlug = Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255),
    Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
)
export type DomainSlug = typeof DomainSlug.Type

export const SocialPlatform = Schema.Literals([
    "Facebook",
    "Instagram",
    "YouTube",
    "X",
])
export type SocialPlatform = typeof SocialPlatform.Type

/**
 * Social-profile link checked by a lowercase http(s) prefix and non-whitespace
 * remainder. This pattern does not parse the URL or match its host to a platform.
 */
export const SocialProfileUrl = Schema.String.check(
    Schema.isMaxLength(2048),
    Schema.isPattern(/^https?:\/\/\S+$/)
)
export type SocialProfileUrl = typeof SocialProfileUrl.Type

export const SiteSocialLink = Schema.Struct({
    platform: SocialPlatform,
    url: SocialProfileUrl,
})
export type SiteSocialLink = typeof SiteSocialLink.Type

/**
 * Site social links, including an empty list. Repeated platforms are allowed, and
 * a URL is not required to belong to the selected platform.
 */
export const SiteSocialLinks = Schema.Array(SiteSocialLink).check(
    Schema.isMaxLength(4)
)
export type SiteSocialLinks = typeof SiteSocialLinks.Type

export const Domain = Schema.Struct({
    id: Schema.String,
    org_id: Schema.String,
    name: DomainName,
    created_by_contact_id: Schema.String,
    created_at: Schema.Date,
    updated_at: Schema.Date,
    deleted_at: Schema.optional(Schema.Date),
})
export type Domain = typeof Domain.Type

export const DomainHostnameKind = Schema.Literals(["apex", "www", "custom"])
export type DomainHostnameKind = typeof DomainHostnameKind.Type

export const DomainHostnameStatus = Schema.Literals([
    "pending_dns",
    "pending_certificate",
    "active",
    "failed",
    "disabled",
])
export type DomainHostnameStatus = typeof DomainHostnameStatus.Type

/**
 * Bare lowercase ASCII hostname containing dotted labels and an alphabetic
 * final label of at least two characters.
 * Rejects schemes, paths, ports, trailing dots, localhost and IP literals.
 * Callers must lowercase input and convert Unicode names before decoding.
 */
export const Hostname = Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(255),
    Schema.isPattern(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/)
)
export type Hostname = typeof Hostname.Type

export const DomainHostname = Schema.Struct({
    id: Schema.String,
    domain_id: Schema.String,
    hostname: Hostname,
    apex_hostname: Hostname,
    kind: DomainHostnameKind,
    status: DomainHostnameStatus,
    is_primary: Schema.Boolean,
    verification_token: Schema.String,
    verified_at: Schema.optional(Schema.Date),
    created_at: Schema.Date,
    updated_at: Schema.Date,
    deleted_at: Schema.optional(Schema.Date),
})
export type DomainHostname = typeof DomainHostname.Type

/**
 * Hostname lookup result with optional domain and redirect details. The
 * found and should_redirect booleans do not conditionally require those
 * optional fields in this schema. Consumers must handle missing details;
 * hostname and canonical_hostname are plain strings, not Hostname checks.
 */
export const DomainHostnameResolution = Schema.Struct({
    found: Schema.Boolean,
    hostname: Schema.String,
    should_redirect: Schema.Boolean,
    canonical_hostname: Schema.optional(Schema.String),
    domain_id: Schema.optional(Schema.String),
    domain_name: Schema.optional(Schema.String),
    hostname_id: Schema.optional(Schema.String),
    status: Schema.optional(DomainHostnameStatus),
})
export type DomainHostnameResolution = typeof DomainHostnameResolution.Type

export const CreateDomainInput = Schema.Struct({
    name: DomainName,
    slug: DomainSlug,
})
export type CreateDomainInput = typeof CreateDomainInput.Type

/**
 * Hostname attachment request. Decoding checks Hostname syntax; the attachment
 * operation must establish domain access and verify control of the hostname.
 */
export const CreateDomainHostnameInput = Schema.Struct({
    domain_id: Schema.String,
    hostname: Hostname,
})
export type CreateDomainHostnameInput = typeof CreateDomainHostnameInput.Type

export const SetActiveDomainInput = Schema.Struct({
    domain_id: Schema.String,
})
export type SetActiveDomainInput = typeof SetActiveDomainInput.Type

export { ConflictError, DatabaseError, NotFoundError } from "../errors.ts"
