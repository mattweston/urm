import type { Html, HtmlBuilder } from "foldkit/html"
import type { PublishedSiteLayout } from "@urm/domain/schemas/document-site-builds"
import { sceneLogoView } from "@urm/ui/foldkit/logo"
import { socialIcon } from "@urm/ui/foldkit/social-icon.view.ts"

const public_url = (value: string | null): string | undefined => {
    if (value === null) return undefined
    try {
        const url = new URL(value)
        return url.protocol === "https:" && !url.username && !url.password
            ? url.href
            : undefined
    } catch {
        return undefined
    }
}

export const renderSiteLayout = <Message>(
    layout: PublishedSiteLayout | undefined,
    path: string,
    content: Html,
    h: HtmlBuilder<Message>
): Html => {
    if (layout === undefined) return content
    const light =
        public_url(layout.logo_light_url) ?? public_url(layout.logo_dark_url)
    const dark = public_url(layout.logo_dark_url) ?? light
    const appearance = layout.theme?.appearance ?? "system"
    const site_title = h.span(
        [
            h.Class(
                layout.show_site_title === true
                    ? "site-title"
                    : "site-visually-hidden"
            ),
        ],
        [layout.name]
    )
    const brand_content =
        layout.logo_scene === undefined
            ? light === undefined
                ? [layout.name]
                : [
                      h.picture(
                          [],
                          [
                              ...(dark === undefined || appearance !== "system"
                                  ? []
                                  : [
                                        h.source([
                                            h.Attribute(
                                                "media",
                                                "(prefers-color-scheme: dark)"
                                            ),
                                            h.Srcset(dark),
                                        ]),
                                    ]),
                              h.img([
                                  h.Src(
                                      appearance === "dark"
                                          ? (dark ?? light)
                                          : light
                                  ),
                                  h.Alt(""),
                                  h.Class("site-logo"),
                              ]),
                          ]
                      ),
                      site_title,
                  ]
            : [
                  sceneLogoView({
                      scene: layout.logo_scene,
                      class: "site-logo",
                  }),
                  site_title,
              ]
    return h.div(
        [h.Class("site-layout")],
        [
            h.a(
                [h.Href("#site-content"), h.Class("site-skip")],
                ["Skip to content"]
            ),
            h.header(
                [h.Id("site-header"), h.Class("site-header")],
                [
                    h.a(
                        // oxlint-disable-next-line foldkit/no-hardcoded-route-strings -- Static releases have no client router; the brand links to the published homepage.
                        [h.Href("/"), h.Class("site-brand")],
                        brand_content
                    ),
                    h.nav(
                        [h.AriaLabel("Main navigation")],
                        layout.navigation.flatMap((item) =>
                            item.path.startsWith("/") &&
                            !item.path.startsWith("//")
                                ? [
                                      h.a(
                                          [
                                              h.Href(item.path),
                                              ...(item.path === path ||
                                              (item.path !== "/" &&
                                                  path.startsWith(item.path))
                                                  ? [h.AriaCurrent("page")]
                                                  : []),
                                          ],
                                          [item.label]
                                      ),
                                  ]
                                : []
                        )
                    ),
                ]
            ),
            h.div([h.Id("site-content"), h.Class("site-content")], [content]),
            h.footer(
                [h.Id("site-footer"), h.Class("site-footer")],
                [
                    h.span([], [layout.name]),
                    h.nav(
                        [
                            h.AriaLabel("Social links"),
                            h.Class("site-social-links"),
                        ],
                        layout.social_links.flatMap((link) => {
                            const url = public_url(link.url)
                            return url === undefined
                                ? []
                                : [
                                      h.a(
                                          [
                                              h.Href(url),
                                              h.Class("site-social-link"),
                                              h.Attribute(
                                                  "data-platform",
                                                  link.platform
                                              ),
                                              h.AriaLabel(link.platform),
                                              h.Title(link.platform),
                                              h.Rel("noopener noreferrer"),
                                          ],
                                          [socialIcon(link.platform, h)]
                                      ),
                                  ]
                        })
                    ),
                ]
            ),
        ]
    )
}
