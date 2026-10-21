import { Array, Option } from "effect"
import type { Command } from "foldkit"

import { Slider } from "@foldkit/ui"

import { GenerateAmbientParticle } from "./command.ts"
import {
    FLOW_STRENGTH_MAX,
    FLOW_STRENGTH_MIN,
    FLOW_STRENGTH_STEP,
    INITIAL_FLOW_STRENGTH,
    INITIAL_NOISE_SCALE,
    INITIAL_PARTICLE_COUNT,
    NOISE_SCALE_MAX_DIVISOR,
    NOISE_SCALE_MIN_DIVISOR,
    NOISE_SCALE_STEP,
} from "./constant.ts"
import type { GenerativeArtMessage } from "./message.ts"
import type { GenerativeArtModel } from "./model.ts"

export const generativeArtInit = (): readonly [
    GenerativeArtModel,
    ReadonlyArray<Command.Command<GenerativeArtMessage>>,
] => [
    {
        particles: [],
        nextId: 0,
        elapsedSeconds: 0,
        maybeMousePosition: Option.none(),
        isRunning: true,
        flowStrength: INITIAL_FLOW_STRENGTH,
        flowStrengthSlider: Slider.init({
            id: "generative-art-flow-strength",
            min: FLOW_STRENGTH_MIN,
            max: FLOW_STRENGTH_MAX,
            step: FLOW_STRENGTH_STEP,
        }),
        noiseScale: INITIAL_NOISE_SCALE,
        noiseScaleSlider: Slider.init({
            id: "generative-art-noise-scale",
            min: NOISE_SCALE_MIN_DIVISOR,
            max: NOISE_SCALE_MAX_DIVISOR,
            step: NOISE_SCALE_STEP,
        }),
    },
    Array.makeBy(INITIAL_PARTICLE_COUNT, () => GenerateAmbientParticle()),
]
