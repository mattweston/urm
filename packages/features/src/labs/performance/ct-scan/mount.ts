import { Effect } from "effect"
import { Mount } from "foldkit"

import { CompletedMountedCtScan } from "./message.ts"

const CT_STYLESHEET_URL = "https://csswizardry.com/ct/ct.css"

export const MountCtScan = Mount.define("MountCtScan", {
    messages: [CompletedMountedCtScan],
    execute: () =>
        Effect.acquireRelease(
            Effect.sync(() => {
                const stylesheet = document.createElement("link")
                stylesheet.rel = "stylesheet"
                stylesheet.href = CT_STYLESHEET_URL
                stylesheet.classList.add("ct")
                document.head.append(stylesheet)

                const reduce_motion = window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                ).matches
                window.scrollTo({
                    top: 0,
                    behavior: reduce_motion ? "auto" : "smooth",
                })

                return stylesheet
            }),
            (stylesheet) => Effect.sync(() => stylesheet.remove())
        ).pipe(Effect.as(CompletedMountedCtScan())),
})
