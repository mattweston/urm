import { Schema } from "effect"
import {
    PublishedSitePage,
    SiteReleaseSnapshot,
} from "@urm/domain/schemas/document-site-builds"

export const PublishedPage = PublishedSitePage
export type PublishedPage = typeof PublishedPage.Type

export const ReleaseSnapshot = SiteReleaseSnapshot
export type ReleaseSnapshot = typeof ReleaseSnapshot.Type

export const decodeReleaseSnapshot = Schema.decodeUnknownEffect(ReleaseSnapshot)
