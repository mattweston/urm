# Social provider boundary

URM owns workspace authorization, local post identity and submission state.
Zernio is the external account-connection and posting adapter; provider records
must always be scoped through the domain's stored profile binding.

[accounts.ts](accounts.ts) checks write authority before returning even an
existing profile. Account synchronization must verify returned profile ownership
before updating the local cache. A provider-global list is not a domain catalog.

[store.ts](store.ts) reserves local posts and validates workspace account/image
ownership and command replay. [submission.ts](submission.ts) performs external
I/O after reservation. A network failure can leave a provider-accepted post with
no recorded response; uncertain submission requires status reconciliation, not
blind resubmission. Stable request identifiers do not justify indefinite retries.

[provider.ts](provider.ts) owns response decoding and provider credentials.
Client commands and provider callbacks must enter through authorized/verified
server boundaries rather than exposing the provider API directly.
