import type { Html, HtmlBuilder } from "foldkit/html"

import { IconPencil } from "@urm/ui/foldkit/icons/view.ts"
import { socialIcon } from "@urm/ui/foldkit/social-icon.view.ts"

import {
    ChangedSocialLinkUrl,
    ClickedCancelSocialLinks,
    ClickedEditSocialLinks,
    ClickedSaveSocialLinks,
    type Message,
} from "./social-links.message.ts"
import type { Model, SocialLink, SocialPlatform } from "./social-links.model.ts"

const hover_class = (platform: SocialPlatform): string => {
    switch (platform) {
        case "Facebook":
            return "hover:bg-[#4267b2]"
        case "Instagram":
            return "hover:bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285aeb_90%)]"
        case "YouTube":
            return "hover:bg-[#e52d27]"
        case "X":
            return "hover:bg-black"
    }
}

const social_link = <ParentMessage>(
    link: SocialLink,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [
            h.Class(
                `group grid size-12 place-items-center rounded-full outline-2 outline-border transition-all duration-300 hover:outline-offset-2 ${hover_class(link.platform)}`
            ),
        ],
        [
            link.url === ""
                ? h.span(
                      [
                          h.AriaLabel(`${link.platform} URL not set`),
                          h.Title(`${link.platform} URL not set`),
                          h.Class(
                              "grid size-12 place-items-center text-muted-foreground transition-all duration-300 group-hover:text-white group-hover:scale-125"
                          ),
                      ],
                      [socialIcon(link.platform, h)]
                  )
                : h.a(
                      [
                          h.Href(link.url),
                          h.Target("_blank"),
                          h.Rel("noopener noreferrer"),
                          h.AriaLabel(link.platform),
                          h.Class(
                              "grid size-12 place-items-center text-foreground transition-all duration-300 group-hover:text-white hover:scale-125 focus-visible:scale-125 focus-visible:outline-none"
                          ),
                      ],
                      [socialIcon(link.platform, h)]
                  ),
        ]
    )

const preview = <ParentMessage>(
    links: ReadonlyArray<SocialLink>,
    h: HtmlBuilder<ParentMessage>
): Html =>
    h.span(
        [h.Class("flex flex-wrap items-center justify-center gap-6")],
        links.map((link) => social_link(link, h))
    )

export const view = <ParentMessage>(
    model: Model,
    to_parent_message: (message: Message) => ParentMessage,
    h: HtmlBuilder<ParentMessage>,
    options: Readonly<{
        can_save: boolean
        unavailable_message: string
    }> = {
        can_save: true,
        unavailable_message: "",
    }
): Html => {
    const is_editing = model.editor_state !== "Viewing"

    return h.section(
        [h.Class("grid gap-5")],
        [
            h.div(
                [h.Class("flex flex-wrap items-start justify-between gap-3")],
                [
                    h.div(
                        [h.Class("grid gap-1")],
                        [
                            h.h2(
                                [h.Class("text-lg font-semibold")],
                                ["Social links"]
                            ),
                            h.p(
                                [h.Class("text-sm text-muted-foreground")],
                                [
                                    "Add the profile URL for each built-in social icon.",
                                ]
                            ),
                        ]
                    ),
                    ...(is_editing
                        ? [
                              h.div(
                                  [h.Class("flex gap-2")],
                                  [
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(
                                                  to_parent_message(
                                                      ClickedCancelSocialLinks()
                                                  )
                                              ),
                                              h.Disabled(
                                                  model.editor_state ===
                                                      "Saving"
                                              ),
                                              h.Class(
                                                  "rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm font-medium"
                                              ),
                                          ],
                                          ["Cancel"]
                                      ),
                                      h.button(
                                          [
                                              h.Type("button"),
                                              h.OnClick(
                                                  to_parent_message(
                                                      ClickedSaveSocialLinks()
                                                  )
                                              ),
                                              h.Disabled(
                                                  model.editor_state ===
                                                      "Saving" ||
                                                      !options.can_save
                                              ),
                                              h.Class(
                                                  "rounded-[var(--radius-control)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                                              ),
                                          ],
                                          [
                                              model.editor_state === "Saving"
                                                  ? "Saving…"
                                                  : "Save",
                                          ]
                                      ),
                                  ]
                              ),
                          ]
                        : [
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.OnClick(
                                          to_parent_message(
                                              ClickedEditSocialLinks()
                                          )
                                      ),
                                      h.Class(
                                          "inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm font-medium"
                                      ),
                                  ],
                                  [IconPencil({ class: "size-4" }), "Edit"]
                              ),
                          ]),
                ]
            ),
            ...(is_editing
                ? [
                      h.div(
                          [h.Class("grid gap-3 sm:grid-cols-2")],
                          model.drafts.map((link) =>
                              h.label(
                                  [h.Class("grid gap-1.5")],
                                  [
                                      h.span(
                                          [h.Class("text-xs font-medium")],
                                          [link.platform]
                                      ),
                                      h.div(
                                          [h.Class("flex items-center gap-3")],
                                          [
                                              h.span(
                                                  [
                                                      h.Class(
                                                          `grid size-10 shrink-0 place-items-center rounded-full outline outline-border ${hover_class(link.platform)}`
                                                      ),
                                                      h.AriaHidden(true),
                                                  ],
                                                  [socialIcon(link.platform, h)]
                                              ),
                                              h.input([
                                                  h.Type("url"),
                                                  h.Value(link.url),
                                                  h.OnInput((url) =>
                                                      to_parent_message(
                                                          ChangedSocialLinkUrl({
                                                              platform:
                                                                  link.platform,
                                                              url,
                                                          })
                                                      )
                                                  ),
                                                  h.Placeholder(
                                                      `https://${link.platform.toLowerCase()}.com/…`
                                                  ),
                                                  h.Class(
                                                      "h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring"
                                                  ),
                                              ]),
                                          ]
                                      ),
                                  ]
                              )
                          )
                      ),
                  ]
                : []),
            ...(model.error === ""
                ? []
                : [
                      h.p(
                          [
                              h.Class("text-sm text-destructive"),
                              h.AriaLive("polite"),
                          ],
                          [model.error]
                      ),
                  ]),
            ...(options.can_save || options.unavailable_message === ""
                ? []
                : [
                      h.p(
                          [h.Class("text-sm text-muted-foreground")],
                          [options.unavailable_message]
                      ),
                  ]),
            h.div(
                [
                    h.Class(
                        "grid min-h-40 place-items-center rounded-[var(--radius-surface)] border-(length:--surface-border-width) border-border bg-background p-4"
                    ),
                ],
                [preview(model.drafts, h)]
            ),
        ]
    )
}
