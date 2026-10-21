# Publication boundary

The account publishing repositories authorize a selected publication and capture
its content for `@urm/ssg`. Public output must contain only material authorized
for that publication: staff access does not make private pages safe to export.
Related documents and images must belong to the requested workspace.

Build generation and provider deployment are separate operations. Artifact paths
come from validated server-side descriptors, not arbitrary client filesystem
paths or shell commands. Deployment credentials belong to the runner process.

[assets.ts](assets.ts) prepares publication assets and
[deployment.ts](deployment.ts) carries the publication deadline into deployment.
A database expiry check at build time cannot revoke already served static files;
expiring deployments need the serving worker described in the
[SSG README](../../../../ssg/README.md).

Generated-site customers or members need a dedicated public actor boundary.
The staff publication API is not an authentication API for visitors.
