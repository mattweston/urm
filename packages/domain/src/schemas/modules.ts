import * as Schema from "effect/Schema"

/**
 * Feature identifiers used for module enablement. SidebarItemId also includes
 * navigation destinations such as Settings that are not module switches.
 */
export const ModuleId = Schema.Literals([
    "Documents",
    "Blog",
    "Projects",
    "Shop",
    "Finance",
    "Issues",
    "Events",
    "Tags",
    "Mail",
    "Media",
    "Data",
    "Learn",
])
export type ModuleId = typeof ModuleId.Type
export const module_ids: ReadonlyArray<ModuleId> = ModuleId.literals
export const module_settings_version = 1

export const normalize_enabled_modules = (
    enabled: ReadonlyArray<ModuleId> | undefined,
    version: number | undefined
): ReadonlyArray<ModuleId> => {
    const configured = enabled ?? module_ids
    return version === module_settings_version || configured.includes("Learn")
        ? configured
        : [...configured, "Learn"]
}

export const SidebarItemId = Schema.Literals([
    "Stats",
    "Content",
    "Marketing",
    "Documents",
    "Pages",
    "Blog",
    "Design",
    "Forms",
    "Projects",
    "Shop",
    "Finance",
    "Issues",
    "Events",
    "Tags",
    "Mail",
    "Media",
    "Domains",
    "Social",
    "Chat",
    "Data",
    "Settings",
    "Labs",
    "Dev",
    "Learn",
    "Sysadmin",
])
export type SidebarItemId = typeof SidebarItemId.Type
export const sidebar_item_ids: ReadonlyArray<SidebarItemId> =
    SidebarItemId.literals

export const SidebarDividerId = Schema.String.check(
    Schema.isPattern(/^divider-[1-9][0-9]*$/),
    Schema.isMaxLength(32)
)
export type SidebarDividerId = typeof SidebarDividerId.Type
export const SidebarOrderItem = Schema.Union([SidebarItemId, SidebarDividerId])
export type SidebarOrderItem = typeof SidebarOrderItem.Type
export const max_sidebar_dividers = sidebar_item_ids.length
/**
 * Saved navigation order and hidden destinations. Despite its name,
 * hidden_modules accepts every SidebarItemId, including non-module pages.
 * Partial orders and duplicates pass decoding; normalize_sidebar_order fills
 * in missing destinations and removes duplicates before displaying the order.
 */
export const SidebarPreference = Schema.Struct({
    sidebar_order: Schema.Array(SidebarOrderItem).check(
        Schema.isMaxLength(sidebar_item_ids.length + max_sidebar_dividers),
        Schema.makeFilter(
            (items) =>
                items.filter(Schema.is(SidebarDividerId)).length <=
                    max_sidebar_dividers || "Too many sidebar dividers"
        )
    ),
    hidden_modules: Schema.Array(SidebarItemId).check(
        Schema.isMaxLength(sidebar_item_ids.length)
    ),
})
export type SidebarPreference = typeof SidebarPreference.Type
/**
 * Completes a saved sidebar order while preserving each item's first position.
 * Missing destinations are appended in sidebar_item_ids order, allowing old
 * preferences to pick up newly added pages. Learn is inserted after Dev when
 * absent so existing saved orders receive its intended default position.
 * Decode unknown IDs separately; this does not filter hidden items.
 */
export const normalize_sidebar_order = (
    order: ReadonlyArray<SidebarOrderItem>
): ReadonlyArray<SidebarOrderItem> => {
    const unique_order = [...new Set(order)]
    const dev_index = unique_order.indexOf("Dev")
    const learn_item: SidebarOrderItem = "Learn"
    const ordered =
        unique_order.includes("Learn") || dev_index === -1
            ? unique_order
            : [
                  ...unique_order.slice(0, dev_index + 1),
                  learn_item,
                  ...unique_order.slice(dev_index + 1),
              ]
    const completed = [...new Set([...ordered, ...sidebar_item_ids])].filter(
        (id) => id !== "Marketing"
    )
    const top_level = completed.filter(
        (id) => id !== "Documents" && id !== "Blog"
    )
    const content_index = top_level.indexOf("Content")
    const with_documents =
        content_index === -1
            ? [...top_level, "Documents"]
            : [
                  ...top_level.slice(0, content_index + 1),
                  "Documents",
                  ...top_level.slice(content_index + 1),
              ]
    const web_index = with_documents.indexOf("Pages")
    return web_index === -1
        ? [...with_documents, "Blog"]
        : [
              ...with_documents.slice(0, web_index + 1),
              "Blog",
              ...with_documents.slice(web_index + 1),
          ]
}
/**
 * Checks module enablement with an unrestricted default: undefined enables
 * every module, while an empty array enables none. Keep that distinction when
 * restoring optional settings; replacing absence with [] changes behavior.
 */
export const is_module_enabled = (
    enabled: ReadonlyArray<ModuleId> | undefined,
    module_id: ModuleId
): boolean => enabled === undefined || enabled.includes(module_id)
