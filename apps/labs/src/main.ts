/** # Labs application shell
 *
 *  Model, Message, init, update and view for the labs app.
 *
 *  Each stateful lab under `src/<topic>/` owns its Model, Message, update and
 *  view, and joins the shell in four places: a field on the Model, its init in
 *  `init`, a `Got<Lab>Message` arm in `update`, and a branch in `view`. The
 *  labs that answer a path without state are left to `labs_view`, which takes
 *  the path and an `HtmlBuilder`.
 *
 *  The routed lessons under `/labs/learn` need the ManagedResources and the
 *  three services `Learn.Services` names, so the lesson index is what the shell
 *  shows for them today.
 */
import { Match as M, Option, Schema as S } from "effect"
import {
    Command,
    ManagedResource,
    Subscription,
    type Update,
} from "foldkit"
import type { Document, Html, HtmlBuilder } from "foldkit/html"
import { taggedStruct } from "foldkit/schema"
import type { Url } from "foldkit/url"

import * as BreachCheck from "./auth/breach-check/submodel.ts"
import * as OtpField from "./auth/otp-field/submodel.ts"
import * as Spreadsheets from "./data/spreadsheets/submodel.ts"
import * as DomDepth from "./design/dom-depth-visualizer/submodel.ts"
import * as Maps from "./events/map/submodel.ts"
import * as Gallery from "./media/3d-gallery/submodel.ts"
import * as Cuelume from "./media/audio/cuelume/submodel.ts"
import * as GalleryTransitions from "./media/gallery-view-transitions/submodel.ts"
import * as MusicNotation from "./media/music-notation/submodel.ts"
import * as YouTubeEmbed from "./media/youtube-embed/submodel.ts"
import * as ManagedResourceLayer from "@urm/features/labs/managed-resource-layer"
import * as EffectRunner from "@urm/features/labs/runner"
import * as FoldkitLesson from "@urm/features/labs/walkthrough"
import { route_title as learn_route_title } from "./nav.ts"
import * as Learn from "./submodel.ts"
import * as QuerySyncTable from "./routing/query-sync-table/submodel.ts"
import { loadExternal, navigateInternal } from "./routing/commands.ts"
import {
    ChangedUrl,
    ClickedLink,
    CompletedLoadExternal,
    CompletedNavigateInternal,
} from "./routing/message.ts"
import { DesktopRoute, labsHref, routeForUrl } from "./routing/route.ts"
import * as SearchBar from "./search/search-bar/submodel.ts"
import * as ServicesCanvas from "./settings/services-canvas/submodel.ts"
import * as Charting from "./stats/charting/submodel.ts"
import * as SlowWarnings from "./sysadmin/slow-warnings/submodel.ts"
import * as VariableFonts from "./typography/variable-fonts/submodel.ts"
import { is_ui_path } from "./ui/catalog.ts"
import * as UiLabs from "./ui/submodel.ts"
import { view as labs_view } from "./view.ts"

// MODEL

