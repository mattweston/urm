import { Schema } from "effect"
import { SiteSocialLinks } from "./schemas/domains.ts"
import { SiteAppearanceSettings } from "./schemas/site-appearance.ts"
import { SiteTitle, NavigationLabel } from "./schemas/publications.ts"

export const PublicationLayoutFields = Schema.Struct({
    ...SiteAppearanceSettings.fields,
    site_title: SiteTitle,
    show_site_title: Schema.Boolean,
    social_links: SiteSocialLinks,
    logo_light_url: Schema.NullOr(Schema.String),
    logo_dark_url: Schema.NullOr(Schema.String),
    favicon_light_url: Schema.NullOr(Schema.String),
    favicon_dark_url: Schema.NullOr(Schema.String),
})
export type PublicationLayoutFields = typeof PublicationLayoutFields.Type
export const PublicationNavigationTarget = Schema.Union([
    Schema.Struct({ _tag: Schema.Literal("page"), page_id: Schema.String }),
    Schema.Struct({
        _tag: Schema.Literal("module"),
        module_id: Schema.Literals(["blog", "events"]),
    }),
])
export const PublicationNavigationRecord = Schema.Struct({
    id: Schema.String,
    target: PublicationNavigationTarget,
    label: Schema.String,
    visible: Schema.Boolean,
    order_position: Schema.Int,
})
export type PublicationNavigationRecord =
    typeof PublicationNavigationRecord.Type
export const PublicationConfiguration = Schema.Struct({
    layout: Schema.NullOr(
        Schema.Struct({
            ...PublicationLayoutFields.fields,
            site_title: Schema.String,
        })
    ),
    navigation: Schema.Array(PublicationNavigationRecord).check(
        Schema.isMaxLength(100)
    ),
    blog_included: Schema.Boolean,
    events_included: Schema.optional(Schema.Boolean),
})
export type PublicationConfiguration = typeof PublicationConfiguration.Type
export const PublicationConfigurationRecord = Schema.Struct({
    id: Schema.String,
    ...PublicationConfiguration.fields,
})
export const PublicationConfigurationAction = Schema.Union([
    Schema.Struct({
        _tag: Schema.Literal("save_layout"),
        ...PublicationLayoutFields.fields,
    }),
    Schema.Struct({ _tag: Schema.Literal("initialize_navigation") }),
    Schema.Struct({
        _tag: Schema.Literal("save_navigation"),
        ...PublicationNavigationRecord.fields,
        label: NavigationLabel,
    }),
    Schema.Struct({
        _tag: Schema.Literal("remove_navigation"),
        id: Schema.String,
    }),
    Schema.Struct({
        _tag: Schema.Literal("reorder_navigation"),
        ids: Schema.Array(Schema.String).check(Schema.isMaxLength(100)),
    }),
    Schema.Struct({
        _tag: Schema.Literal("save_module"),
        module_id: Schema.Literals(["blog", "events"]),
        included: Schema.Boolean,
    }),
])
export type PublicationConfigurationAction =
    typeof PublicationConfigurationAction.Type
export class PublicationConfigurationError extends Schema.TaggedError<PublicationConfigurationError>()(
    "PublicationConfigurationError",
    { message: Schema.String }
) {}

/** Preserve explicit navigation order and visibility, prune missing pages, and append new page targets. */
export const synchronize_publication_navigation = (
    navigation: ReadonlyArray<PublicationNavigationRecord>,
    pages: ReadonlyArray<
        Pick<
            import("./pages.ts").PageRecord,
            "id" | "content_type" | "show_in_navigation" | "navigation_label"
        >
    >,
    new_id: () => string
): ReadonlyArray<PublicationNavigationRecord> => {
    const eligible = pages.filter(
        (page) => page.content_type !== "landing_json"
    )
    const retained = navigation.filter(
        (item) =>
            item.target._tag !== "page" ||
            eligible.some(
                (page) =>
                    item.target._tag === "page" &&
                    item.target.page_id === page.id
            )
    )
    const missing: ReadonlyArray<PublicationNavigationRecord> = eligible
        .filter(
            (page) =>
                page.show_in_navigation &&
                !retained.some(
                    (item) =>
                        item.target._tag === "page" &&
                        item.target.page_id === page.id
                )
        )
        .map((page) => ({
            id: new_id(),
            target: { _tag: "page", page_id: page.id },
            label: page.navigation_label,
            visible: true,
            order_position: 0,
        }))
    return [...retained, ...missing].map((item, order_position) => ({
        ...item,
        order_position,
    }))
}
