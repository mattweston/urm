import type { Html, HtmlBuilder } from "foldkit/html"

import {
    ContentKind,
    TemplateCapability,
    TemplateProvenance,
    authoring_templates,
    content_templates,
    template_replacement,
    type ContentTemplate,
    type OrganizationTemplateSummary,
} from "./catalog.ts"
import {
    CatalogCategory,
    type CatalogFilters,
    catalog_filter_href,
    catalog_filters_for_search,
    filter_content_templates,
    filter_organization_templates,
} from "./filter.ts"
import {
    ContentDocumentsRoute,
    ContentItemRoute,
    ContentNewRoute,
    ContentNotFoundRoute,
    ContentTemplatesRoute,
    content_new_href,
    content_templates_href,
    route_for_path,
} from "./route.ts"
import { templateById as email_template_by_id } from "../mail/templates/template-views.ts"

const badge = <Message>(label: string, h: HtmlBuilder<Message>): Html =>
    h.span(
        [
            h.Class(
                "rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
            ),
        ],
        [label]
    )

type FilterOption = Readonly<{
    label: string
    href: string
    active: boolean
}>

const filter_label = (value: string): string =>
    value
        .split("_")
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ")

const filter_group = <Message>(
    label: string,
    options: ReadonlyArray<FilterOption>,
    h: HtmlBuilder<Message>
): Html =>
    h.div(
        [h.Class("grid gap-2")],
        [
            h.h3([h.Class("text-sm font-semibold text-foreground")], [label]),
            h.ul(
                [h.Class("flex list-none flex-wrap gap-2 p-0"), h.Role("list")],
                options.map((option) =>
                    h.li(
                        [],
                        [
                            h.a(
                                [
                                    h.Href(option.href),
                                    ...(option.active
                                        ? [h.AriaCurrent("true")]
                                        : []),
                                    h.Class(
                                        option.active
                                            ? "inline-flex min-h-10 items-center rounded-full border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                            : "inline-flex min-h-10 items-center rounded-full border border-border bg-background px-3 text-sm text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                    ),
                                ],
                                [option.label]
                            ),
                        ]
                    )
                )
            ),
        ]
    )

