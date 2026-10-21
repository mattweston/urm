import { loadEnvironmentConfig } from "@urm/database/config"
import {
    CloudflareRestEmailTransportLive,
    DemoEmailTransportLive,
} from "@urm/email"
import { CloudflareEmailConfigLive } from "@urm/env/server"
import { Effect, Layer } from "effect"

const ProductionEmailTransportLive = CloudflareRestEmailTransportLive.pipe(
    Layer.provide(CloudflareEmailConfigLive)
)

/** Chooses the no-send transport for every demo process at startup. */
export const RuntimeEmailTransportLive = Layer.unwrap(
    loadEnvironmentConfig.pipe(
        Effect.map((environment) =>
            environment.is_demo
                ? DemoEmailTransportLive
                : ProductionEmailTransportLive
        )
    )
)
