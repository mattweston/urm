# Longo Rhythm Stack

                    ┌────────────────────┐
                    │ Subscription clock │
                    └─────────┬──────────┘
                              │
                       AdvancedPulse
                              │
                              ▼
                    ┌────────────────────┐
                    │       update       │
                    │   step N → N + 1   │
                    └─────────┬──────────┘
                              │
                    PlayRhythmSounds
                              │
                              ▼
                    ┌────────────────────┐
                    │      Command       │
                    │     Web Audio      │
                    └────────────────────┘

Drop this folder into:

`packages/features/src/labs/media/rhythm-stack/`

The Submodel implements:

- a permanent 12/8 eighth-note clock felt as four 4/4 beats;
- continuous sticking:
  `LH RH LH | RH LH RH | LH RH LH | RH LH RH`;
- a conceptual bass-drum pulse on each 4/4 beat;
- toggleable overlays:
    - 6/8 = `3-3-3-3` — `boom bap boom bap`
    - 5/4 = `3-3-2-2` — `boom bap boom bap`
    - 7/4 = `3-3-4-4` — `boom bap boom bap`
    - 2/4 = `3-3-2` — `boom boom bap`
    - 3/4 = `4-4-4` — `boom bap bap`
- simple Web Audio tones for the bass pulse and boom/bap onsets;
- tempo, play/stop and reset controls.

## Integration

This zip intentionally contains only the new Submodel. Wire it into the parent
Labs/Media Model, Message, update, subscriptions and view using the same child
Submodel pattern as the rest of the app.

The implementation follows the APIs currently visible in
`packages/features/src/labs/media/streaming`, while keeping state, timing and
audio isolated inside this feature.

## First-pass note

The existing media feature currently uses the tuple-style update return and
`m(...)` Message constructors, so this first-pass code mirrors those concrete
consumer APIs for easier integration. If your active branch has already moved
the app onto the newer `.context/foldkit` `Update.Return` /
`defineMessageUnion()` APIs, adapt those two surfaces while keeping the domain
model/view/subscription logic unchanged.
