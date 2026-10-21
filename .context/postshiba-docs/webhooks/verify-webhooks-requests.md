# Verify webhook requests

> Check the HMAC-SHA256 signature on every webhook before you trust it.

Every webhook POST is signed with your endpoint's secret. Recompute the signature from the raw body and compare it before you parse the JSON.

## How signing works

| Header | Value |
| --- | --- |
| `X-Capsule-Timestamp` | Unix time, as a string, when the request was signed. |
| `X-Capsule-Signature` | `sha256=` followed by the hex HMAC-SHA256 of `{timestamp}.{body}`, keyed with the secret. |

`{body}` is the exact bytes of the request body. Delivery webhooks use the endpoint's **Signing secret** (`secret` in the API). [Inbox webhooks](/docs/dashboard/receiving/create-receiving-webhook) use the same headers, keyed with the inbox's `webhook_secret`.

## Verify a request

1. Read the raw request body before any JSON parsing. Re-serialized JSON won't match.
2. Read `X-Capsule-Timestamp` and `X-Capsule-Signature`.
3. Compute the HMAC-SHA256 of `{timestamp}.{body}` with your secret, as lowercase hex.
4. Strip `sha256=` from the header and compare the two values in constant time.
5. Reject the request with `401` if they don't match.

Each attempt, including a retry, is signed with a fresh timestamp. To guard against replayed requests, you can also reject timestamps more than a few minutes old.

## With an SDK

The Node.js and Ruby SDKs include a verify helper. Install them from [SDKs](/docs/sdks).

```javascript verify.js
import { PostShiba } from "postshiba"

const postshiba = new PostShiba(process.env.POSTSHIBA_API_KEY)

const ok = postshiba.webhooks.verify(
  rawBody,
  request.headers["x-capsule-timestamp"],
  request.headers["x-capsule-signature"],
  process.env.POSTSHIBA_WEBHOOK_SECRET
)
```

```ruby verify.rb
require "postshiba"

ok = PostShiba::Webhooks.verify(
  payload: request.raw_post,
  signature: request.headers["X-Capsule-Signature"],
  timestamp: request.headers["X-Capsule-Timestamp"],
  secret: ENV["POSTSHIBA_WEBHOOK_SECRET"]
)
```

## Without an SDK

Any HMAC library works. These use only the standard library.

```javascript verify-express.js
import express from "express"
import { createHmac, timingSafeEqual } from "node:crypto"

const app = express()

app.post("/webhooks/postshiba", express.raw({ type: "application/json" }), (req, res) => {
  const timestamp = req.get("X-Capsule-Timestamp") || ""
  const given = (req.get("X-Capsule-Signature") || "").replace(/^sha256=/, "")
  const expected = createHmac("sha256", process.env.POSTSHIBA_WEBHOOK_SECRET)
    .update(`${timestamp}.${req.body}`)
    .digest("hex")

  const a = Buffer.from(expected)
  const b = Buffer.from(given)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.sendStatus(401)
  }

  for (const event of JSON.parse(req.body)) {
    console.log(event.event, event.email, event.sg_event_id)
  }
  res.sendStatus(204)
})
```

```python verify.py
import hashlib
import hmac
import os


def verify(raw_body: bytes, timestamp: str, signature: str) -> bool:
    secret = os.environ["POSTSHIBA_WEBHOOK_SECRET"].encode()
    signed = timestamp.encode() + b"." + raw_body
    expected = hmac.new(secret, signed, hashlib.sha256).hexdigest()
    given = signature.removeprefix("sha256=")
    return hmac.compare_digest(expected, given)
```

```ruby verify-openssl.rb
require "openssl"

def verify(raw_body, timestamp, signature)
  expected = OpenSSL::HMAC.hexdigest("SHA256", ENV.fetch("POSTSHIBA_WEBHOOK_SECRET"), "#{timestamp}.#{raw_body}")
  given = signature.to_s.delete_prefix("sha256=")
  OpenSSL.secure_compare(expected, given)
end
```

## Next steps

- [Event types](/docs/webhooks/event-types)
- [Retries and replays](/docs/webhooks/retries-and-replays)
- [Receiving webhooks](/docs/dashboard/receiving/create-receiving-webhook)
- [Forward webhooks to Amazon EventBridge](/docs/webhooks/eventbridge)
