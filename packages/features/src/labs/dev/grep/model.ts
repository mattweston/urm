import { linked_documentation, documentation_source } from "./documentation.ts"
import * as Ui from "@foldkit/ui"
import { Option } from "effect"
import { Command } from "foldkit"
import * as DocumentationTabs from "../../../documents/documentation/tabs.ts"
import { Schema } from "effect"
import { SearchResponse, type SearchRequest } from "./transport.ts"
import { taggedStruct } from "foldkit/schema"
import type { Preview } from "./data.ts"

export const Autocomplete = Ui.Combobox.create<string>()

export const Model = Schema.Struct({
    source_dropdown: Ui.Listbox.Model,
    repo_dropdown: Ui.Listbox.Model,
    autocomplete: Ui.Combobox.Model,
    doc_path: Schema.String,
    doc_heading: Schema.String,
    doc_source: Schema.Literals([
        "all",
        "urm",
        "effect",
        "foldkit",
        "foldkit-plus",
    ]),
    repo_source: Schema.Literals([
        "all",
        "urm",
        "effect",
        "foldkit",
        "foldkit-plus",
    ]),
    navigation_snapshot: Schema.String,
    query: Schema.String,
    tabs: Schema.Record(Schema.String, DocumentationTabs.Model),
    suggestions: Schema.Array(Schema.String),
    suggestion_query: Schema.String,
    selected: Schema.String,
    visible_files: Schema.Number,
    doc_offset: Schema.Number,
    response: Schema.optionalKey(SearchResponse),
    response_key: Schema.String,
    failure: Schema.String,
    failure_key: Schema.String,
    match_limits: Schema.Record(Schema.String, Schema.Number),
})
export type Model = typeof Model.Type
export const SourceDropdown = Ui.Listbox.create<Model["doc_source"]>()
export const RepoDropdown = Ui.Listbox.create<Model["repo_source"]>()
export const GotSourceDropdownMessage = taggedStruct(
    "GotSourceDropdownMessage",
    {
        message: Ui.Listbox.Message,
    }
)
export const GotRepositoryDropdownMessage = taggedStruct(
    "GotRepositoryDropdownMessage",
    {
        message: Ui.Listbox.Message,
    }
)
export const GotDocumentationTabsMessage = taggedStruct(
    "GotDocumentationTabsMessage",
    {
        id: Schema.String,
        message: DocumentationTabs.Message,
    }
)
export const ReceivedSuggestions = taggedStruct("ReceivedSuggestions", {
    query: Schema.String,
    suggestions: Schema.Array(Schema.String),
})
export const GotAutocompleteMessage = taggedStruct("GotAutocompleteMessage", {
    message: Ui.Combobox.Message,
})
export const ChangedDocumentationSource = taggedStruct(
    "ChangedDocumentationSource",
    {
        source: Schema.Literals([
            "all",
            "urm",
            "effect",
            "foldkit",
            "foldkit-plus",
        ]),
    }
)
export const ChangedRepositorySource = taggedStruct("ChangedRepositorySource", {
    source: Schema.Literals([
        "all",
        "urm",
        "effect",
        "foldkit",
        "foldkit-plus",
    ]),
})
export const ChangedQuery = taggedStruct("ChangedQuery", {
    query: Schema.String,
})
export const SelectedMatch = taggedStruct("SelectedMatch", {
    id: Schema.String,
})
export const ShowMoreFiles = taggedStruct("ShowMoreFiles")
export const ShowMoreMatches = taggedStruct("ShowMoreMatches", {
    path: Schema.String,
})
export const PreviousFiles = taggedStruct("PreviousFiles")
export const PreviousMatches = taggedStruct("PreviousMatches", {
    path: Schema.String,
})
export const NextDocuments = taggedStruct("NextDocuments")
export const PreviousDocuments = taggedStruct("PreviousDocuments")
export const ReceivedSearch = taggedStruct("ReceivedSearch", {
    key: Schema.String,
    response: SearchResponse,
})
export const FailedSearch = taggedStruct("FailedSearch", {
    key: Schema.String,
    error: Schema.String,
})
export const Message = Schema.Union([
    GotSourceDropdownMessage,
    GotRepositoryDropdownMessage,
    ChangedDocumentationSource,
    ChangedRepositorySource,
    GotAutocompleteMessage,
    GotDocumentationTabsMessage,
    ReceivedSuggestions,
    PreviousFiles,
    PreviousMatches,
    NextDocuments,
    PreviousDocuments,
    ReceivedSearch,
    FailedSearch,
    ChangedQuery,
    SelectedMatch,
    ShowMoreFiles,
    ShowMoreMatches,
])
export type Message = typeof Message.Type
export const init = (query = "Schema.Struct"): Model => ({
    source_dropdown: Ui.Listbox.init({ id: "grep-documentation-source" }),
    repo_dropdown: Ui.Listbox.init({ id: "grep-repository-source" }),
    doc_path: "",
    doc_heading: "",
    doc_source: "all",
    repo_source: "all",
    navigation_snapshot: "",
    autocomplete: {
        ...Ui.Combobox.init({ id: "grep-topics" }),
        inputValue: query,
    },
    query,
    tabs: {},
    suggestions: [],
    suggestion_query: "",
    selected: "",
    visible_files: 10,
    doc_offset: 0,
    response_key: "",
    failure: "",
    failure_key: "",
    match_limits: {},
})
export const restore_query = (model: Model, query: string): Model =>
    query === model.query ? model : init(query)
