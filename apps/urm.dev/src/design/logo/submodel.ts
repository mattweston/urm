import { Effect, Option, Schema as S } from "effect"
import { default_logo_scene } from "@urm/domain/schemas/logos"
import { Command, Submodel } from "foldkit"
import { taggedStruct } from "foldkit/schema"
import {
    LogoDraftCatalog,
    LogoDraftDetail,
    SaveLogoDraftInput,
} from "@urm/domain/logo-drafts"
import * as LogoDesigner from "@urm/features/design/logo"
import { ContactsApi } from "../../contacts/api.ts"
import { save_logo_draft } from "./api.ts"

import type { DesktopRoute } from "../../routing/route.ts"

export const logo_href = () => "/design/logo"
export const is_logo_path = (path: string) =>
    path.replace(/\/$/, "") === logo_href()

export const Model = S.Struct({
    active: S.Boolean,
    loaded: S.Boolean,
    logo_id: S.Option(S.String),
    revision: S.Number,
    designer: LogoDesigner.Model,
})
export type Model = typeof Model.Type

export const GotDesignerMessage = taggedStruct("GotDesignerMessage", {
    message: LogoDesigner.Message,
})
export const LoadedLogo = taggedStruct("LoadedLogo", {
    account_id: S.String,
    detail: LogoDraftDetail,
})
export const SavedLogo = taggedStruct("SavedLogo", {
    account_id: S.String,
    detail: LogoDraftDetail,
    catalog: LogoDraftCatalog,
})
export const FailedLogoSave = taggedStruct("FailedLogoSave", {
    details: S.String,
})

export const Message = S.Union([
    GotDesignerMessage,
    LoadedLogo,
    SavedLogo,
    FailedLogoSave,
])
export type Message = typeof Message.Type

type Commands = ReadonlyArray<Command.Command<Message, never, ContactsApi>>
export type UpdateReturn = readonly [Model, Commands]

const SaveLogoDraft = Command.define("SaveLogoDraft", {
    args: {
        domain_id: S.String,
        account_id: S.String,
        draft: SaveLogoDraftInput,
    },
    messages: [SavedLogo, FailedLogoSave],
    execute: ({ domain_id, account_id, draft }) =>
        save_logo_draft(domain_id, account_id, draft).pipe(
            Effect.map(({ detail, catalog }) =>
                SavedLogo({ account_id, detail, catalog })
            ),
            Effect.catch((error) =>
                Effect.succeed(
                    FailedLogoSave({ details: globalThis.String(error) })
                )
            )
        ),
})

export const init = (route: DesktopRoute): Model => ({
    active: route._tag === "Design" && is_logo_path(route.design_path),
    loaded: false,
    logo_id: Option.none(),
    revision: 0,
    designer: LogoDesigner.model_from_scene(default_logo_scene),
})

export const changed_route = (model: Model, route: DesktopRoute): Model => {
    const active = route._tag === "Design" && is_logo_path(route.design_path)
    return active === model.active ? model : { ...model, active }
}

export const clear = (model: Model): Model => ({
    ...model,
    loaded: false,
    logo_id: Option.none(),
    revision: 0,
    designer: LogoDesigner.model_from_scene(default_logo_scene),
})

export const update = (
    model: Model,
    message: Message,
    scope: { readonly domain_id: string; readonly account_id: string } | null
): UpdateReturn => {
    switch (message._tag) {
        case "LoadedLogo":
            return message.detail.logo === null
                ? [{ ...clear(model), loaded: true }, []]
                : [
                      {
                          ...model,
                          loaded: true,
                          logo_id: Option.some(message.detail.logo.id),
                          revision: message.detail.logo.revision,
                          designer: LogoDesigner.model_from_scene(
                              message.detail.logo.scene
                          ),
                      },
                      [],
                  ]
        case "SavedLogo":
            if (message.detail.logo === null) return [model, []]
            return [
                {
                    ...model,
                    loaded: true,
                    logo_id: Option.some(message.detail.logo.id),
                    revision: message.detail.logo.revision,
                    designer: LogoDesigner.update(
                        model.designer,
                        LogoDesigner.Saved()
                    ),
                },
                [],
            ]
        case "FailedLogoSave":
            return [
                {
                    ...model,
                    designer: LogoDesigner.update(
                        model.designer,
                        LogoDesigner.FailedSaving({
                            details: message.details,
                        })
                    ),
                },
                [],
            ]
        case "GotDesignerMessage":
            if (!model.active) return [model, []]
            if (message.message._tag !== "RequestedSave") {
                return [
                    {
                        ...model,
                        designer: LogoDesigner.update(
                            model.designer,
                            message.message
                        ),
                    },
                    [],
                ]
            }
            if (!model.loaded) {
                return [
                    {
                        ...model,
                        designer: LogoDesigner.update(
                            model.designer,
                            LogoDesigner.FailedSaving({
                                details: "Wait for the draft to finish loading",
                            })
                        ),
                    },
                    [],
                ]
            }
            return scope === null
                ? [
                      {
                          ...model,
                          designer: LogoDesigner.update(
                              model.designer,
                              LogoDesigner.FailedSaving({
                                  details: "Choose a domain before saving",
                              })
                          ),
                      },
                      [],
                  ]
                : [
                      {
                          ...model,
                          designer: LogoDesigner.update(
                              model.designer,
                              LogoDesigner.StartedSaving()
                          ),
                      },
                      [
                          SaveLogoDraft({
                              domain_id: scope.domain_id,
                              account_id: scope.account_id,
                              draft: {
                                  logo_id: Option.getOrNull(model.logo_id),
                                  expected_revision: model.revision,
                                  name: "Untitled logo",
                                  scene: LogoDesigner.scene_from_model(
                                      model.designer
                                  ),
                              },
                          }),
                      ],
                  ]
    }
}

export const view = Submodel.defineView<Model, Message>((model, h) =>
    h.submodel({
        slotId: "design-logo-editor",
        model: model.designer,
        view: LogoDesigner.view,
        toParentMessage: (message) => GotDesignerMessage({ message }),
    })
)
