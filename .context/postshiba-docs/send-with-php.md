# Send emails with PHP

> Install the PHP SDK from GitHub and call emails.send.

## What you'll build

A PHP script that sends a receipt email with the `postshiba/postshiba` client and prints the queued message.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- PHP 8.1 or later and Composer.

## Install

The package is on GitHub, not Packagist. Add the repository, then require it.

```sh install.sh
composer config repositories.postshiba vcs https://github.com/postshiba/postshiba-php
composer require postshiba/postshiba:dev-main
```

## Send your first email

Pass your API key to `PostShiba`, then call `emails->send` with an array. `teamId` is only needed for team-scoped calls such as listing clusters. It is on the **API keys** page.

```php send.php
<?php

require __DIR__ . '/vendor/autoload.php';

use PostShiba\PostShiba;

$client = new PostShiba("YOUR_API_KEY", teamId: "KjkAJW");

$sent = $client->emails->send([
    'from' => 'hello@mail.example.com',
    'to' => ['you@example.com'],
    'reply_to' => 'support@example.com',
    'subject' => 'Your receipt',
    'text' => 'Thanks for your order.',
    'html' => '<p>Thanks for your order.</p>',
    'unique_args' => ['order_id' => 'ord_123'],
]);

print_r($sent);
```

`emails->send` returns the JSON body of the `201` response as an associative array. The message then shows under Events in the dashboard.

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

```php pin.php
$client->emails->send($message, clusterId: "NmQpXr");
```

## Attachments and templates

### Attach a file

Add `attachments` with `filename`, `content_type`, and base64 `content`. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```php attachment.php
$client->emails->send([
    'from' => 'hello@mail.example.com',
    'to' => ['you@example.com'],
    'subject' => 'Your invoice',
    'text' => 'Your invoice is attached.',
    'attachments' => [
        [
            'filename' => 'invoice.pdf',
            'content_type' => 'application/pdf',
            'content' => base64_encode(file_get_contents('invoice.pdf')),
        ],
    ],
]);
```

### Send a published template

Pass `template` with the alias or public id and its `variables`. Leave out `html` and `text`.

```php template.php
$client->emails->send([
    'from' => 'hello@mail.example.com',
    'to' => ['you@example.com'],
    'template' => ['id' => 'welcome', 'variables' => ['name' => 'Ada']],
]);
```

## Troubleshooting

A response outside 2xx throws `PostShiba\Error` with the public properties `error`, `field`, and `status`. `getMessage()` holds the explanation.

```php errors.php
try {
    $client->emails->send($message);
} catch (PostShiba\Error $e) {
    error_log("{$e->status} {$e->error} {$e->field} {$e->getMessage()}");
    throw $e;
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

- [Send emails with Laravel](/docs/send-with-laravel) to use the `postshiba` mailer.
- [Send emails with WordPress](/docs/send-with-wordpress) to route `wp_mail`.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [SDKs](/docs/sdks) for every language client.
