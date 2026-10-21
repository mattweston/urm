import { Effect } from "effect"
import { Entity, entityKey, type Boundary } from "foldkit-remote"
import { RemoteServer, RemoteServerError } from "foldkit-remote-server"
import {
    LandingTemplateCatalogEntity,
    LandingTemplateCatalogQuery,
    LandingTemplatesRemote,
    RemoveLandingTemplate,
    SaveLandingTemplate,
} from "@urm/contracts/landing-templates"
import {
    LandingTemplatesRepository,
    type LandingTemplatesPrincipal,
} from "./repository.ts"

const terminal: Boundary = { _tag: "Terminal" }
const denied = () =>
    new RemoteServerError({
        message: "Landing template unavailable or access denied",
    })

export const LandingTemplatesServer = RemoteServer.make({
    entities: [
        RemoteServer.entity<
            LandingTemplatesPrincipal,
            LandingTemplatesRepository
        >(LandingTemplateCatalogEntity, {
            read: ({ ids, principal }) =>
                Effect.gen(function* () {
                    if (ids.some((id) => id !== principal.domain_id))
                        return yield* Effect.fail(denied())
                    return ids.length === 0
                        ? []
                        : [
                              {
                                  id: principal.domain_id,
                                  values: yield* Effect.flatMap(
                                      LandingTemplatesRepository,
                                      (repository) => repository.load(principal)
                                  ),
                              },
                          ]
                }).pipe(Effect.mapError(denied)),
        }),
    ],
    queries: [
        RemoteServer.query(
            LandingTemplateCatalogQuery,
            ({
                input,
                principal,
            }: {
                input: typeof LandingTemplateCatalogQuery.Input.Type
                principal: LandingTemplatesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (input.domain_id !== principal.domain_id)
                        return yield* Effect.fail(denied())
                    yield* Effect.flatMap(
                        LandingTemplatesRepository,
                        (repository) => repository.load(principal)
                    )
                    return {
                        edges: [
                            {
                                entity: LandingTemplateCatalogEntity.name,
                                id: principal.domain_id,
                                key: entityKey(
                                    LandingTemplateCatalogEntity.name,
                                    principal.domain_id
                                ),
                            },
                        ],
                        start: terminal,
                        end: terminal,
                    }
                }).pipe(Effect.mapError(denied))
        ),
    ],
    mutations: [
        RemoteServer.mutation(
            SaveLandingTemplate,
            ({
                input,
                principal,
            }: {
                input: typeof SaveLandingTemplate.Input.Type
                principal: LandingTemplatesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(denied())
                    const output = yield* Effect.flatMap(
                        LandingTemplatesRepository,
                        (repository) =>
                            repository.save(principal, input.template)
                    )
                    return {
                        output,
                        entities: [
                            Entity.patch(
                                LandingTemplateCatalogEntity.ref(
                                    principal.domain_id
                                ),
                                output.catalog
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
        RemoteServer.mutation(
            RemoveLandingTemplate,
            ({
                input,
                principal,
            }: {
                input: typeof RemoveLandingTemplate.Input.Type
                principal: LandingTemplatesPrincipal
            }) =>
                Effect.gen(function* () {
                    if (
                        input.domain_id !== principal.domain_id ||
                        input.account_id !== principal.account_id
                    )
                        return yield* Effect.fail(denied())
                    const output = yield* Effect.flatMap(
                        LandingTemplatesRepository,
                        (repository) =>
                            repository.remove(principal, input.template_id)
                    )
                    return {
                        output,
                        entities: [
                            Entity.patch(
                                LandingTemplateCatalogEntity.ref(
                                    principal.domain_id
                                ),
                                output.catalog
                            ),
                        ],
                    }
                }).pipe(Effect.mapError(denied))
        ),
    ],
})
RemoteServer.validate(LandingTemplatesRemote, LandingTemplatesServer)
