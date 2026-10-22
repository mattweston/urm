import { view, islandsFor } from "@foldkit/markdown"
import type { HtmlBuilder } from "foldkit/html"
import { Callout } from "@urm/ui/foldkit/callout.view.ts"
import { StepsContainer } from "@urm/ui/foldkit/steps.view.ts"
import * as DocumentationTabs from "../../../documents/documentation/tabs.ts"
import { grep_directives } from "./directives.ts"
import {
    GotDocumentationTabsMessage,
    initial_tabs,
    request_parameters,
} from "./model.ts"
import type { Model, Message } from "./model.ts"
import type { DocumentationSection } from "./data.ts"

import { documentation_link } from "./links.ts"

export const markdown_section_view = (
    section: DocumentationSection,
    model: Model,
    h: HtmlBuilder<Message>
) =>
    section.document === undefined
        ? h.pre(
              [h.Class("whitespace-pre-wrap break-words text-sm")],
              [section.text]
          )
        : h.div(
              [h.Class("grep-markdown space-y-3 text-sm leading-relaxed")],
              [
                  view(section.document, {
                      islands: islandsFor(grep_directives, {
                          Callout: (attributes, content) =>
                              Callout({ ...attributes, children: content }),
                          Steps: (_attributes, content) =>
                              StepsContainer({ children: content }),
                          TabItem: (_attributes, content) => h.div([], content),
                          Tabs: ({ labels, label }, content, occurrence) => {
                              const id = `grep-tabs-${encodeURIComponent(section.id)}-${occurrence}`
                              return DocumentationTabs.view(
                                  model.tabs[id] ?? initial_tabs(id),
                                  labels
                                      .split(",")
                                      .map((label) => label.trim()),
                                  content,
                                  label ?? "Documentation examples",
                                  (message) =>
                                      GotDocumentationTabsMessage({
                                          id,
                                          message,
                                      }),
                                  h
                              )
                          },
                          CodeTabs: (
                              { labels, label },
                              content,
                              occurrence
                          ) => {
                              const id = `grep-code-tabs-${encodeURIComponent(section.id)}-${occurrence}`
                              return DocumentationTabs.view(
                                  model.tabs[id] ?? initial_tabs(id),
                                  labels
                                      .split(",")
                                      .map((label) => label.trim()),
                                  content,
                                  label ?? "Code examples",
                                  (message) =>
                                      GotDocumentationTabsMessage({
                                          id,
                                          message,
                                      }),
                                  h
                              )
                          },
                      }),
                      views: {
                          CodeBlock: ({ value }) => {
                              const highlighted = section.highlights?.[value]
                              return highlighted === undefined
                                  ? h.pre([], [h.code([], [value])])
                                  : h.div([h.InnerHTML(highlighted)])
                          },
                          Link: ({ url }, content) => {
                              const href = documentation_link(
                                  url,
                                  section.path,
                                  request_parameters(model)
                              )
                              return href === undefined
                                  ? h.span([], content)
                                  : h.a(
                                        [
                                            h.Href(href),
                                            ...(href.startsWith("#")
                                                ? []
                                                : [
                                                      h.Target("_blank"),
                                                      h.Rel(
                                                          "noreferrer noopener"
                                                      ),
                                                  ]),
                                        ],
                                        content
                                    )
                          },
                          Image: ({ alt }) =>
                              h.p(
                                  [h.Class("text-muted-foreground")],
                                  [`Image: ${alt}`]
                              ),
                      },
                  }),
              ]
          )
