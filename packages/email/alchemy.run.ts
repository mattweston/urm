import * as Alchemy from "alchemy"
import { adopt } from "alchemy/AdoptPolicy"
import * as Cloudflare from "alchemy/Cloudflare"
import * as Effect from "effect/Effect"

const ROOT_ZONE = "urm.dev"

export default Alchemy.Stack(
    "UrmEmail",
    {
        providers: Cloudflare.providers(),
        state: Cloudflare.state(),
    },
    Effect.gen(function* () {
        const zone = yield* Cloudflare.Zone.Zone("UrmZone", {
            name: ROOT_ZONE,
        }).pipe(adopt(true))
        const transactional = yield* Cloudflare.Email.SendingSubdomain(
            "PlatformTransactionalEmail",
            {
                zoneId: zone.zoneId,
                name: `mail.${ROOT_ZONE}`,
            }
        ).pipe(adopt(true))
        const newsletter = yield* Cloudflare.Email.SendingSubdomain(
            "PlatformNewsletterEmail",
            {
                zoneId: zone.zoneId,
                name: `newsletter.${ROOT_ZONE}`,
            }
        ).pipe(adopt(true))

        return {
            transactional: {
                domain: transactional.name,
                enabled: transactional.enabled,
            },
            newsletter: {
                domain: newsletter.name,
                enabled: newsletter.enabled,
            },
        }
    })
)
