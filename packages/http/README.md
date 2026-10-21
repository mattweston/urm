# Urm API

<!--https://brokenthorn.github.io/effect-for-typescript-ch1/-->

## Hono Effect

- [Hono Open API Effect](https://honohub.dev/docs/openapi/effect)
- [Hono Effect Validator](https://www.npmjs.com/package/@hono/effect-validator)
- [TS Starter Effect Hono](https://github.com/mchlggr/ts-starter-effect-hono/blob/main/src/app.ts)

External APIs: Bento/Stripe/Instagram/Ticketlight

HTTP REST

- **RPC** for things that benefit from streaming or procedure semantics, `ApiClient.rpc.users.getUser(...)`
- **HTTP** for standard endpoints that external clients might hit.
- You pick the right tool per call site, both from the same service.

<!--If bundle size is the only thing that counts in your case you can also generate a client via openapi that HttpApi provides for free : see Accountability-->