export const Model = S.Struct({
    route: DesktopRoute,
    breach_check: BreachCheck.Model,
    charting: Charting.Model,
    cuelume: Cuelume.Model,
    dom_depth: DomDepth.Model,
    gallery: Gallery.Model,
    gallery_transitions: GalleryTransitions.Model,
    learn: Learn.Model,
    maps: Maps.Model,
    music_notation: MusicNotation.Model,
    otp_field: OtpField.Model,
    query_sync_table: QuerySyncTable.Model,
    search_bar: SearchBar.Model,
    services_canvas: ServicesCanvas.Model,
    slow_warnings: SlowWarnings.Model,
    spreadsheets: Spreadsheets.Model,
    ui: UiLabs.Model,
    variable_fonts: VariableFonts.Model,
    youtube: YouTubeEmbed.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const GotBreachCheckMessage = taggedStruct("GotBreachCheckMessage", {
    message: BreachCheck.Message,
})
export const GotChartingMessage = taggedStruct("GotChartingMessage", {
    message: Charting.Message,
})
export const GotCuelumeMessage = taggedStruct("GotCuelumeMessage", {
    message: Cuelume.Message,
})
export const GotDomDepthMessage = taggedStruct("GotDomDepthMessage", {
    message: DomDepth.Message,
})
export const GotGalleryMessage = taggedStruct("GotGalleryMessage", {
    message: Gallery.Message,
})
export const GotGalleryTransitionsMessage = taggedStruct(
    "GotGalleryTransitionsMessage",
    { message: GalleryTransitions.Message }
)
export const GotLearnMessage = taggedStruct("GotLearnMessage", {
    message: Learn.Message,
})
export const GotMapsMessage = taggedStruct("GotMapsMessage", {
    message: Maps.Message,
})
export const GotMusicNotationMessage = taggedStruct("GotMusicNotationMessage", {
    message: MusicNotation.Message,
})
export const GotOtpFieldMessage = taggedStruct("GotOtpFieldMessage", {
    message: OtpField.Message,
})
export const GotQuerySyncTableMessage = taggedStruct(
    "GotQuerySyncTableMessage",
    { message: QuerySyncTable.Message }
)
export const GotSearchBarMessage = taggedStruct("GotSearchBarMessage", {
    message: SearchBar.Message,
})
export const GotServicesCanvasMessage = taggedStruct(
    "GotServicesCanvasMessage",
    { message: ServicesCanvas.Message }
)
export const GotSlowWarningsMessage = taggedStruct("GotSlowWarningsMessage", {
    message: SlowWarnings.Message,
})
export const GotSpreadsheetsMessage = taggedStruct("GotSpreadsheetsMessage", {
    message: Spreadsheets.Message,
})
export const GotUiMessage = taggedStruct("GotUiMessage", {
    message: UiLabs.Message,
})
export const GotVariableFontsMessage = taggedStruct("GotVariableFontsMessage", {
    message: VariableFonts.Message,
})
export const GotYouTubeMessage = taggedStruct("GotYouTubeMessage", {
    message: YouTubeEmbed.Message,
})

export const Message = S.Union([
    ChangedUrl,
    ClickedLink,
    CompletedNavigateInternal,
    CompletedLoadExternal,
    GotBreachCheckMessage,
    GotChartingMessage,
    GotCuelumeMessage,
    GotDomDepthMessage,
    GotGalleryMessage,
    GotGalleryTransitionsMessage,
    GotLearnMessage,
    GotMapsMessage,
    GotMusicNotationMessage,
    GotOtpFieldMessage,
    GotQuerySyncTableMessage,
    GotSearchBarMessage,
    GotServicesCanvasMessage,
    GotSlowWarningsMessage,
    GotSpreadsheetsMessage,
    GotUiMessage,
    GotVariableFontsMessage,
    GotYouTubeMessage,
])
export type Message = typeof Message.Type

export type Services = BreachCheck.BreachCheckApi | Learn.Services

type UpdateReturn = Update.Return<Model, Message, Services>
type Commands = ReadonlyArray<Command.Command<Message, never, Services>>

// INIT

const learn_path_of = (route: DesktopRoute): string =>
    route._tag === "Learn" ? route.learn_path : ""

export const init = (url: Url): UpdateReturn => {
    const route = routeForUrl(url)
    const [learn, learn_commands] = Learn.init(learn_path_of(route))
    const [maps, maps_commands] = Maps.init(route)
    const [charting, charting_commands] = Charting.init(route)
    const [dom_depth, dom_depth_commands] = DomDepth.init(route)
    const [gallery, gallery_commands] = Gallery.init(route)
    const spreadsheets = Spreadsheets.init(route)
    const [ui, ui_commands] = UiLabs.init(route)

    return {
        model: {
            route,
            breach_check: BreachCheck.init(route),
            charting,
            cuelume: Cuelume.init(route),
            dom_depth,
            gallery,
            gallery_transitions: GalleryTransitions.init(route),
            learn,
            maps,
            music_notation: MusicNotation.init(route),
            otp_field: OtpField.init(route),
            query_sync_table: QuerySyncTable.init(route),
            search_bar: SearchBar.init(),
            services_canvas: ServicesCanvas.init(route),
            slow_warnings: SlowWarnings.init(route),
            spreadsheets: spreadsheets.model,
            ui,
            variable_fonts: VariableFonts.init(route),
            youtube: YouTubeEmbed.init(route),
        },
        commands: [
            ...Command.mapMessages(charting_commands, (message) =>
                GotChartingMessage({ message })
            ),
            ...Command.mapMessages(dom_depth_commands, (message) =>
                GotDomDepthMessage({ message })
            ),
            ...Command.mapMessages(gallery_commands, (message) =>
                GotGalleryMessage({ message })
            ),
            ...Command.mapMessages(learn_commands, (message) =>
                GotLearnMessage({ message })
            ),
            ...Command.mapMessages(maps_commands, (message) =>
                GotMapsMessage({ message })
            ),
            ...Command.mapMessages(spreadsheets.commands ?? [], (message) =>
                GotSpreadsheetsMessage({ message })
            ),
            ...Command.mapMessages(ui_commands, (message) =>
                GotUiMessage({ message })
            ),
        ],
    }
}

// UPDATE

const changed_route = (model: Model, route: DesktopRoute): UpdateReturn => {
    const [charting, charting_commands] = Charting.changed_route(
        model.charting,
        route
    )
    const [dom_depth, dom_depth_commands] = DomDepth.changed_route(
        model.dom_depth,
        route
    )
    const [gallery, gallery_commands] = Gallery.changed_route(
        model.gallery,
        route
    )
    const [learn, learn_commands] = Learn.changed_route(
        model.learn,
        learn_path_of(route),
        learn_path_of(model.route)
    )
    const [maps, maps_commands] = Maps.changed_route(
        model.maps,
        model.route,
        route
    )
    const [music_notation, music_notation_commands] =
        MusicNotation.changed_route(model.music_notation, route)
    const spreadsheets = Spreadsheets.changed_route(model.spreadsheets, route)
    const [ui, ui_commands] = UiLabs.changed_route(model.ui, route)

    return {
        model: {
            ...model,
            route,
            breach_check: BreachCheck.changed_route(model.breach_check, route),
            charting,
            cuelume: Cuelume.changed_route(model.cuelume, route),
            dom_depth,
            gallery,
            gallery_transitions: GalleryTransitions.changed_route(
                model.gallery_transitions,
                route
            ),
            learn,
            maps,
            music_notation,
            otp_field: OtpField.changed_route(model.otp_field, route),
            query_sync_table: QuerySyncTable.changed_route(
                model.query_sync_table,
                route
            ),
            search_bar: SearchBar.changed_route(),
            services_canvas: ServicesCanvas.changed_route(
                model.services_canvas,
                route
            ),
            slow_warnings: SlowWarnings.changed_route(
                model.slow_warnings,
                route
            ),
            spreadsheets: spreadsheets.model,
            ui,
            variable_fonts: VariableFonts.changed_route(
                model.variable_fonts,
                route
            ),
            youtube: YouTubeEmbed.changed_route(model.youtube, route),
        },
        commands: [
            ...Command.mapMessages(charting_commands, (message) =>
                GotChartingMessage({ message })
            ),
            ...Command.mapMessages(dom_depth_commands, (message) =>
                GotDomDepthMessage({ message })
            ),
            ...Command.mapMessages(gallery_commands, (message) =>
                GotGalleryMessage({ message })
            ),
            ...Command.mapMessages(learn_commands, (message) =>
                GotLearnMessage({ message })
            ),
            ...Command.mapMessages(maps_commands, (message) =>
                GotMapsMessage({ message })
            ),
            ...Command.mapMessages(music_notation_commands, (message) =>
                GotMusicNotationMessage({ message })
            ),
            ...Command.mapMessages(spreadsheets.commands ?? [], (message) =>
                GotSpreadsheetsMessage({ message })
            ),
            ...Command.mapMessages(ui_commands, (message) =>
                GotUiMessage({ message })
            ),
        ],
    }
}

export const update = (model: Model, message: Message): UpdateReturn =>
    M.value(message).pipe(
        M.withReturnType<UpdateReturn>(),
        M.tagsExhaustive({
            ChangedUrl: ({ url }) => changed_route(model, routeForUrl(url)),
            ClickedLink: ({ request }) =>
                M.value(request).pipe(
                    M.withReturnType<UpdateReturn>(),
                    M.tagsExhaustive({
                        Internal: ({ url }) => ({
                            model,
                            commands: [navigateInternal(url)] as Commands,
                        }),
                        External: ({ href }) => ({
                            model,
                            commands: [loadExternal(href)] as Commands,
                        }),
                    })
                ),
            CompletedNavigateInternal: () => ({ model }),
            CompletedLoadExternal: () => ({ model }),
            GotBreachCheckMessage: ({ message: child }) => {
                const [breach_check, commands] = BreachCheck.update(
                    model.breach_check,
                    child
                )
                return {
                    model: { ...model, breach_check },
                    commands: Command.mapMessages(commands, (message) =>
                        GotBreachCheckMessage({ message })
                    ),
                }
            },
            GotChartingMessage: ({ message: child }) => {
                const [charting, commands] = Charting.update(
                    model.charting,
                    child
                )
                return {
                    model: { ...model, charting },
                    commands: Command.mapMessages(commands, (message) =>
                        GotChartingMessage({ message })
                    ),
                }
            },
            GotCuelumeMessage: ({ message: child }) => {
                const [cuelume, commands] = Cuelume.update(model.cuelume, child)
                return {
                    model: { ...model, cuelume },
                    commands: Command.mapMessages(commands, (message) =>
                        GotCuelumeMessage({ message })
                    ),
                }
            },
            GotDomDepthMessage: ({ message: child }) => {
                const [dom_depth, commands] = DomDepth.update(
                    model.dom_depth,
                    child
                )
                return {
                    model: { ...model, dom_depth },
                    commands: Command.mapMessages(commands, (message) =>
                        GotDomDepthMessage({ message })
                    ),
                }
            },
            GotGalleryMessage: ({ message: child }) => {
                const [gallery, commands] = Gallery.update(model.gallery, child)
                return {
                    model: { ...model, gallery },
                    commands: Command.mapMessages(commands, (message) =>
                        GotGalleryMessage({ message })
                    ),
                }
            },
            GotGalleryTransitionsMessage: ({ message: child }) => {
                const [gallery_transitions] = GalleryTransitions.update(
                    model.gallery_transitions,
                    child
                )
                return { model: { ...model, gallery_transitions } }
            },
            GotLearnMessage: ({ message: child }) => {
                const [learn, commands] = Learn.update(model.learn, child)
                return {
                    model: { ...model, learn },
                    commands: Command.mapMessages(commands, (message) =>
                        GotLearnMessage({ message })
                    ),
                }
            },
            GotMapsMessage: ({ message: child }) => {
                const [maps, commands] = Maps.update(model.maps, child)
                return {
                    model: { ...model, maps },
                    commands: Command.mapMessages(commands, (message) =>
                        GotMapsMessage({ message })
                    ),
                }
            },
            GotMusicNotationMessage: ({ message: child }) => {
                const [music_notation, commands] = MusicNotation.update(
                    model.music_notation,
                    child
                )
                return {
                    model: { ...model, music_notation },
                    commands: Command.mapMessages(commands, (message) =>
                        GotMusicNotationMessage({ message })
                    ),
                }
            },
            GotOtpFieldMessage: ({ message: child }) => {
                const [otp_field, commands] = OtpField.update(
                    model.otp_field,
                    child
                )
                return {
                    model: { ...model, otp_field },
                    commands: Command.mapMessages(commands, (message) =>
                        GotOtpFieldMessage({ message })
                    ),
                }
            },
            GotQuerySyncTableMessage: ({ message: child }) => {
                const next = QuerySyncTable.update(
                    model.query_sync_table,
                    child
                )
                return {
                    model: { ...model, query_sync_table: next.model },
                    commands: Command.mapMessages(
                        next.commands ?? [],
                        (message) => GotQuerySyncTableMessage({ message })
                    ),
                }
            },
            GotSearchBarMessage: ({ message: child }) => {
                const next = SearchBar.update(model.search_bar, child)
                return { model: { ...model, search_bar: next.model } }
            },
            GotServicesCanvasMessage: ({ message: child }) => ({
                model: {
                    ...model,
                    services_canvas: ServicesCanvas.update(
                        model.services_canvas,
                        child
                    ),
                },
            }),
            GotSlowWarningsMessage: ({ message: child }) => {
                const [slow_warnings, commands] = SlowWarnings.update(
                    model.slow_warnings,
                    child
                )
                return {
                    model: { ...model, slow_warnings },
                    commands: Command.mapMessages(commands, (message) =>
                        GotSlowWarningsMessage({ message })
                    ),
                }
            },
            GotSpreadsheetsMessage: ({ message: child }) => {
                const next = Spreadsheets.update(model.spreadsheets, child)
                return {
                    model: { ...model, spreadsheets: next.model },
                    commands: Command.mapMessages(
                        next.commands ?? [],
                        (message) => GotSpreadsheetsMessage({ message })
                    ),
                }
            },
            GotUiMessage: ({ message: child }) => {
                const [ui, commands] = UiLabs.update(model.ui, child)
                return {
                    model: { ...model, ui },
                    commands: Command.mapMessages(commands, (message) =>
                        GotUiMessage({ message })
                    ),
                }
            },
            GotVariableFontsMessage: ({ message: child }) => {
                const [variable_fonts, commands] = VariableFonts.update(
                    model.variable_fonts,
                    child
                )
                return {
                    model: { ...model, variable_fonts },
                    commands: Command.mapMessages(commands, (message) =>
                        GotVariableFontsMessage({ message })
                    ),
                }
            },
            GotYouTubeMessage: ({ message: child }) => {
                const [youtube, commands] = YouTubeEmbed.update(
                    model.youtube,
                    child
                )
                return {
                    model: { ...model, youtube },
                    commands: Command.mapMessages(commands, (message) =>
                        GotYouTubeMessage({ message })
                    ),
                }
            },
        })
    )

// SUBSCRIPTIONS

export const subscriptions = Subscription.aggregate<Model, Message>()(
    Subscription.lift(Spreadsheets.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.spreadsheets),
        toParentMessage: (message) => GotSpreadsheetsMessage({ message }),
    }),
    Subscription.lift(Charting.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.charting),
        toParentMessage: (message) => GotChartingMessage({ message }),
    }),
    Subscription.lift(SearchBar.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.search_bar),
        toParentMessage: (message) => GotSearchBarMessage({ message }),
    }),
    Subscription.lift(UiLabs.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.ui),
        toParentMessage: (message) => GotUiMessage({ message }),
    }),
    YouTubeEmbed.subscriptions<Model, Message>({
        read: (model) => Option.some(model.youtube),
        toParentMessage: (message) => GotYouTubeMessage({ message }),
    }),
    Maps.subscriptions<Model, Message>({
        read: (model) => Option.some(model.maps),
        toParentMessage: (message) => GotMapsMessage({ message }),
        when: (model) =>
            model.route._tag === "Labs" && Maps.isAppScope(model.route.labs_path),
    }),
    Subscription.lift(FoldkitLesson.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.learn.foldkit),
        toParentMessage: (message) =>
            GotLearnMessage({ message: Learn.GotFoldkitMessage({ message }) }),
        when: (model) =>
            model.route._tag === "Learn" &&
            FoldkitLesson.isFoldkitPath(model.route.learn_path),
    }),
    Subscription.lift(EffectRunner.subscriptions)<Model, Message>({
        read: (model) => Option.some(model.learn.effect_runner),
        toParentMessage: (message) =>
            GotLearnMessage({
                message: Learn.GotEffectRunnerMessage({ message }),
            }),
        when: (model) =>
            model.route._tag === "Learn" &&
            EffectRunner.isEffectExamplePath(model.route.learn_path),
    })
)

