# Send emails with .NET

> Install the .NET SDK from GitHub and call Emails.SendAsync.

## What you'll build

A .NET console app that sends a receipt email with the `PostShiba` client and prints the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- .NET 8 or later.

## Install

The package is not on NuGet. Clone [postshiba/postshiba-dotnet](https://github.com/postshiba/postshiba-dotnet) and add a project reference from your app.

```sh install.sh
git clone https://github.com/postshiba/postshiba-dotnet
dotnet add reference postshiba-dotnet/src/PostShiba/PostShiba.csproj
```

## Send your first email

Pass your API key to `Client`, then call `Emails.SendAsync` with a dictionary. `teamId` is only needed for team-scoped calls such as listing clusters. It is on the **API keys** page.

```csharp send.cs
using PostShiba;

var client = new Client("YOUR_API_KEY", teamId: "KjkAJW");

var sent = await client.Emails.SendAsync(new Dictionary<string, object?>
{
	["from"] = "hello@mail.example.com",
	["to"] = new[] { "you@example.com" },
	["reply_to"] = "support@example.com",
	["subject"] = "Your receipt",
	["text"] = "Thanks for your order.",
	["html"] = "<p>Thanks for your order.</p>",
	["unique_args"] = new Dictionary<string, object?> { ["order_id"] = "ord_123" },
});

Console.WriteLine(sent);
```

Put this in `Program.cs` and run `dotnet run`. `SendAsync` returns the JSON body of the `201` response as a `JsonElement`. The message then shows under Events in the dashboard.

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

```csharp pin.cs
await client.Emails.SendAsync(message, clusterId: "NmQpXr");
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```csharp attachment.cs
var pdf = Convert.ToBase64String(await File.ReadAllBytesAsync("invoice.pdf"));

await client.Emails.SendAsync(new Dictionary<string, object?>
{
	["from"] = "hello@mail.example.com",
	["to"] = new[] { "you@example.com" },
	["subject"] = "Your invoice",
	["text"] = "Your invoice is attached.",
	["attachments"] = new[]
	{
		new Dictionary<string, object?>
		{
			["filename"] = "invoice.pdf",
			["content_type"] = "application/pdf",
			["content"] = pdf,
		},
	},
});
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```csharp template.cs
await client.Emails.SendAsync(new Dictionary<string, object?>
{
	["from"] = "hello@mail.example.com",
	["to"] = new[] { "you@example.com" },
	["template"] = new Dictionary<string, object?>
	{
		["id"] = "welcome",
		["variables"] = new Dictionary<string, object?> { ["name"] = "Ada" },
	},
});
```

## Troubleshooting

A response outside 2xx throws `ApiException` with `Error` and `Field` from the JSON body. `Message` holds the explanation.

```csharp errors.cs
try
{
	await client.Emails.SendAsync(message);
}
catch (ApiException e)
{
	Console.Error.WriteLine($"{e.Error} {e.Field} {e.Message}");
	throw;
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
- [Send emails with SMTP](/docs/send-with-smtp) if you already use MailKit.
- [SDKs](/docs/sdks) for every language client.