export const update = (model: Model, message: Message): Model => {
    switch (message._tag) {
        case "ChangedDocumentationSource":
            return {
                ...model,
                doc_source: message.source,
                doc_path: "",
                doc_heading: "",
                doc_offset: 0,
            }
        case "ChangedRepositorySource":
            return {
                ...model,
                repo_source: message.source,
                visible_files: 10,
                match_limits: {},
                selected: "",
            }
        case "GotSourceDropdownMessage":
        case "GotRepositoryDropdownMessage":
        case "GotAutocompleteMessage":
        case "GotDocumentationTabsMessage":
            return update_with_commands(model, message)[0]
        case "ReceivedSuggestions":
            return message.query === model.query
                ? {
                      ...model,
                      suggestions: message.suggestions,
                      suggestion_query: message.query,
                  }
                : model

        case "ReceivedSearch": {
            if (message.key !== request_key(model)) return model
            const received = {
                ...model,
                response: message.response,
                failure: "",
                failure_key: "",
            }
            return { ...received, response_key: request_key(received) }
        }
        case "FailedSearch":
            return message.key === request_key(model)
                ? { ...model, failure: message.error, failure_key: message.key }
                : model
        case "PreviousFiles":
            return {
                ...model,
                visible_files: Math.max(10, model.visible_files - 10),
                match_limits: {},
                selected: "",
            }
        case "PreviousMatches":
            return {
                ...model,
                match_limits: {
                    ...model.match_limits,
                    [message.path]: Math.max(
                        20,
                        (model.match_limits[message.path] ?? 20) - 20
                    ),
                },
                selected: "",
            }
        case "NextDocuments":
            return { ...model, doc_offset: model.doc_offset + 20 }
        case "PreviousDocuments":
            return { ...model, doc_offset: Math.max(0, model.doc_offset - 20) }

        case "ChangedQuery":
            return { ...init(message.query), doc_source: model.doc_source }
        case "SelectedMatch":
            return { ...model, selected: message.id, doc_offset: 0 }
        case "ShowMoreFiles":
            return {
                ...model,
                visible_files: model.visible_files + 10,
                ...(model.response === undefined
                    ? {}
                    : { match_limits: {}, selected: "" }),
            }
        case "ShowMoreMatches":
            return {
                ...model,
                match_limits: {
                    ...model.match_limits,
                    [message.path]:
                        (model.match_limits[message.path] ?? 20) + 20,
                },
            }
    }
}

