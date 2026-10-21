# Send emails with WordPress

> Install the PostShiba plugin and call wp_mail.

## What you'll build

A WordPress site where every `wp_mail` call goes through the PostShiba API. That includes WooCommerce and any other plugin that sends with `wp_mail`.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). The from address must be on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- WordPress 6.0 or later on PHP 8.1 or later.

## Install

The plugin is on GitHub, not WordPress.org. Clone it into your plugins folder, then activate **PostShiba** under **Plugins**.

```sh install.sh
git clone https://github.com/postshiba/postshiba-wordpress wp-content/plugins/postshiba
```

## Send your first email

1. Open **Settings → PostShiba**. Save your API key and a from address on your verified domain. Or define them in `wp-config.php`, where constants override the saved settings.

```php wp-config.php
define('POSTSHIBA_API_KEY', 'YOUR_API_KEY');
define('POSTSHIBA_FROM_EMAIL', 'hello@mail.example.com');
```

2. Choose **Send test email** on the settings page, or call `wp_mail` from your own code.

```php send.php
wp_mail(
	'you@example.com',
	'Your receipt',
	'Thanks for your order.',
	[
		'From: hello@mail.example.com',
		'Reply-To: support@example.com',
		'X-Capsule-Unique-Args: {"order_id":"ord_123"}',
	]
);
```

`wp_mail` returns `true` once the message is queued. The message then shows under Events in the dashboard. The plugin hooks `pre_wp_mail` and posts to `POST /api/v1/emails`. It sends `X-Capsule-Unique-Args` as `unique_args`.

The settings page also takes a from name, a base URL, and a cluster id. The matching constants are `POSTSHIBA_FROM_NAME`, `POSTSHIBA_BASE_URL`, and `POSTSHIBA_CLUSTER_ID`. Without a cluster id, PostShiba uses your first cluster that is ready to send. `POSTSHIBA_ENABLED` set to `false` turns the plugin off without removing it.

## Attachments and templates

### Attach a file

Pass file paths as the fifth `wp_mail` argument. The plugin base64-encodes each file for the API. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```php attachment.php
wp_mail(
	'you@example.com',
	'Your invoice',
	'Your invoice is attached.',
	[],
	[WP_CONTENT_DIR . '/uploads/invoice.pdf']
);
```

Hosted PostShiba templates are not available through `wp_mail`.

## Troubleshooting

A failed send makes `wp_mail` return `false`, and **Send test email** shows "Test email failed." The plugin does not surface the API error. Send the same message with [curl](/docs/send-with-http) to see the `error` string.

| Status | `error` | What to do |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | The API key is missing, mistyped, or deleted. Save it again in **Settings → PostShiba**. |
| `403` | `forbidden` | Support keys cannot send. Use a Full access key. |
| `403` | `domain_unverified` | The from address is not on a verified domain. |
| `403` | `kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `422` | `invalid` | A required field is missing or an attachment was rejected. |
| `429` | `throttled` | The cluster hit its hourly throttle or 24-hour cap. Retrying right away hits the same cap. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |
| `429` | `rate_limited` | More than 300 send requests in one minute on one API key. |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [Send emails with PHP](/docs/send-with-php) for custom code outside `wp_mail`.
- [SDKs](/docs/sdks) for every language client.
