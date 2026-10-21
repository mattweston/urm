import { Option } from "effect"
import type abcjs from "abcjs"

// The synth controller owns audio nodes and the rendered tune owns a DOM
// subtree, so neither can live in the Model. They are kept here beside the
// element they belong to, the same way the map demos keep their map instance.

export const HOST_ID = "abc-synth-container"

const controllersByHostId = new Map<string, abcjs.SynthObjectController>()
const renderedTunesByHostId = new Map<string, abcjs.TuneObject>()

// abcjs reads the callback off this object on every play, so the same object
// has to be handed to `load` and mutated later rather than replaced.
const cursorControlsByHostId = new Map<string, { onFinished?: () => void }>()

export const getController = (
    hostId: string
): Option.Option<abcjs.SynthObjectController> =>
    Option.fromNullishOr(controllersByHostId.get(hostId))

export const setController = (
    hostId: string,
    controller: abcjs.SynthObjectController
): void => {
    controllersByHostId.set(hostId, controller)
}

export const getRenderedTune = (
    hostId: string
): Option.Option<abcjs.TuneObject> =>
    Option.fromNullishOr(renderedTunesByHostId.get(hostId))

export const setRenderedTune = (
    hostId: string,
    tune: abcjs.TuneObject
): void => {
    renderedTunesByHostId.set(hostId, tune)
}

export const cursorControl = (hostId: string): { onFinished?: () => void } => {
    const existing = cursorControlsByHostId.get(hostId)
    if (existing !== undefined) {
        return existing
    }

    const created: { onFinished?: () => void } = {}
    cursorControlsByHostId.set(hostId, created)

    return created
}
