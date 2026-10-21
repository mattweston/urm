- Port users.js and google-handlers to new setup

The verifyCookie splits on . but a user_id containing . would break it since you do signedValue.split(".") and only take index 0 and 1. You handle rest.join("=") correctly in parseCookies but not here. Worth using a less ambiguous separator like | or encoding the value first.
The roleFromEnv reading process.env directly inside a handler is a bit out of place given you have a proper config layer — that logic could live in AuthConfig.
The fallback in getOrCreateUserFromZero that returns a base64 of the email as a mock user ID is a silent failure that could cause real data integrity issues in production. Worth making that a hard failure or at least a very loud warning gated on NODE_ENV.

https://github.com/Makisuo/workos-solidjs
https://github.com/NikolayS/pg_ash
