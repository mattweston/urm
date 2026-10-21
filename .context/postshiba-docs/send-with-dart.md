# Send emails with Dart

> Install the Dart SDK from GitHub and call emails.send.

## What you'll build

A Dart program that sends a receipt email with the `postshiba` package and prints the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Dart 3 or later.

Keep the API key on a server. Do not ship it inside a client app.

## Install

The package is on GitHub, not pub.dev. Add it to `pubspec.yaml`, then run `dart pub get`.

```yaml pubspec.yaml
dependencies:
  postshiba:
    git:
      url: https://github.com/postshiba/postshiba-dart.git
```

## Send your first email

Pass your API key to `PostShiba`, then await `emails.send` with a map. `teamId` is only needed for team-scoped calls such as listing clusters. It is on the **API keys** page.

```dart send.dart
import 'package:postshiba/postshiba.dart';

Future<void> main() async {
  final client = PostShiba("YOUR_API_KEY", teamId: "KjkAJW");

  final sent = await client.emails.send({
    "from": "hello@mail.example.com",
    "to": ["you@example.com"],
    "reply_to": "support@example.com",
    "subject": "Your receipt",
    "text": "Thanks for your order.",
    "html": "<p>Thanks for your order.</p>",
    "unique_args": {"order_id": "ord_123"},
  });

  print(sent);
}
```

Run it with `dart run send.dart`. `emails.send` returns the JSON body of the `201` response as a `Map<String, dynamic>`. The message then shows under Events in the dashboard.

```json response.json
{
  "queued": true,
  "message_id": "abc@capsule.test",
  "from": "hello@mail.example.com",
  "to": ["you@example.com"],
  "subject": "Your receipt",
  "unique_args": {"order_id": "ord_123"}
}
```

### Pin a cluster

Without a pin, PostShiba uses your first cluster that is ready to send. Pass `clusterId` to choose one.

```dart pin.dart
await client.emails.send(message, clusterId: "NmQpXr");
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```dart attachment.dart
import 'dart:convert';
import 'dart:io';

final pdf = base64Encode(await File("invoice.pdf").readAsBytes());

await client.emails.send({
  "from": "hello@mail.example.com",
  "to": ["you@example.com"],
  "subject": "Your invoice",
  "text": "Your invoice is attached.",
  "attachments": [
    {"filename": "invoice.pdf", "content_type": "application/pdf", "content": pdf},
  ],
});
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```dart template.dart
await client.emails.send({
  "from": "hello@mail.example.com",
  "to": ["you@example.com"],
  "template": {
    "id": "welcome",
    "variables": {"name": "Ada"},
  },
});
```

## Troubleshooting

A response outside 2xx throws `ApiException` with `error`, `field`, `message`, and `statusCode`.

```dart errors.dart
try {
  await client.emails.send(message);
} on ApiException catch (e) {
  print("${e.statusCode} ${e.error} ${e.field} ${e.message}");
  rethrow;
}
```

| Status | `error` | What to do |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | The API key is missing, mistyped, or deleted. Copy it again from **API keys**. |
| `403` | `forbidden` | Support keys cannot send. Use a Full access key. |
| `403` | `domain_unverified` | `from` is not on a verified domain. |
| `403` | `kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `422` | `invalid` | `field` names the problem, such as a missing `to`, an unpublished template, or a rejected attachment. |
| `429` | `throttled` | The cluster hit its hourly throttle or 24-hour cap. The client does not retry, and retrying right away hits the same cap. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |
| `429` | `rate_limited` | More than 300 send requests in one minute on one API key. Slow down. |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [Send emails with HTTP](/docs/send-with-http) for the raw request.
- [SDKs](/docs/sdks) for every language client.