export const search_preview = (
    preview: Preview,
    model: Pick<Model, "query" | "selected"> &
        Partial<
            Pick<
                Model,
                | "visible_files"
                | "match_limits"
                | "doc_path"
                | "doc_heading"
                | "doc_source"
            >
        >
) => {
    const query = model.query
    const error =
        /[\r\n]/.test(query) ||
        query.includes("\0") ||
        Array.from(query).length > 1024
            ? "Enter a single-line query of up to 1,024 characters."
            : ""
    const matches: {
        id: string
        path: string
        line: number
        column: number
        text: string
        start: number
        end: number
    }[] = []
    let occurrences = 0
    const matching_files = new Map<string, number>()
    if (query !== "" && error === "") {
        for (const file of preview.files) {
            file.text.split(/\r?\n/).forEach((text, index) => {
                for (
                    let start = text.indexOf(query);
                    start !== -1;
                    start = text.indexOf(query, start + query.length)
                ) {
                    occurrences++
                    matching_files.set(
                        file.path,
                        (matching_files.get(file.path) ?? 0) + 1
                    )
                    if (
                        matching_files.size <= (model.visible_files ?? 10) &&
                        (matching_files.get(file.path) ?? 0) <=
                            (model.match_limits?.[file.path] ?? 20)
                    )
                        matches.push({
                            id: `${file.path}:${index + 1}:${start}`,
                            path: file.path,
                            line: index + 1,
                            column: start + 1,
                            text,
                            start,
                            end: start + query.length,
                        })
                }
            })
        }
    }
    const selected =
        matches.find((match) => match.id === model.selected) ?? matches[0]
    const sections =
        error !== ""
            ? []
            : model.doc_path
              ? linked_documentation(
                    preview.sections,
                    model.doc_path,
                    model.doc_heading ?? ""
                ).map((section) => ({
                    section,
                    reason: "Linked documentation",
                    rank: 0,
                }))
              : query === ""
                ? []
                : rank_documentation(
                      preview.sections.filter(
                          (section) =>
                              !model.doc_source ||
                              model.doc_source === "all" ||
                              documentation_source(section.path) ===
                                  model.doc_source
                      ),
                      query,
                      selected
                  )
    return {
        error,
        matches,
        occurrences,
        files: matching_files.size,
        shown_files: Math.min(matching_files.size, model.visible_files ?? 10),
        file_counts: matching_files,
        selected,
        sections,
    }
}

const topic_name = (value: string) =>
    value.toLowerCase().replace(/ \(type\)$/, "")
const page_name = (section: Preview["sections"][number]) =>
    (section.path.split("/").at(-1) ?? "")
        .replace(/\.(?:mdx?|[cm]?[jt]sx?)$/i, "")
        .toLowerCase()

export const rank_documentation = (
    sections: Preview["sections"],
    query: string,
    selected: { path: string; line: number } | undefined
) => {
    if (query === "") return []
    const needle = topic_name(query)
    const direct_pages = new Set(
        sections
            .filter(
                (section) =>
                    page_name(section) === needle ||
                    topic_name(section.page_title ?? "") === needle
            )
            .map((section) => section.path)
    )
    return sections
        .flatMap((section) => {
            if (direct_pages.size > 0 && !direct_pages.has(section.path))
                return []
            const exact_heading = topic_name(section.title) === needle
            const exact_alias = (section.aliases ?? []).some(
                (alias) => topic_name(alias) === needle
            )
            const exact_filename = page_name(section) === needle
            const exact_page_title =
                topic_name(section.page_title ?? "") === needle
            if (
                !direct_pages.has(section.path) &&
                !exact_heading &&
                !exact_alias
            )
                return []
            const region = section.associations.some(
                (association) =>
                    selected !== undefined &&
                    association.source_path === selected.path &&
                    selected.line >= association.start_line &&
                    selected.line <= association.end_line &&
                    association.reason === "Documents this region"
            )
            return [
                {
                    section,
                    reason: exact_heading
                        ? "Exact heading match"
                        : exact_alias
                          ? "Exact alias match"
                          : exact_page_title
                            ? "Exact page title match"
                            : exact_filename
                              ? "Exact filename match"
                              : "Same documentation topic",
                    rank: exact_heading ? 0 : exact_alias ? 1 : region ? 2 : 3,
                },
            ]
        })
        .toSorted(
            (left, right) =>
                left.rank - right.rank ||
                Number(right.section.title === query) -
                    Number(left.section.title === query)
        )
}

export const request_parameters = (model: Model) => ({
    doc_path: model.doc_path,
    doc_heading: model.doc_heading,
    doc_source: model.doc_source,
    repo_source: model.repo_source,
    query: model.query,
    selected: model.selected,
    file_offset: model.visible_files - 10,
    match_offsets: Object.fromEntries(
        Object.entries(model.match_limits).map(([path, count]) => [
            path,
            count - 20,
        ])
    ),
    doc_offset: model.doc_offset,
    snapshot: model.response?.snapshot ?? model.navigation_snapshot,
})
export const request_key = (model: Model) =>
    JSON.stringify(request_parameters(model))

