import * as Alchemy from "alchemy"
import { adopt } from "alchemy/AdoptPolicy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import { retain } from "alchemy/RemovalPolicy"

const ROOT_ZONE = "urm.dev"

export default Alchemy.Stack(
    "UrmEmailRouting",
    {
        providers: Cloudflare.providers(),
        state: Cloudflare.state(),
    },
    Effect.gen(function* () {
        const forward_to = yield* Config.string("URM_EMAIL_FORWARD_TO")
        const zone = yield* Cloudflare.Zone.Zone("UrmRoutingZone", {
            name: ROOT_ZONE,
        }).pipe(adopt(true))
        const routing = yield* Cloudflare.Email.Routing(
            "PlatformEmailRouting",
            { zone: zone.zoneId }
        ).pipe(retain())
        const destination = yield* Cloudflare.Email.Address(
            "PlatformEmailDestination",
            { email: forward_to }
        ).pipe(retain())
        const forward = (local_part: string) =>
            Cloudflare.Email.Rule(`Platform${local_part}Forward`, {
                zone: zone.zoneId,
                name: `Forward ${local_part}@${ROOT_ZONE}`,
                matchers: [
                    {
                        type: "literal",
                        field: "to",
                        value: `${local_part.toLowerCase()}@${ROOT_ZONE}`,
                    },
                ],
                actions: [{ type: "forward", value: [destination.email] }],
            })

        const hello = yield* forward("Hello")
        const support = yield* forward("Support")
        const privacy = yield* forward("Privacy")
        const postmaster = yield* forward("Postmaster")

        return {
            routing: {
                enabled: routing.enabled,
                status: routing.status,
            },
            destination: {
                email: destination.email,
                verified: destination.verified,
            },
            rules: [
                hello.ruleId,
                support.ruleId,
                privacy.ruleId,
                postmaster.ruleId,
            ],
        }
    })
)
