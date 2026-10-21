import { Effect, Match as M, Schema as S } from "effect"
import { Command } from "foldkit"
import { modifyFields } from "foldkit/struct"

import {
    FailedSavingSocialLinks,
    type Message,
    SavedSocialLinks,
} from "./social-links.message.ts"
import {
    default_social_links,
    type Model,
    SocialLink,
    type SocialLink as SocialLinkType,
} from "./social-links.model.ts"

export const SaveSocialLinks = Command.define("SaveSocialLinks", {
    args: { links: S.Array(SocialLink) },
    messages: [SavedSocialLinks, FailedSavingSocialLinks],
    execute: () =>
        Effect.succeed(
            FailedSavingSocialLinks({
                error: "No social-links persistence adapter installed",
            })
        ),
})

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

const valid_url = (value: string): boolean => {
    try {
        const url = new URL(value)
        return url.protocol === "https:" || url.protocol === "http:"
    } catch {
        return false
    }
}

const invalid_link = (
    links: ReadonlyArray<SocialLinkType>
): SocialLinkType | undefined =>
    links.find((link) => link.url !== "" && !valid_url(link.url))

const with_platform_defaults = (
    links: ReadonlyArray<SocialLinkType>
): ReadonlyArray<SocialLinkType> =>
    default_social_links.map(
        (default_link) =>
            links.find((link) => link.platform === default_link.platform) ?? {
                ...default_link,
                url: "",
            }
    )

export const init = (links?: ReadonlyArray<SocialLinkType>): UpdateReturn => {
    const initial_links =
        links === undefined
            ? default_social_links
            : with_platform_defaults(links)

    return [
        {
            drafts: initial_links,
            saved_snapshot: initial_links,
            editor_state: "Viewing",
            error: "",
        },
        [],
    ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ClickedEditSocialLinks: () => [
                modifyFields(model, {
                    editor_state: () => "Editing",
                    error: () => "",
                }),
                [],
            ],
            ChangedSocialLinkUrl: ({ platform, url }) => [
                modifyFields(model, {
                    drafts: (links) =>
                        links.map((link) =>
                            link.platform === platform ? { ...link, url } : link
                        ),
                    error: () => "",
                }),
                [],
            ],
            ClickedSaveSocialLinks: () => {
                const invalid = invalid_link(model.drafts)

                return invalid === undefined
                    ? [
                          modifyFields(model, {
                              editor_state: () => "Saving",
                              error: () => "",
                          }),
                          [
                              SaveSocialLinks({
                                  links: model.drafts.filter(
                                      (link) => link.url !== ""
                                  ),
                              }),
                          ],
                      ]
                    : [
                          modifyFields(model, {
                              error: () =>
                                  `${invalid.platform} needs a complete http or https URL.`,
                          }),
                          [],
                      ]
            },
            ClickedCancelSocialLinks: () => [
                modifyFields(model, {
                    drafts: () => model.saved_snapshot,
                    editor_state: () => "Viewing",
                    error: () => "",
                }),
                [],
            ],
            SavedSocialLinks: ({ links }) => [
                modifyFields(model, {
                    drafts: () => with_platform_defaults(links),
                    saved_snapshot: () => with_platform_defaults(links),
                    editor_state: () => "Viewing",
                    error: () => "",
                }),
                [],
            ],
            FailedSavingSocialLinks: ({ error }) => [
                modifyFields(model, {
                    editor_state: () => "Editing",
                    error: () => error,
                }),
                [],
            ],
        })
    )