export const initial_tabs = (id: string): DocumentationTabs.Model => {
    const model = DocumentationTabs.init()[0]
    return { ...model, tabs: { ...model.tabs, id } }
}
export const update_with_commands = (
    model: Model,
    message: Message
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
    if (message._tag === "GotRepositoryDropdownMessage") {
        const {
            model: repo_dropdown,
            commands = [],
            outMessage: output_value,
        } = RepoDropdown.update(model.repo_dropdown, message.message)
        const output = Option.fromUndefinedOr(output_value)

        const next = Option.isSome(output)
            ? update(
                  model,
                  ChangedRepositorySource({ source: output.value.value })
              )
            : model
        return [
            { ...next, repo_dropdown },
            Command.mapMessages(commands, (child) =>
                GotRepositoryDropdownMessage({ message: child })
            ),
        ]
    }
    if (message._tag === "GotSourceDropdownMessage") {
        const {
            model: source_dropdown,
            commands = [],
            outMessage: output_value,
        } = SourceDropdown.update(model.source_dropdown, message.message)
        const output = Option.fromUndefinedOr(output_value)

        const next = Option.isSome(output)
            ? update(
                  model,
                  ChangedDocumentationSource({ source: output.value.value })
              )
            : model
        return [
            { ...next, source_dropdown },
            Command.mapMessages(commands, (child) =>
                GotSourceDropdownMessage({ message: child })
            ),
        ]
    }
    if (message._tag === "GotAutocompleteMessage") {
        const {
            model: autocomplete,
            commands = [],
            outMessage: output_value,
        } = Autocomplete.update(model.autocomplete, message.message)
        const output = Option.fromUndefinedOr(output_value)

        const query =
            Option.isSome(output) && output.value._tag === "Selected"
                ? output.value.value
                : message.message._tag === "UpdatedInputValue"
                  ? autocomplete.inputValue
                  : model.query
        const next =
            query === model.query
                ? model
                : update(model, ChangedQuery({ query }))
        return [
            { ...next, autocomplete },
            Command.mapMessages(commands, (child) =>
                GotAutocompleteMessage({ message: child })
            ),
        ]
    }
    if (message._tag !== "GotDocumentationTabsMessage")
        return [update(model, message), []]
    const [tabs, commands] = DocumentationTabs.update(
        model.tabs[message.id] ?? initial_tabs(message.id),
        message.message
    )
    return [
        { ...model, tabs: { ...model.tabs, [message.id]: tabs } },
        Command.mapMessages(commands, (child) =>
            GotDocumentationTabsMessage({ id: message.id, message: child })
        ),
    ]
}

export const suggest_topics = (
    sections: Preview["sections"],
    query: string
): string[] => {
    const needle = query.trim().toLowerCase()
    if (needle === "" || needle.length > 2048) return []
    const candidates = new Set<string>()
    for (const section of sections) {
        const filename = (section.path.split("/").at(-1) ?? "").replace(
            /\.(?:mdx?|[cm]?[jt]sx?)$/i,
            ""
        )
        for (const topic of [
            filename,
            section.page_title ?? "",
            section.title,
            ...(section.aliases ?? []),
        ]) {
            if (
                topic.length <= 120 &&
                topic.toLowerCase().includes(needle) &&
                !/^(?:index|readme)$/i.test(topic)
            )
                candidates.add(topic)
        }
    }
    const score = (topic: string) =>
        topic.toLowerCase() === needle
            ? 0
            : topic.toLowerCase().startsWith(needle)
              ? 1
              : 2
    return Array.from(candidates)
        .toSorted(
            (left, right) =>
                score(left) - score(right) ||
                left.length - right.length ||
                left.localeCompare(right)
        )
        .slice(0, 8)
}

export const restore_navigation = (
    model: Model,
    request: SearchRequest
): Model => {
    const restored = {
        ...init(request.query),
        selected: request.selected,
        visible_files: request.file_offset + 10,
        match_limits: Object.fromEntries(
            Object.entries(request.match_offsets).map(([path, offset]) => [
                path,
                offset + 20,
            ])
        ),
        doc_offset: request.doc_offset,
        doc_path: request.doc_path ?? "",
        doc_heading: request.doc_heading ?? "",
        doc_source: request.doc_source ?? "all",
        repo_source: request.repo_source ?? "all",
        navigation_snapshot: request.snapshot,
    }
    return request_key(restored) === request_key(model) ? model : restored
}