// MANAGED RESOURCES

/**
 * The lessons' external handles. A resource is released when its reader returns
 * None, which is how leaving a lesson's route tears its handle down.
 */
export const managedResources = ManagedResource.aggregate<Model, Message>()(
    ManagedResource.lift(ManagedResourceLayer.managedResources)<
        Model,
        Message
    >({
        read: (model) =>
            model.route._tag === "Learn" &&
            ManagedResourceLayer.isManagedResourceLayerPath(
                model.route.learn_path
            )
                ? Option.some(model.learn.managed_resource_layer)
                : Option.none(),
        toParentMessage: (message) =>
            GotLearnMessage({
                message: Learn.GotManagedResourceLayerMessage({ message }),
            }),
    }),
    ManagedResource.lift(FoldkitLesson.managedResources)<Model, Message>({
        read: (model) =>
            model.route._tag === "Learn" &&
            FoldkitLesson.isFoldkitPath(model.route.learn_path)
                ? Option.some(model.learn.foldkit)
                : Option.none(),
        toParentMessage: (message) =>
            GotLearnMessage({ message: Learn.GotFoldkitMessage({ message }) }),
    }),
    ManagedResource.lift(EffectRunner.managedResources)<Model, Message>({
        read: (model) =>
            model.route._tag === "Learn" &&
            EffectRunner.isEffectExamplePath(model.route.learn_path)
                ? Option.some(model.learn.effect_runner)
                : Option.none(),
        toParentMessage: (message) =>
            GotLearnMessage({
                message: Learn.GotEffectRunnerMessage({ message }),
            }),
    })
)

