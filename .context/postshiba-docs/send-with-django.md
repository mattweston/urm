# Send emails with Django

> Use the PostShiba EmailBackend and django.core.mail.

## What you'll build

A Django email backend that sends through the PostShiba API. `send_mail`, `EmailMessage`, and `EmailMultiAlternatives` all use it once it is set.

## Before you start

- An API key with **Full access**. See [Create an API key](/docs/create-an-api-key). Support keys cannot send.
- A verified sending domain. See [Add and verify a domain](/docs/add-a-domain). `from_email` must be an address on it.
- A cluster that is ready to send (`sending_ready` is `true`). See [Clusters](/docs/dashboard/clusters/introduction).
- Python 3.8 or later.

## Install

The package is on GitHub, not PyPI. Install it with the `django` extra.

```sh install.sh
pip install "postshiba[django] @ git+https://github.com/postshiba/postshiba-python.git"
```

## Send your first email

1. Set the backend and your API key in `settings.py`.

```python settings.py
EMAIL_BACKEND = "postshiba.django.EmailBackend"
POSTSHIBA_API_KEY = "YOUR_API_KEY"
```

2. Build a message with text and HTML, then call `send()`.

```python send.py
from django.core.mail import EmailMultiAlternatives

message = EmailMultiAlternatives(
    subject="Your receipt",
    body="Thanks for your order.",
    from_email="hello@mail.example.com",
    to=["you@example.com"],
    reply_to=["support@example.com"],
    headers={"X-Capsule-Unique-Args": '{"order_id": "ord_123"}'},
)
message.attach_alternative("<p>Thanks for your order.</p>", "text/html")
message.send()
```

Try it in `python manage.py shell`. `send()` returns `1` when the message is queued. The message then shows under Events in the dashboard.

The backend sends `X-Capsule-Unique-Args` as `unique_args` and other custom headers as `headers`. It always uses your first cluster that is ready to send.

## Attachments and templates

### Attach a file

Use Django's `attach` or `attach_file`. The backend base64-encodes each file for the API. Up to 10 files, 18 MB in total. See [Attachments](/docs/dashboard/emails/attachments) for allowed types.

```python attachment.py
from django.core.mail import EmailMessage

message = EmailMessage(
    subject="Your invoice",
    body="Your invoice is attached.",
    from_email="hello@mail.example.com",
    to=["you@example.com"],
)
message.attach_file("invoice.pdf")
message.send()
```

Django templates work as usual for the body. Hosted PostShiba templates go through the [Python client](/docs/send-with-python) with `template`, not through the backend.

## Troubleshooting

A failed send raises `postshiba.Error` with `error`, `field`, and `message`, unless you pass `fail_silently=True`.

| Status | `error` | What to do |
| --- | --- | --- |
| `401` | `Invalid token or no user signed in` | The API key is missing, mistyped, or deleted. Check `POSTSHIBA_API_KEY`. |
| `403` | `forbidden` | Support keys cannot send. Use a Full access key. |
| `403` | `domain_unverified` | `from_email` is not on a verified domain. |
| `403` | `kyc_required` | Your team is pending production approval. Until then, send only to team members, live inbox addresses, and inbox forward-to addresses. |
| `422` | `invalid` | `field` names the problem, such as a missing `to` or a rejected attachment. |
| `429` | `throttled` | The cluster hit its hourly throttle or 24-hour cap. Retrying right away hits the same cap. See [What happens at your cap](/docs/dashboard/clusters/what-happens-at-your-cap). |
| `429` | `rate_limited` | More than 300 send requests in one minute on one API key. Slow down. |

Every other status is on [Errors](/docs/api-reference/errors).

## Next steps

- [Send emails with Python](/docs/send-with-python) for the plain client.
- [Unique args](/docs/dashboard/emails/unique-args) to get your own ids back on delivery webhooks.
- [Managing webhooks](/docs/webhooks/introduction) to receive delivery events.
- [SDKs](/docs/sdks) for every language client.
