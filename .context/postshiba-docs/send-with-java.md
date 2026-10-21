# Send emails with Java

> Install the Java SDK from GitHub and call emails.send.

## What you'll build

A Java program that sends a receipt email with the `com.postshiba` client and prints the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Java 17 or later.

## Install

The artifact is not on Maven Central. Clone [postshiba/postshiba-java](https://github.com/postshiba/postshiba-java) and install it to your local Maven repository.

```sh install.sh
git clone https://github.com/postshiba/postshiba-java
cd postshiba-java
./mvnw install
```

Then add the dependency to your `pom.xml`.

```xml pom.xml
<dependency>
	<groupId>com.postshiba</groupId>
	<artifactId>postshiba</artifactId>
	<version>0.1.0</version>
</dependency>
```

## Send your first email

Pass your API key to `PostShiba`, then call `emails.send` with a `Map`. `teamId` is only needed for team-scoped calls such as listing clusters. It is on the **API keys** page.

```java Send.java
import com.fasterxml.jackson.databind.JsonNode;
import com.postshiba.PostShiba;

import java.util.List;
import java.util.Map;

public class Send {
	public static void main(String[] args) {
		PostShiba client = new PostShiba("YOUR_API_KEY", new PostShiba.Options().teamId("KjkAJW"));

		JsonNode sent = client.emails.send(Map.of(
			"from", "hello@mail.example.com",
			"to", List.of("you@example.com"),
			"reply_to", "support@example.com",
			"subject", "Your receipt",
			"text", "Thanks for your order.",
			"html", "<p>Thanks for your order.</p>",
			"unique_args", Map.of("order_id", "ord_123")
		));
		System.out.println(sent);
	}
}
```

`emails.send` returns the JSON body of the `201` response as a Jackson `JsonNode`. The message then shows under Events in the dashboard.

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

Without a pin, PostShiba uses your first cluster that is ready to send. Pass `SendOptions` with `clusterId` to choose one.

```java Pin.java
client.emails.send(message, new PostShiba.SendOptions().clusterId("NmQpXr"));
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```java Attachment.java
String pdf = Base64.getEncoder().encodeToString(Files.readAllBytes(Path.of("invoice.pdf")));

client.emails.send(Map.of(
	"from", "hello@mail.example.com",
	"to", List.of("you@example.com"),
	"subject", "Your invoice",
	"text", "Your invoice is attached.",
	"attachments", List.of(Map.of(
		"filename", "invoice.pdf",
		"content_type", "application/pdf",
		"content", pdf
	))
));
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```java Template.java
client.emails.send(Map.of(
	"from", "hello@mail.example.com",
	"to", List.of("you@example.com"),
	"template", Map.of("id", "welcome", "variables", Map.of("name", "Ada"))
));
```

## Troubleshooting

A response outside 2xx throws `com.postshiba.ApiError` with the public fields `error`, `field`, and `message`.

```java Errors.java
try {
	client.emails.send(message);
} catch (ApiError e) {
	System.err.println(e.error + " " + e.field + " " + e.message);
	throw e;
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
- [Send emails with SMTP](/docs/send-with-smtp) if you already use Jakarta Mail.
- [SDKs](/docs/sdks) for every language client.
