Cookies must be signed so that can't be used by other domains

## Cookie-Based Authentication

```typescript
class AuthMiddleware extends HttpApiMiddleware.Tag<AuthMiddleware>()(
	"AuthMiddleware",
		{
		    failure: UnauthorizedError,
		    provides: CurrentUser,
		    security: {
			    cookie: HttpApiSecurity.apiKey({
				    key: "session",
				    in: "cookie"
			    })
		    }
	  }
) {}

const AuthMiddlewareLive = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of({
    cookie: (token) =>
      Effect.gen(function* () {
        const authService = yield* AuthService
        const user = yield* authService.validateSession(token)
        return user
      })
  })
)

// Apply to group
class SecureApi extends HttpApiGroup.make("secure")
  .add(protectedEndpoint)
  .middleware(AuthMiddleware)
{}
```

## Setting Cookies in Responses

```typescript
// In login handler
HttpServerResponse.setCookie("session", token, {
  httpOnly: true,    // Not accessible via JavaScript
  secure: true,      // HTTPS only
  sameSite: "strict" // CSRF protection
})
```