// VIEW

const lab_view = (model: Model, h: HtmlBuilder<Message>, path: string): Html => {
    if (BreachCheck.is_breach_check_path(path))
        return h.submodel({
            slotId: "labs-auth-breach-check",
            model: model.breach_check,
            view: BreachCheck.view,
            toParentMessage: (message) => GotBreachCheckMessage({ message }),
        })
    if (OtpField.is_otp_field_path(path))
        return h.submodel({
            slotId: "labs-auth-otp-field",
            model: model.otp_field,
            view: OtpField.view,
            toParentMessage: (message) => GotOtpFieldMessage({ message }),
        })
    if (Spreadsheets.is_spreadsheets_path(path))
        return h.submodel({
            slotId: "labs-data-spreadsheets",
            model: model.spreadsheets,
            view: Spreadsheets.view,
            toParentMessage: (message) => GotSpreadsheetsMessage({ message }),
        })
    if (Cuelume.is_cuelume_path(path))
        return h.submodel({
            slotId: "labs-media-audio-cuelume",
            model: model.cuelume,
            view: Cuelume.view,
            toParentMessage: (message) => GotCuelumeMessage({ message }),
        })
    if (DomDepth.is_dom_depth_path(path))
        return h.submodel({
            slotId: "labs-design-dom-depth",
            model: model.dom_depth,
            view: DomDepth.view,
            toParentMessage: (message) => GotDomDepthMessage({ message }),
        })
    if (Gallery.is_gallery_path(path))
        return h.submodel({
            slotId: "labs-media-3d-gallery",
            model: model.gallery,
            view: Gallery.view,
            toParentMessage: (message) => GotGalleryMessage({ message }),
        })
    if (GalleryTransitions.is_gallery_path(path))
        return h.submodel({
            slotId: "labs-media-gallery-transitions",
            model: model.gallery_transitions,
            view: GalleryTransitions.view,
            toParentMessage: (message) =>
                GotGalleryTransitionsMessage({ message }),
        })
    if (Maps.isAppScope(path))
        return h.submodel({
            slotId: "labs-events-map",
            model: model.maps,
            view: Maps.view,
            viewInputs: {},
            toParentMessage: (message) => GotMapsMessage({ message }),
        })
    if (MusicNotation.is_music_notation_path(path))
        return h.submodel({
            slotId: "labs-media-music-notation",
            model: model.music_notation,
            view: MusicNotation.view,
            toParentMessage: (message) => GotMusicNotationMessage({ message }),
        })
    if (YouTubeEmbed.is_embed_path(path))
        return h.submodel({
            slotId: "labs-media-youtube-embed",
            model: model.youtube,
            view: YouTubeEmbed.view,
            toParentMessage: (message) => GotYouTubeMessage({ message }),
        })
    if (QuerySyncTable.is_query_sync_table_path(path))
        return h.submodel({
            slotId: "labs-routing-query-sync-table",
            model: model.query_sync_table,
            view: QuerySyncTable.view,
            toParentMessage: (message) =>
                GotQuerySyncTableMessage({ message }),
        })
    if (ServicesCanvas.is_services_canvas_path(path))
        return h.submodel({
            slotId: "labs-settings-services-canvas",
            model: model.services_canvas,
            view: ServicesCanvas.view,
            toParentMessage: (message) =>
                GotServicesCanvasMessage({ message }),
        })
    if (Charting.is_charting_path(path))
        return h.submodel({
            slotId: "labs-stats-charting",
            model: model.charting,
            view: Charting.view,
            toParentMessage: (message) => GotChartingMessage({ message }),
        })
    if (SlowWarnings.is_slow_warnings_path(path))
        return h.submodel({
            slotId: "labs-sysadmin-slow-warnings",
            model: model.slow_warnings,
            view: SlowWarnings.view,
            toParentMessage: (message) => GotSlowWarningsMessage({ message }),
        })
    if (VariableFonts.is_variable_fonts_path(path))
        return h.submodel({
            slotId: "labs-typography-variable-fonts",
            model: model.variable_fonts,
            view: VariableFonts.view,
            toParentMessage: (message) => GotVariableFontsMessage({ message }),
        })
    if (is_ui_path(path))
        return h.submodel({
            slotId: "labs-ui",
            model: model.ui,
            view: UiLabs.view,
            toParentMessage: (message) => GotUiMessage({ message }),
        })

    return labs_view(h, path)
}

