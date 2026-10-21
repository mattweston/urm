import { Effect, Schema as S } from "effect"
import { Command, File } from "foldkit"

import {
    FailedDesignAction,
    FailedPreviewMarkdown,
    LoadedPreviewMarkdown,
    RemovedLayoutLogo,
    RemovedLayoutFavicon,
    SucceededDesignAction,
    UploadedLayoutLogo,
    UploadedLayoutFavicon,
} from "./design.message.ts"
import { LogoVariant } from "./design.model.ts"
import { SiteAppearanceSettings } from "@urm/domain/schemas/site-appearance"
import { SavedSiteAppearance, FailedSiteAppearance } from "./design.message.ts"

export const SaveSiteAppearance = Command.define("SaveSiteAppearance", {
    args: {
        owner_id: S.String,
        ...SiteAppearanceSettings.fields,
        site_title: S.String,
        show_site_title: S.Boolean,
    },
    messages: [SavedSiteAppearance, FailedSiteAppearance],
    execute: ({ owner_id }) =>
        Effect.succeed(
            FailedSiteAppearance({
                owner_id,
                error: "No design persistence adapter installed for site appearance",
            })
        ),
})

const missing_adapter = (operation: string) =>
    Effect.succeed(
        FailedDesignAction({
            error: `No design persistence adapter installed for ${operation}`,
        })
    )

export const AddDesignPage = Command.define("AddDesignPage", {
    args: { owner_id: S.String, document_id: S.String },
    messages: [SucceededDesignAction, FailedDesignAction],
    execute: () => missing_adapter("adding a page"),
})

export const UpdateDesignPage = Command.define("UpdateDesignPage", {
    args: {
        owner_id: S.String,
        page_id: S.String,
        navigation_label: S.String,
        is_homepage: S.Boolean,
        show_in_navigation: S.Boolean,
    },
    messages: [SucceededDesignAction, FailedDesignAction],
    execute: () => missing_adapter("updating a page"),
})

export const ReorderDesignPages = Command.define("ReorderDesignPages", {
    args: {
        owner_id: S.String,
        positions: S.Array(
            S.Struct({ page_id: S.String, order_position: S.Number })
        ),
    },
    messages: [SucceededDesignAction, FailedDesignAction],
    execute: () => missing_adapter("reordering pages"),
})

export const RemoveDesignPage = Command.define("RemoveDesignPage", {
    args: { owner_id: S.String, page_id: S.String },
    messages: [SucceededDesignAction, FailedDesignAction],
    execute: () => missing_adapter("removing a page"),
})

export const UploadLayoutLogo = Command.define("UploadLayoutLogo", {
    args: { owner_id: S.String, variant: LogoVariant, file: File.File },
    messages: [UploadedLayoutLogo, FailedDesignAction],
    execute: () => missing_adapter("uploading a layout logo"),
})

export const RemoveLayoutLogo = Command.define("RemoveLayoutLogo", {
    args: { owner_id: S.String, variant: LogoVariant },
    messages: [RemovedLayoutLogo, FailedDesignAction],
    execute: () => missing_adapter("removing a layout logo"),
})

export const UploadLayoutFavicon = Command.define("UploadLayoutFavicon", {
    args: { owner_id: S.String, variant: LogoVariant, file: File.File },
    messages: [UploadedLayoutFavicon, FailedDesignAction],
    execute: () => missing_adapter("uploading a layout favicon"),
})

export const RemoveLayoutFavicon = Command.define("RemoveLayoutFavicon", {
    args: { owner_id: S.String, variant: LogoVariant },
    messages: [RemovedLayoutFavicon, FailedDesignAction],
    execute: () => missing_adapter("removing a layout favicon"),
})

export const ParseDesignMarkdown = Command.define("ParseDesignMarkdown", {
    args: { page_id: S.String, content: S.String },
    messages: [LoadedPreviewMarkdown, FailedPreviewMarkdown],
    execute: ({ page_id, content }) =>
        Effect.tryPromise({
            try: async () => {
                const { parseMarkdown } = await import("@foldkit/markdown/vite")
                return parseMarkdown(content)
            },
            catch: (error) => globalThis.String(error),
        }).pipe(
            Effect.map((document) =>
                LoadedPreviewMarkdown({ page_id, document })
            ),
            Effect.catch((error) =>
                Effect.succeed(FailedPreviewMarkdown({ page_id, error }))
            )
        ),
})
