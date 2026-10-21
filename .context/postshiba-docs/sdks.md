# SDKs

> Install a PostShiba client, mail adapter, or plugin for your language or framework.

PostShiba's language clients wrap the REST API. They install from GitHub. None is published to a package registry yet. See [postshiba/sdks](https://github.com/postshiba/sdks) on GitHub.

Every client takes an API key from [Create an API key](/docs/create-an-api-key). Most also take your team id, which is on the **API keys** page. A failed request raises an error carrying the API's `error`, `field`, and `message`. See [Errors](/docs/api-reference/errors).

## Language clients

| Language | Install | Guide |
| --- | --- | --- |
| Node.js | `npm install github:postshiba/postshiba-node` | [Send emails with Node.js](/docs/send-with-nodejs) |
| Python | `pip install git+https://github.com/postshiba/postshiba-python.git` | [Send emails with Python](/docs/send-with-python) |
| Ruby | `gem "postshiba", git: "https://github.com/postshiba/postshiba-ruby.git"` | [Send emails with Ruby](/docs/send-with-ruby) |
| PHP | Add the VCS repository `https://github.com/postshiba/postshiba-php`, then `composer require postshiba/postshiba:dev-main` | [Send emails with PHP](/docs/send-with-php) |
| Go | `go get github.com/postshiba/postshiba-go` | [Send emails with Go](/docs/send-with-go) |
| Java | Clone [postshiba/postshiba-java](https://github.com/postshiba/postshiba-java) and run `./mvnw install` | [Send emails with Java](/docs/send-with-java) |
| Rust | `postshiba = { git = "https://github.com/postshiba/postshiba-rust" }` | [Send emails with Rust](/docs/send-with-rust) |
| .NET | Clone [postshiba/postshiba-dotnet](https://github.com/postshiba/postshiba-dotnet) and reference `src/PostShiba/PostShiba.csproj` | [Send emails with .NET](/docs/send-with-dotnet) |
| Elixir | `{:postshiba, git: "https://github.com/postshiba/postshiba-elixir.git"}` | [Send emails with Elixir](/docs/send-with-elixir) |
| Dart | Git dependency on `https://github.com/postshiba/postshiba-dart.git` | [Send emails with Dart](/docs/send-with-dart) |

The JavaScript packages (Node.js, NestJS, Convex, Inngest, and Trigger.dev) ship TypeScript source. Run them through a TypeScript-aware runtime or bundler such as `tsx`, Vite, or your framework's build. Plain `node` can't load them yet.

The Node.js and Ruby clients also verify webhook signatures. See [Verify webhook requests](/docs/webhooks/verify-webhooks-requests).

## Framework mailers

The mail adapters ship inside the language client, so there's no separate package to install.

| Framework | Setting | Guide |
| --- | --- | --- |
| Rails | `delivery_method = :postshiba` | [Send emails with Rails](/docs/send-with-rails) |
| Laravel | `MAIL_MAILER=postshiba` | [Send emails with Laravel](/docs/send-with-laravel) |
| Django | `EMAIL_BACKEND = "postshiba.django.EmailBackend"` | [Send emails with Django](/docs/send-with-django) |
| NestJS | `PostShibaModule` from `postshiba/nest` | [Send emails with NestJS](/docs/send-with-nestjs) |
| Phoenix | `adapter: PostShiba.Swoosh.Adapter` | [Send emails with Phoenix](/docs/send-with-phoenix) |

## Platform components

| Platform | Install | Guide |
| --- | --- | --- |
| Convex | `npm install github:postshiba/postshiba-convex` | [Send emails with Convex](/docs/send-with-convex) |
| Inngest | `npm install github:postshiba/postshiba-inngest` | [Send emails with Inngest](/docs/send-with-inngest) |
| Trigger.dev | `npm install github:postshiba/postshiba-trigger` | [Send emails with Trigger.dev](/docs/send-with-trigger) |
| WordPress | Clone [postshiba/postshiba-wordpress](https://github.com/postshiba/postshiba-wordpress) into `wp-content/plugins/postshiba` | [Send emails with WordPress](/docs/send-with-wordpress) |

## SMTP-only apps

Apps that only speak SMTP need no SDK. Point them at your cluster's SMTP host. See [Send emails with Ghost](/docs/send-with-ghost), [Joomla](/docs/send-with-joomla), [Supabase](/docs/send-with-supabase), or [Send emails with SMTP](/docs/send-with-smtp).

## Next steps

- [Choose a send path](/docs/sending-emails)
- [REST API reference](/docs/api-reference/introduction)
- [Send emails with HTTP](/docs/send-with-http)