const elsewhere_view = (h: HtmlBuilder<Message>) =>
    h.main(
        [h.Class("mx-auto grid w-full max-w-2xl gap-4 px-4 py-10 sm:px-6")],
        [
            h.h1([h.Class("text-2xl font-semibold")], ["Not a labs route"]),
            h.p(
                [h.Class("text-muted-foreground")],
                [
                    "This app serves the labs. Everything else belongs to urm.dev.",
                ]
            ),
            h.a(
                [h.Href(labsHref()), h.Class("underline underline-offset-4")],
                ["Go to the labs index"]
            ),
        ]
    )

// The theme tokens are carried by the app's own container, as urm.dev carries
// them: `body` itself stays untouched.
const shell = (h: HtmlBuilder<Message>, content: Html): Html =>
    h.div([h.Class("min-h-dvh bg-background text-foreground")], [content])

export const view = (model: Model, h: HtmlBuilder<Message>): Document =>
    model.route._tag === "Labs"
        ? {
              title: "Labs · URM",
              body: shell(h, lab_view(model, h, model.route.labs_path)),
          }
        : model.route._tag === "Learn"
          ? {
                title: learn_route_title(model.route.learn_path, undefined),
                body: shell(
                    h,
                    Learn.view(
                        model.learn,
                        model.route.learn_path,
                        (message) => GotLearnMessage({ message }),
                        h
                    )
                ),
            }
          : { title: "Labs · URM", body: shell(h, elsewhere_view(h)) }
