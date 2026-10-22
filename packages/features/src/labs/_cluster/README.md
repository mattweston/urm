The demo has four sections:

Entity — one Counter entity protocol, separate state for counter-123 and counter-456.
Routing — visualizes Entity ID → shard → owning runner.
Rebalance — add/remove a runner and see shard ownership move while the logical entity address stays unchanged.
Lifecycle — activation, maxIdleTime passivation, and reactivation. It explicitly shows that ClusterSchema.Persisted persists messages, not an in-memory Ref.

The real source example uses Rpc.make, Entity.make, Entity.toLayer, Counter.client, and TestRunner.layer. The two files syntax-parse cleanly; run your workspace typecheck after copying them in.
