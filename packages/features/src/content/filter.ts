import { Option, Schema as S } from "effect"
import { ContentTemplateCategory } from "@urm/domain/schemas/content-templates"

import {
    ContentKind,
    type ContentTemplate,
    type OrganizationTemplateSummary,
    TemplateCapability,
    TemplateProvenance,
} from "./catalog.ts"

export const CatalogCategory = ContentTemplateCategory
export type CatalogCategory = typeof CatalogCategory.Type

export const CatalogFilters = S.Struct({
    content_kind: S.NullOr(ContentKind),
    category: S.NullOr(CatalogCategory),
    provenance: S.NullOr(TemplateProvenance),
    capability: S.NullOr(TemplateCapability),
    query: S.String,
    tag: S.NullOr(S.String),
})
export type CatalogFilters = typeof CatalogFilters.Type

export const empty_catalog_filters = (): CatalogFilters => ({
    content_kind: null,
    category: null,
    provenance: null,
    capability: null,
    query: "",
    tag: null,
})

const normalized_parameter = (
    value: string | null,
    maximum_length: number
): string => (value ?? "").trim().slice(0, maximum_length)

export const catalog_filters_for_search = (search: string): CatalogFilters => {
    const parameters = new URLSearchParams(search.replace(/^\?/, ""))
    return {
        content_kind: Option.getOrNull(
            S.decodeUnknownOption(ContentKind)(parameters.get("kind"))
        ),
        category: Option.getOrNull(
            S.decodeUnknownOption(CatalogCategory)(parameters.get("category"))
        ),
        provenance: Option.getOrNull(
            S.decodeUnknownOption(TemplateProvenance)(
                parameters.get("provenance")
            )
        ),
        capability: Option.getOrNull(
            S.decodeUnknownOption(TemplateCapability)(
                parameters.get("capability")
            )
        ),
        query: normalized_parameter(parameters.get("q"), 100),
        tag: (() => {
            const tag = normalized_parameter(parameters.get("tag"), 40)
            return tag === "" ? null : tag
        })(),
    }
}

export const catalog_filter_href = (
    pathname: string,
    filters: CatalogFilters
): string => {
    const parameters = new URLSearchParams()
    if (filters.content_kind !== null)
        parameters.set("kind", filters.content_kind)
    if (filters.category !== null) parameters.set("category", filters.category)
    if (filters.provenance !== null)
        parameters.set("provenance", filters.provenance)
    if (filters.capability !== null)
        parameters.set("capability", filters.capability)
    if (filters.query !== "") parameters.set("q", filters.query)
    if (filters.tag !== null) parameters.set("tag", filters.tag)
    const search = parameters.toString()
    return search === "" ? pathname : `${pathname}?${search}`
}

type SearchableTemplate = Readonly<{
    template_id: string
    content_kind: ContentKind
    name: string
    description: string
    category: string
    tags: ReadonlyArray<string>
    provenance: typeof TemplateProvenance.Type
    capability: typeof TemplateCapability.Type
}>

const template_matches = (
    template: SearchableTemplate,
    filters: CatalogFilters
): boolean => {
    const query = filters.query.toLocaleLowerCase()
    const searchable_text = [
        template.template_id,
        template.name,
        template.description,
        template.category,
        ...template.tags,
    ]
        .join(" ")
        .toLocaleLowerCase()
    return (
        (filters.content_kind === null ||
            template.content_kind === filters.content_kind) &&
        (filters.category === null || template.category === filters.category) &&
        (filters.provenance === null ||
            template.provenance === filters.provenance) &&
        (filters.capability === null ||
            template.capability === filters.capability) &&
        (filters.tag === null ||
            template.tags.some(
                (tag) =>
                    tag.toLocaleLowerCase() === filters.tag?.toLocaleLowerCase()
            )) &&
        (query === "" || searchable_text.includes(query))
    )
}

export const filter_content_templates = (
    templates: ReadonlyArray<ContentTemplate>,
    filters: CatalogFilters
): ReadonlyArray<ContentTemplate> =>
    templates.filter((template) => template_matches(template, filters))

export const filter_organization_templates = <TemplateId extends string>(
    templates: ReadonlyArray<OrganizationTemplateSummary<TemplateId>>,
    filters: CatalogFilters
): ReadonlyArray<OrganizationTemplateSummary<TemplateId>> =>
    templates.filter((template) => template_matches(template, filters))
