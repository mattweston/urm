import { Effect, Match as M, Option, Schema as S } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"
import type { Message } from "./bookmarks.message.ts"
import {
    BookmarkOperationFailed,
    DeletedBookmark,
    SavedBookmark,
} from "./bookmarks.message.ts"
import { Model } from "./bookmarks.model.ts"

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const SaveBookmark = Command.define("SaveBookmark", {
    args: {
        bookmark_id: S.NullOr(S.String),
        title: S.String,
        href: S.String,
        tags: S.Array(S.String),
    },
    messages: [SavedBookmark, BookmarkOperationFailed],
    execute: () =>
        Effect.succeed(
            BookmarkOperationFailed({
                error: "Bookmarks require a host persistence adapter",
            })
        ),
})

const DeleteBookmark = Command.define("DeleteBookmark", {
    args: { bookmark_id: S.String },
    messages: [DeletedBookmark, BookmarkOperationFailed],
    execute: () =>
        Effect.succeed(
            BookmarkOperationFailed({
                error: "Bookmarks require a host persistence adapter",
            })
        ),
})

const empty_form = {
    title: "",
    href: "",
    tags: "",
    editing_id: Option.none<string>(),
}

export const init = (): UpdateReturn => [
    Model.make({
        bookmarks: [],
        query: "",
        ...empty_form,
        status: "loading",
        error: Option.none(),
    }),
    [],
]

const parsed_tags = (value: string): ReadonlyArray<string> => [
    ...new Set(
        value
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter((tag) => tag !== "")
    ),
]

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            LoadedBookmarks: ({ bookmarks }) => [
                modifyFields(model, {
                    bookmarks: () => bookmarks,
                    status: () => "ready",
                    error: () => Option.none(),
                }),
                [],
            ],
            UpdatedBookmarkQuery: ({ value }) => [
                modifyFields(model, { query: () => value }),
                [],
            ],
            UpdatedBookmarkTitle: ({ value }) => [
                modifyFields(model, { title: () => value }),
                [],
            ],
            UpdatedBookmarkHref: ({ value }) => [
                modifyFields(model, { href: () => value }),
                [],
            ],
            UpdatedBookmarkTags: ({ value }) => [
                modifyFields(model, { tags: () => value }),
                [],
            ],
            ClickedEditBookmark: ({ bookmark }) => [
                modifyFields(model, {
                    title: () => bookmark.title,
                    href: () => bookmark.href,
                    tags: () => bookmark.tags.join(", "),
                    editing_id: () => Option.some(bookmark.id),
                    error: () => Option.none(),
                }),
                [],
            ],
            ClickedCancelBookmark: () => [
                modifyFields(model, {
                    title: () => "",
                    href: () => "",
                    tags: () => "",
                    editing_id: () => Option.none(),
                    error: () => Option.none(),
                }),
                [],
            ],
            SubmittedBookmark: () => {
                const title = model.title.trim()
                const href = model.href.trim()
                if (title === "" || href === "") {
                    return [
                        modifyFields(model, {
                            status: () => "error",
                            error: () =>
                                Option.some("Title and URL are required."),
                        }),
                        [],
                    ]
                }
                return [
                    modifyFields(model, {
                        status: () => "saving",
                        error: () => Option.none(),
                    }),
                    [
                        SaveBookmark({
                            bookmark_id: Option.getOrNull(model.editing_id),
                            title,
                            href,
                            tags: parsed_tags(model.tags),
                        }),
                    ],
                ]
            },
            ClickedDeleteBookmark: ({ bookmark_id }) => [
                modifyFields(model, {
                    status: () => "saving",
                    error: () => Option.none(),
                }),
                [DeleteBookmark({ bookmark_id })],
            ],
            SavedBookmark: ({ bookmark }) => [
                modifyFields(model, {
                    bookmarks: () =>
                        [
                            bookmark,
                            ...model.bookmarks.filter(
                                (item) => item.id !== bookmark.id
                            ),
                        ].sort((left, right) =>
                            left.title.localeCompare(right.title)
                        ),
                    title: () => "",
                    href: () => "",
                    tags: () => "",
                    editing_id: () => Option.none(),
                    status: () => "ready",
                    error: () => Option.none(),
                }),
                [],
            ],
            DeletedBookmark: ({ bookmark_id }) => [
                modifyFields(model, {
                    bookmarks: () =>
                        model.bookmarks.filter(
                            (bookmark) => bookmark.id !== bookmark_id
                        ),
                    title: () => "",
                    href: () => "",
                    tags: () => "",
                    editing_id: () => Option.none(),
                    status: () => "ready",
                    error: () => Option.none(),
                }),
                [],
            ],
            BookmarkOperationFailed: ({ error }) => [
                modifyFields(model, {
                    status: () => "error",
                    error: () => Option.some(error),
                }),
                [],
            ],
        })
    )
