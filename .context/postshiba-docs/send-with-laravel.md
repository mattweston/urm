# Send emails with Laravel

> Set the mailer to postshiba and call Mail::raw.

## What you'll build

A Laravel mailer named `postshiba` that sends through the PostShiba API. `Mail::raw`, Mailables, and queued mail all use it once it is the default.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- PHP 8.1 or later.

## Install

The package is on GitHub, not Packagist. Add the repository, then require it. Laravel auto-discovers `PostShiba\Laravel\PostShibaServiceProvider`, which registers the `postshiba` transport.

```sh install.sh
composer config repositories.postshiba vcs https://github.com/postshiba/postshiba-php
composer require postshiba/postshiba:dev-main
```

## Send your first email

1. Set the default mailer and your API key in `.env`.

```env .env
MAIL_MAILER=postshiba
POSTSHIBA_API_KEY=YOUR_API_KEY
```

2. Add a `postshiba` entry to `config/services.php`. The provider reads `key` from it.

```php services.php
'postshiba' => [
    'key' => env('POSTSHIBA_API_KEY'),
],
```

3. Add a `postshiba` mailer to the `mailers` array in `config/mail.php`.

```php mail.php
'postshiba' => [
    'transport' => 'postshiba',
],
```

4. Send a message.

```php send.php
use Illuminate\Support\Facades\Mail;

Mail::raw('Thanks for your order.', function ($message) {
    $message->from('hello@mail.example.com')
        ->to('you@example.com')
        ->replyTo('support@example.com')
        ->subject('Your receipt');
});
```

Try it in `php artisan tinker`. The message then shows under Events in the dashboard. The transport posts to `POST /api/v1/emails` and does not return the API response.

To pass unique args, set an `X-Capsule-Unique-Args` header with a JSON object. The transport sends it as `unique_args`. The transport always uses your first cluster that is ready to send.

## Attachments and templates

### Attach a file

Use Laravel's `attach`. The transport base64-encodes each file for the API. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```php attachment.php
Mail::raw('Your invoice is attached.', function ($message) {
    $message->from('hello@mail.example.com')
        ->to('you@example.com')
        ->subject('Your invoice')
        ->attach(storage_path('app/invoice.pdf'));
});
```

Mailables and Blade views work as usual. Hosted PostShiba templates go through the [PHP client](/docs/send-with-php) with `template`, not through the mailer.

## Troubleshooting

A failed send throws `PostShiba\Error` with `error`, `field`, and `status`. `getMessage()` holds the explanation.

| Status | `error` | What to do |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | The API key is missing, mistyped, or deleted. Check `POSTSHIBA_API_KEY`, then run `php artisan config:clear`. |
| `403` | `forbidden` | Support keys cannot send. Use a Full access key. |
| `403` | `domain_unverified` | `from` is not on a verified domain. |
| `403` | `kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `422` | `invalid` | `field` names the problem, such as a missing `to` or a rejected attachment. |
| `429` | `throttled` | The cluster hit its hourly throttle or 24-hour cap. Retrying right away hits the same cap. For queued mail, release the job until after the hour. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |
| `429` | `rate_limited` | More than 300 send requests in one minute on one API key. Slow down. |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Send emails with PHP](/docs/send-with-php) for the plain client.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [SDKs](/docs/sdks) for every language client.