const catalog_filters_view = <Message>(
    pathname: string,
    filters: CatalogFilters,
    available_tags: ReadonlyArray<string>,
    h: HtmlBuilder<Message>
): Html => {
    const all_option = (
        next_filters: CatalogFilters,
        active: boolean
    ): FilterOption => ({
        label: "All",
        href: catalog_filter_href(pathname, next_filters),
        active,
    })
    const kind_options: ReadonlyArray<FilterOption> = [
        all_option(
            { ...filters, content_kind: null },
            filters.content_kind === null
        ),
        ...ContentKind.literals.map((content_kind) => ({
            label: filter_label(content_kind),
            href: catalog_filter_href(pathname, { ...filters, content_kind }),
            active: filters.content_kind === content_kind,
        })),
    ]
    const category_options: ReadonlyArray<FilterOption> = [
        all_option({ ...filters, category: null }, filters.category === null),
        ...CatalogCategory.literals.map((category) => ({
            label: category,
            href: catalog_filter_href(pathname, { ...filters, category }),
            active: filters.category === category,
        })),
    ]
    const provenance_options: ReadonlyArray<FilterOption> = [
        all_option(
            { ...filters, provenance: null },
            filters.provenance === null
        ),
        ...TemplateProvenance.literals.map((provenance) => ({
            label: filter_label(provenance),
            href: catalog_filter_href(pathname, { ...filters, provenance }),
            active: filters.provenance === provenance,
        })),
    ]
    const capability_options: ReadonlyArray<FilterOption> = [
        all_option(
            { ...filters, capability: null },
            filters.capability === null
        ),
        ...TemplateCapability.literals.map((capability) => ({
            label: filter_label(capability),
            href: catalog_filter_href(pathname, { ...filters, capability }),
            active: filters.capability === capability,
        })),
    ]
    const tag_options: ReadonlyArray<FilterOption> = [
        all_option({ ...filters, tag: null }, filters.tag === null),
        ...available_tags.map((tag) => ({
            label: tag,
            href: catalog_filter_href(pathname, { ...filters, tag }),
            active:
                filters.tag?.toLocaleLowerCase() === tag.toLocaleLowerCase(),
        })),
    ]
    const hidden_filter = (
        name: string,
        value: string | null
    ): ReadonlyArray<Html> =>
        value === null || value === ""
            ? []
            : [h.input([h.Type("hidden"), h.Name(name), h.Value(value)])]

    return h.section(
        [
            h.Class(
                "grid gap-4 rounded-[var(--radius-surface)] border border-border bg-card p-5 text-card-foreground"
            ),
        ],
        [
            h.div(
                [h.Class("flex flex-wrap items-center justify-between gap-3")],
                [
                    h.h2([h.Class("text-lg font-semibold")], ["Filters"]),
                    h.a(
                        [
                            h.Href(pathname),
                            h.Class(
                                "text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            ),
                        ],
                        ["Clear filters"]
                    ),
                ]
            ),
            h.form(
                [
                    h.Attribute("action", pathname),
                    h.Attribute("method", "get"),
                    h.Class("grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"),
                ],
                [
                    ...hidden_filter("kind", filters.content_kind),
                    ...hidden_filter("category", filters.category),
                    ...hidden_filter("provenance", filters.provenance),
                    ...hidden_filter("capability", filters.capability),
                    ...hidden_filter("tag", filters.tag),
                    h.label(
                        [
                            h.For("content-template-search"),
                            h.Class("grid gap-1 text-sm font-medium"),
                        ],
                        [
                            "Search templates",
                            h.input([
                                h.Id("content-template-search"),
                                h.Name("q"),
                                h.Type("search"),
                                h.Value(filters.query),
                                h.Maxlength(100),
                                h.Attribute(
                                    "placeholder",
                                    "Name, description, category, or tag"
                                ),
                                h.Class(
                                    "min-h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                ),
                            ]),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("submit"),
                            h.Class(
                                "min-h-10 self-end rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            ),
                        ],
                        ["Search"]
                    ),
                ]
            ),
            filter_group("Content kind", kind_options, h),
            filter_group("Category", category_options, h),
            filter_group("Provenance", provenance_options, h),
            filter_group("Capability", capability_options, h),
            ...(available_tags.length === 0
                ? []
                : [filter_group("Tags", tag_options, h)]),
        ]
    )
}

const template_card = <Message>(
    template: ContentTemplate,
    h: HtmlBuilder<Message>
): Html => {
    const deprecation =
        template.provenance === "builtin" ? template.deprecation : undefined
    const replacement = template_replacement(template, content_templates)
    const content = [
        h.div(
            [h.Class("flex flex-wrap items-center gap-2")],
            [
                badge(template.category, h),
                badge(template.capability, h),
                badge(template.provenance, h),
                ...(deprecation === undefined ? [] : [badge("Deprecated", h)]),
            ]
        ),
        h.h3(
            [h.Class("mt-4 text-lg font-semibold text-foreground")],
            [template.name]
        ),
        h.p(
            [h.Class("mt-2 text-sm leading-relaxed text-muted-foreground")],
            [template.description]
        ),
        ...(deprecation === undefined
            ? []
            : [
                  h.p(
                      [h.Class("mt-2 text-sm text-muted-foreground")],
                      [`${deprecation.reason} Existing drafts are unchanged.`]
                  ),
              ]),
        ...(template.tags.length === 0
            ? []
            : [
                  h.div(
                      [h.Class("mt-3 flex flex-wrap gap-2")],
                      template.tags.map((tag) => badge(tag, h))
                  ),
              ]),
        h.p(
            [h.Class("mt-4 text-xs text-muted-foreground")],
            [`${template.template_id} · version ${template.template_version}`]
        ),
    ]

    const link_class =
        "inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-border px-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    const actions = [
        ...(replacement?.creation_href == null
            ? []
            : [
                  h.a(
                      [h.Href(replacement.creation_href), h.Class(link_class)],
                      [`Use replacement: ${replacement.name}`]
                  ),
              ]),
        ...(template.creation_href === null
            ? []
            : [
                  h.a(
                      [
                          h.Href(template.creation_href),
                          h.Class(link_class),
                          h.AriaLabel(
                              deprecation === undefined
                                  ? `Use ${template.name} template`
                                  : `Use deprecated ${template.name} template`
                          ),
                      ],
                      [
                          deprecation === undefined
                              ? "Use template"
                              : "Use deprecated template",
                      ]
                  ),
              ]),
        ...(template.preview_href === null
            ? []
            : [
                  h.a(
                      [
                          h.Href(template.preview_href),
                          h.Class(link_class),
                          h.AriaLabel(`Preview ${template.name}`),
                      ],
                      ["Preview"]
                  ),
              ]),
    ]

    return h.li(
        [h.Class("min-w-0")],
        [
            h.article(
                [
                    h.Class(
                        "flex h-full flex-col rounded-[var(--radius-surface)] border border-border bg-card p-5 text-card-foreground"
                    ),
                ],
                [
                    ...content,
                    ...(actions.length === 0
                        ? [
                              h.p(
                                  [h.Class("mt-4 text-sm font-medium")],
                                  ["Planned"]
                              ),
                          ]
                        : [
                              h.div(
                                  [h.Class("mt-4 flex flex-wrap gap-2 pt-1")],
                                  actions
                              ),
                          ]),
                ]
            ),
        ]
    )
}

const template_grid = <Message>(
    templates: ReadonlyArray<ContentTemplate>,
    h: HtmlBuilder<Message>
): Html =>
    h.ul(
        [
            h.Class("grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"),
            h.Role("list"),
        ],
        templates.map((template) => template_card(template, h))
    )

const organization_template_card = <TemplateId extends string, Message>(
    template: OrganizationTemplateSummary<TemplateId>,
    on_use_template: (
        template: OrganizationTemplateSummary<TemplateId>
    ) => Message,
    h: HtmlBuilder<Message>
): Html =>
    h.keyed("li")(
        template.template_id,
        [h.Class("min-w-0")],
        [
            h.article(
                [
                    h.Class(
                        "grid h-full gap-4 rounded-[var(--radius-surface)] border border-border bg-card p-5 text-card-foreground"
                    ),
                ],
                [
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-2")],
                        [
                            badge(template.category, h),
                            badge("authoring", h),
                            badge("organization", h),
                        ]
                    ),
                    h.div(
                        [h.Class("grid gap-2")],
                        [
                            h.h3(
                                [h.Class("text-lg font-semibold")],
                                [template.name]
                            ),
                            h.p(
                                [
                                    h.Class(
                                        "text-sm leading-relaxed text-muted-foreground"
                                    ),
                                ],
                                [template.description]
                            ),
                            ...(template.tags.length === 0
                                ? []
                                : [
                                      h.div(
                                          [h.Class("flex flex-wrap gap-2")],
                                          template.tags.map((tag) =>
                                              badge(tag, h)
                                          )
                                      ),
                                  ]),
                            h.p(
                                [h.Class("text-xs text-muted-foreground")],
                                [
                                    `${template.block_count} ${template.block_count === 1 ? "block" : "blocks"} · revision ${template.revision}`,
                                ]
                            ),
                        ]
                    ),
                    h.button(
                        [
                            h.Type("button"),
                            h.OnClick(on_use_template(template)),
                            h.Class(
                                "min-h-10 w-fit rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            ),
                            h.AriaLabel(
                                `Create ${template.content_kind} content from ${template.name}`
                            ),
                        ],
                        ["Use template"]
                    ),
                ]
            ),
        ]
    )

const organization_template_grid = <TemplateId extends string, Message>(
    templates: ReadonlyArray<OrganizationTemplateSummary<TemplateId>>,
    on_use_template: (
        template: OrganizationTemplateSummary<TemplateId>
    ) => Message,
    h: HtmlBuilder<Message>
): Html =>
    templates.length === 0
        ? h.p(
              [
                  h.Class(
                      "rounded-[var(--radius-surface)] border border-dashed border-border p-6 text-sm text-muted-foreground"
                  ),
              ],
              [
                  "No organization templates yet. Save authoring content as a template to make it available here.",
              ]
          )
        : h.ul(
              [
                  h.Class(
                      "grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
                  ),
                  h.Role("list"),
              ],
              templates.map((template) =>
                  organization_template_card(template, on_use_template, h)
              )
          )

const template_section = <Message>(
    title: string,
    description: string,
    templates: ReadonlyArray<ContentTemplate>,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [h.Class("grid gap-4")],
        [
            h.div(
                [h.Class("grid gap-1")],
                [
                    h.h2([h.Class("text-xl font-semibold")], [title]),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [description]
                    ),
                ]
            ),
            template_grid(templates, h),
        ]
    )

const organization_template_section = <TemplateId extends string, Message>(
    templates: ReadonlyArray<OrganizationTemplateSummary<TemplateId>>,
    on_use_template: (
        template: OrganizationTemplateSummary<TemplateId>
    ) => Message,
    h: HtmlBuilder<Message>
): Html =>
    h.section(
        [h.Class("grid gap-4")],
        [
            h.div(
                [h.Class("grid gap-1")],
                [
                    h.h2(
                        [h.Class("text-xl font-semibold")],
                        ["Organization templates"]
                    ),
                    h.p(
                        [h.Class("text-sm text-muted-foreground")],
                        [
                            "Reusable authoring templates available across this organization.",
                        ]
                    ),
                ]
            ),
            organization_template_grid(templates, on_use_template, h),
        ]
    )

const page_header = <Message>(
    eyebrow: string,
    title: string,
    description: string,
    h: HtmlBuilder<Message>
): Html =>
    h.header(
        [h.Class("grid gap-2 border-b border-border pb-6")],
        [
            h.p(
                [
                    h.Class(
                        "text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
                    ),
                ],
                [eyebrow]
            ),
            h.h1(
                [
                    h.Class(
                        "text-2xl font-semibold tracking-tight text-foreground"
                    ),
                ],
                [title]
            ),
            h.p(
                [
                    h.Class(
                        "max-w-2xl text-sm leading-relaxed text-muted-foreground"
                    ),
                ],
                [description]
            ),
        ]
    )

const result_summary = <Message>(
    count: number,
    h: HtmlBuilder<Message>
): Html =>
    h.p(
        [h.Class("text-sm text-muted-foreground"), h.Role("status")],
        [`${count} ${count === 1 ? "template" : "templates"}`]
    )

const no_results = <Message>(h: HtmlBuilder<Message>): Html =>
    h.p(
        [
            h.Class(
                "rounded-[var(--radius-surface)] border border-dashed border-border p-6 text-sm text-muted-foreground"
            ),
        ],
        ["No templates match these filters."]
    )

const template_catalog_return_href = (search: string): string => {
    const parameters = new URLSearchParams(search)
    parameters.delete("preview")
    const query = parameters.toString()
    return `/content/templates${query === "" ? "" : `?${query}`}`
}

const email_template_preview = <Message>(
    search: string,
    h: HtmlBuilder<Message>
): ReadonlyArray<Html> | null => {
    const preview_id = new URLSearchParams(search).get("preview")
    if (preview_id === null) return null
    const template = email_template_by_id(preview_id)
    if (template === null) return null
    const catalog_template = content_templates.find((candidate) => {
        if (
            candidate.capability === "transactional" &&
            preview_id ===
                `production-${candidate.template_id.slice("email.".length)}`
        )
            return true
        if (candidate.preview_href === null) return false
        return (
            new URL(
                candidate.preview_href,
                "https://urm.test"
            ).searchParams.get("preview") === preview_id
        )
    })
    const is_authoring = catalog_template?.capability === "authoring"

    return [
        h.a(
            [
                h.Href(template_catalog_return_href(search)),
                h.Class(
                    "inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                ),
            ],
            ["Back to templates"]
        ),
        page_header(
            "Content / Templates",
            template.name,
            is_authoring
                ? `${template.category} email preview. This example has a validated authoring document and can start a new editable draft.`
                : catalog_template?.capability === "transactional"
                  ? "System email preview with sample recipient details and links. Managed under Mail > Transactional."
                  : `${template.category} email preview. This hardcoded example is not editable until it has a validated authoring document.`,
            h
        ),
        ...(catalog_template?.capability === "transactional" &&
        catalog_template.preview_href !== null
            ? [
                  h.a(
                      [
                          h.Href(catalog_template.preview_href),
                          h.Class(
                              "inline-flex min-h-10 items-center text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          ),
                      ],
                      ["Open in Transactional emails"]
                  ),
              ]
            : []),
        ...(is_authoring && catalog_template.creation_href !== null
            ? [
                  h.a(
                      [
                          h.Href(catalog_template.creation_href),
                          h.Class(
                              "inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-border bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          ),
                          h.AriaLabel(`Use ${catalog_template.name} template`),
                      ],
                      ["Use this template"]
                  ),
              ]
            : []),
        h.section(
            [
                h.Attribute("aria-label", `${template.name} email preview`),
                h.Class(
                    "overflow-auto rounded-[var(--radius-surface)] border border-border bg-background p-4 [box-shadow:var(--shadow-surface)] sm:p-6"
                ),
            ],
            [template.view()]
        ),
    ]
}

export const view = <TemplateId extends string, Message>(
    pathname: string,
    search: string,
    organization_templates: ReadonlyArray<
        OrganizationTemplateSummary<TemplateId>
    >,
    on_use_organization_template: (
        template: OrganizationTemplateSummary<TemplateId>
    ) => Message,
    h: HtmlBuilder<Message>
): Html => {
    const route = route_for_path(pathname)
    const filters = catalog_filters_for_search(search)
    const filtered_authoring_templates = filter_content_templates(
        authoring_templates,
        filters
    )
    const filtered_content_templates = filter_content_templates(
        content_templates,
        filters
    )
    const filtered_organization_templates = filter_organization_templates(
        organization_templates,
        filters
    )
    const organization_template_count = filtered_organization_templates.length
    const maybe_email_preview =
        route === ContentTemplatesRoute
            ? email_template_preview(search, h)
            : null
    const available_tags = Array.from(
        new Set(
            [...content_templates, ...organization_templates].flatMap(
                (template) => template.tags
            )
        )
    ).sort((left, right) => left.localeCompare(right))
    const content =
        maybe_email_preview !== null
            ? maybe_email_preview
            : route === ContentNewRoute
              ? [
                    page_header(
                        "Content",
                        "Create content",
                        "Choose a typed starting point. Existing editors remain responsible for their target-specific fields and publication workflow.",
                        h
                    ),
                    catalog_filters_view(pathname, filters, available_tags, h),
                    result_summary(
                        filtered_authoring_templates.length +
                            organization_template_count,
                        h
                    ),
                    ...(filtered_authoring_templates.length === 0
                        ? []
                        : [
                              template_section(
                                  "Built-in starting points",
                                  "Create a draft through the target's existing typed editor.",
                                  filtered_authoring_templates,
                                  h
                              ),
                          ]),
                    ...(organization_template_count > 0
                        ? [
                              organization_template_section(
                                  filtered_organization_templates,
                                  on_use_organization_template,
                                  h
                              ),
                          ]
                        : []),
                    ...(filtered_authoring_templates.length === 0 &&
                    organization_template_count === 0
                        ? [no_results(h)]
                        : []),
                ]
              : route === ContentTemplatesRoute
                ? [
                      page_header(
                          "Content",
                          "Templates",
                          "Built-in authoring starters and controlled delivery templates in the current content pipeline.",
                          h
                      ),
                      catalog_filters_view(
                          pathname,
                          filters,
                          available_tags,
                          h
                      ),
                      result_summary(
                          filtered_content_templates.length +
                              organization_template_count,
                          h
                      ),
                      ...(filtered_content_templates.length === 0
                          ? []
                          : [
                                template_section(
                                    "Built-in templates",
                                    "Versioned authoring starters and controlled system renderers.",
                                    filtered_content_templates,
                                    h
                                ),
                            ]),
                      ...(organization_template_count > 0
                          ? [
                                organization_template_section(
                                    filtered_organization_templates,
                                    on_use_organization_template,
                                    h
                                ),
                            ]
                          : []),
                      ...(filtered_content_templates.length === 0 &&
                      organization_template_count === 0
                          ? [no_results(h)]
                          : []),
                  ]
                : route === ContentDocumentsRoute
                  ? [
                        page_header(
                            "Content",
                            "Internal documents",
                            "Private shared documents use the Content Studio without entering website builds.",
                            h
                        ),
                        h.section(
                            [
                                h.Class(
                                    "rounded-[var(--radius-surface)] border border-border bg-card p-6 text-card-foreground"
                                ),
                            ],
                            [
                                h.h2(
                                    [h.Class("text-lg font-semibold")],
                                    ["Document workspace"]
                                ),
                                h.p(
                                    [
                                        h.Class(
                                            "mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground"
                                        ),
                                    ],
                                    [
                                        "Create, edit, and preview organization-wide rich-text documents from this workspace.",
                                    ]
                                ),
                            ]
                        ),
                    ]
                  : route === ContentNotFoundRoute || route === ContentItemRoute
                    ? [
                          page_header(
                              "Content",
                              "Content route not found",
                              "Use the content library to choose a supported creation or template route.",
                              h
                          ),
                      ]
                    : [
                          page_header(
                              "Content",
                              "Content library",
                              "Create and manage authored artifacts across Web, Blog, Mail, Social, Forms, and internal documents.",
                              h
                          ),
                          h.nav(
                              [h.AriaLabel("Content actions")],
                              [
                                  h.ul(
                                      [
                                          h.Class(
                                              "grid list-none gap-4 p-0 sm:grid-cols-2"
                                          ),
                                          h.Role("list"),
                                      ],
                                      [
                                          h.li(
                                              [],
                                              [
                                                  h.a(
                                                      [
                                                          h.Href(
                                                              content_new_href()
                                                          ),
                                                          h.Class(
                                                              "block rounded-[var(--radius-surface)] border border-border bg-card p-5 text-card-foreground hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                                          ),
                                                      ],
                                                      [
                                                          h.h2(
                                                              [
                                                                  h.Class(
                                                                      "text-lg font-semibold"
                                                                  ),
                                                              ],
                                                              ["Create content"]
                                                          ),
                                                          h.p(
                                                              [
                                                                  h.Class(
                                                                      "mt-2 text-sm text-muted-foreground"
                                                                  ),
                                                              ],
                                                              [
                                                                  "Choose a content kind and compatible authoring template.",
                                                              ]
                                                          ),
                                                      ]
                                                  ),
                                              ]
                                          ),
                                          h.li(
                                              [],
                                              [
                                                  h.a(
                                                      [
                                                          h.Href(
                                                              content_templates_href()
                                                          ),
                                                          h.Class(
                                                              "block rounded-[var(--radius-surface)] border border-border bg-card p-5 text-card-foreground hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                                          ),
                                                      ],
                                                      [
                                                          h.h2(
                                                              [
                                                                  h.Class(
                                                                      "text-lg font-semibold"
                                                                  ),
                                                              ],
                                                              [
                                                                  "Browse templates",
                                                              ]
                                                          ),
                                                          h.p(
                                                              [
                                                                  h.Class(
                                                                      "mt-2 text-sm text-muted-foreground"
                                                                  ),
                                                              ],
                                                              [
                                                                  "See authoring starters, delivery layouts, and transactional system templates.",
                                                              ]
                                                          ),
                                                      ]
                                                  ),
                                              ]
                                          ),
                                      ]
                                  ),
                              ]
                          ),
                      ]

    return h.main(
        [
            h.Class(
                "mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:px-8"
            ),
        ],
        content
    )
}
