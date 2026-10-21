Where Transition would genuinely fit crm-remote, unrelated to debounce:

stayed('CrmRemote') would state the query trigger outright — compare previous vs next query fields, fire only on difference. Today requestCurrentRoutePage runs on every URL change and leans on the queryKey lookup plus AsyncData.revalidateOrLoad to decide; correct, but the intent is buried in a cache probe.
exited('CrmRemote') is the natural home for dropping the page cache on leaving — or deliberately keeping it, which is itself demonstrable.
