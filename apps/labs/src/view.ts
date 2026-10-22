import { search_bar_href } from "./search/search-bar/submodel.ts"
import { query_sync_table_href } from "./routing/query-sync-table/submodel.ts"
import { cuelume_href } from "./media/audio/cuelume/submodel.ts"
import { variable_fonts_href } from "./typography/variable-fonts/submodel.ts"
import { dom_depth_href } from "./design/dom-depth-visualizer/submodel.ts"
import { slow_warnings_href } from "./sysadmin/slow-warnings/submodel.ts"
import { breach_check_href } from "./auth/breach-check/submodel.ts"
import { otp_field_href } from "./auth/otp-field/submodel.ts"
import { music_notation_href } from "./media/music-notation/submodel.ts"
import { view as charts_view } from "@urm/features/labs/charts"
import * as FinanceChart from "@urm/features/labs/finance/chart"
import { invoice_href } from "@urm/features/labs/finance/invoice"
import type { Html, HtmlBuilder } from "foldkit/html"
import { embed_href } from "./media/youtube-embed/submodel.ts"
import { gallery_href as gallery_transitions_href } from "./media/gallery-view-transitions/submodel.ts"
import { gallery_href } from "./media/3d-gallery/submodel.ts"
import { index_href } from "./ui/catalog.ts"
import { labsMapHref } from "./routing/route.ts"
import * as AutoGridLab from "@urm/features/labs/layout/auto-grid"
import * as ConditionalGridLab from "@urm/features/labs/layout/conditional-grid"
import * as FlexFormLab from "@urm/features/labs/layout/flex-form"
import * as FukolGridLab from "@urm/features/labs/layout/fukol-grid"
import * as CtScanLab from "@urm/features/labs/performance/ct-scan"
import * as GridBuilderLab from "@urm/features/labs/design/grid-builder"
import * as PropGridLab from "@urm/features/labs/design/prop-grid"
import * as UrmcssLab from "@urm/features/labs/design/urmcss"
import { landingEditorHref } from "@urm/features/marketing/landing"

export const view = <Message>(
    h: HtmlBuilder<Message>,
    path = "/labs"
): Html => {
    const normalized_path = path.replace(/\/$/, "")
    if (AutoGridLab.is_auto_grid_path(path)) return AutoGridLab.view(h)
    if (ConditionalGridLab.is_conditional_grid_path(path))
        return ConditionalGridLab.view(h)
    if (FukolGridLab.is_fukol_grid_path(path)) return FukolGridLab.view(h)
    if (FinanceChart.is_chart_path(path)) return FinanceChart.view(h)
    if (UrmcssLab.is_urmcss_path(path)) return UrmcssLab.view(h)
    if (
        normalized_path === "/labs/stats/charts" ||
        normalized_path === "/labs/charts"
    ) {
        return h.div(
            [h.Class("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8")],
            [charts_view()]
        )
    }
    return h.section(
        [h.Class("mx-auto max-w-3xl space-y-4 px-6 py-10")],
        [
            h.h1([h.Class("text-2xl font-semibold")], ["Labs"]),
            h.p(
                [h.Class("text-muted-foreground")],
                ["Explore experimental features."]
            ),
            h.a(
                [
                    h.Href(landingEditorHref()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Marketing / Landing"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        ["Preview and edit the URM marketing landing page."]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(UrmcssLab.urmcss_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Design / URMCSS"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Explore a staged migration from Tailwind presentation to colocated URMCSS, beginning with Foldkit UI.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(GridBuilderLab.grid_builder_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Design / Grid Builder"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Build a responsive bento grid driven by item count and container shape.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(PropGridLab.prop_grid_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Design / Prop Grid"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Compare the four justify-items values in a live grid.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(CtScanLab.ct_scan_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Performance / CT Scan"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Expose document-head ordering and render-blocking resource issues with CSS Wizardry's diagnostic stylesheet.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(ConditionalGridLab.conditional_grid_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Layout / Conditional Grid"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Compare auto-fit grid behavior with one through five items.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(AutoGridLab.auto_grid_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Layout / Auto Grid"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Let an ordinary grid create responsive columns without breakpoints.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(FukolGridLab.fukol_grid_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Layout / Fukol Grid"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Use flex growth and a minimum basis to wrap columns without breakpoints.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(FlexFormLab.flexFormHref()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Layout / Flex Form"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Wrap form controls responsively using flexible minimum widths without breakpoints.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(search_bar_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Search / Search Bar"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Find and open pages from the same search used in the header.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(query_sync_table_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Routing / Query Sync Table"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Keep table search, filters, and sorting in a shareable URL.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(invoice_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Finance / Invoice"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Edit invoice details and line items with a live email preview.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(FinanceChart.chart_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Finance / Chart"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Monthly income, expenses, and net results using fictional demo data.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href("/labs/data/spreadsheets"),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Data / Spreadsheets"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Explore the freeform spreadsheet with basic formulas and browser storage.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href("/labs/settings/services-canvas"),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Settings / Services Canvas"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Arrange connected services on a canvas with pan, zoom, and layout history.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href("/labs/stats/charting"),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Stats / Charting"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Interactive ECharts with live package and repository telemetry.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href("/labs/stats/charts"),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Stats / Charts"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Area, bar, line, and timeseries demos using illustrative data.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(embed_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Media / YouTube Embed"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Preview a video, control playback, and inspect player events.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(gallery_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Media / 3D Gallery"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Explore artworks in 3D or browse the list, then edit images and details.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(cuelume_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Media / Audio / Cuelume"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Preview interaction sounds with mute and volume controls.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(variable_fonts_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Typography / Variable Fonts"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Explore font weight axes, named instances, and variable versus static fonts.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(dom_depth_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Design / DOM Depth Visualizer"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Toggle colored outlines to inspect DOM nesting depth.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(slow_warnings_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Sysadmin / Slow Warnings"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Trigger slow update, view, patch, and subscription workloads and inspect their warnings.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(breach_check_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Auth / Email breach checker"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        ["Check email addresses against Have I Been Pwned."]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(otp_field_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Auth / OTP Field"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Try a six-character one-time password field with grouped input slots.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(music_notation_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Media / Music Notation"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Explore sheet music examples, audio playback, and guitar tablature.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(gallery_transitions_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2(
                        [h.Class("font-semibold")],
                        ["Media / Gallery View Transitions"]
                    ),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Browse a masonry photo gallery with animated fullscreen image details.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(index_href()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["UI"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Component demos, selection submodels, animation, and virtual lists.",
                        ]
                    ),
                ]
            ),
            h.a(
                [
                    h.Href(labsMapHref()),
                    h.Class(
                        "block rounded border border-border p-5 hover:bg-accent"
                    ),
                ],
                [
                    h.h2([h.Class("font-semibold")], ["Events / Map"]),
                    h.p(
                        [h.Class("mt-2 text-sm text-muted-foreground")],
                        [
                            "Interactive maps, locations, journeys, isochrones, stories, and weather.",
                        ]
                    ),
                ]
            ),
        ]
    )
}
