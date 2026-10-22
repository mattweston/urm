/** # Searchable command reference; entries are never executed by the view */
export type CliCommand = Readonly<{
    command: string
    description: string
    tags: ReadonlyArray<string>
    comments: ReadonlyArray<string>
}>

export const cliCommands: ReadonlyArray<CliCommand> = [
    {
        command: "pnpm dev:server",
        description: "Start the account API server.",
        tags: ["urm", "development"],
        comments: [
            "Run separately from the client; output is written to logs/server.log.",
        ],
    },
    {
        command: "pnpm --filter @urm/domain typecheck",
        description: "Check shared domain types.",
        tags: ["urm", "verification"],
        comments: ["The package filter uses the manifest name."],
    },
    {
        command:
            "pnpm --filter @urm/domain exec vitest run test/data-tables.test.ts",
        description: "Check custom-table validation.",
        tags: ["urm", "verification", "data"],
        comments: ["The test path is relative to packages/domain."],
    },
    {
        command: "pnpm --filter @urm/ssg build:fixture",
        description: "Build the checked-in static-site fixture.",
        tags: ["urm", "ssg"],
        comments: ["Generates local artifacts; this does not deploy them."],
    },
    {
        command:
            "pnpm --filter @urm/database exec drizzle-kit generate --dialect postgresql --schema ./src/schema/index.ts --out ./src/migrations --name descriptive_change",
        description: "Generate an additive PostgreSQL migration.",
        tags: ["urm", "database", "migration"],
        comments: [
            "Choose a descriptive name and review the generated SQL. Generation does not authorize applying a database change.",
        ],
    },
    {
        command: "tailscale ip -4",
        description: "Show this machine’s Tailscale IPv4 address.",
        tags: ["dns", "tailscale"],
        comments: [
            "Use the development host address when configuring a restricted nameserver.",
        ],
    },
    {
        command: "getent hosts test.urm.test",
        description: "Check development hostname resolution on Linux.",
        tags: ["dns", "linux"],
        comments: [
            "Uses the operating-system resolver path. Replace the hostname for your workspace.",
        ],
    },
    {
        command: "resolvectl query test.urm.test",
        description: "Check development DNS through systemd-resolved.",
        tags: ["dns", "linux"],
        comments: ["Use on systems running systemd-resolved."],
    },
    {
        command: "dscacheutil -q host -a name test.urm.test",
        description: "Check development hostname resolution on macOS.",
        tags: ["dns", "macos"],
        comments: ["Uses the operating-system resolver path."],
    },
    // npx threejs-awesome-graphics-agent-skills@latest install --agent codex
    // Reference: https://flaviocopes.com/jq-command/
    {
        command:
            "npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit",
        description: "Add Cloudflare’s security audit skill.",
        tags: ["skills", "agents", "security", "audit", "review"],
        comments: [
            "Run from the project where you want to add the skill; it installs into .claude/skills and .agents/skills.",
        ],
    },
    {
        command: "npx skills add typesafe-ai/skills --skill typesafe-ai",
        description: "Add the TypeSafe AI skill.",
        tags: ["skills", "agents", "typesafe", "ai"],
        comments: ["Run from the project where you want to add the skill."],
    },
    {
        command: "npx skills add doeixd/foldkit-plus --skill foldkit-plus",
        description: "Add the Foldkit Plus skill.",
        tags: ["skills", "agents", "foldkit", "foldkit-plus"],
        comments: [
            "Explains which Foldkit Plus package owns which kind of state, and how to use each one.",
        ],
    },
    {
        command: "pnpm add foldkit-surface",
        description: "Install Foldkit Plus typed application boundaries.",
        tags: ["foldkit", "foldkit-plus", "surface", "dependencies"],
        comments: [
            "foldkit-surface is the base for the remote, sync, and mixins packages.",
            "New dependencies must be at least seven days old before installing.",
        ],
    },
    {
        command: "pnpm add foldkit-agent foldkit-agent-webmcp",
        description:
            "Install Foldkit Plus agent capabilities with one protocol adapter.",
        tags: ["foldkit", "foldkit-plus", "agents", "webmcp", "dependencies"],
        comments: [
            "Swap the adapter for the MCP, A2A, or Agent Native package when the transport differs.",
        ],
    },
    {
        command: "pnpm add foldkit-surface foldkit-remote",
        description: "Install Foldkit Plus normalized server-owned state.",
        tags: ["foldkit", "foldkit-plus", "remote", "state", "dependencies"],
        comments: [
            "Add the server packages when compiling queries on the server.",
        ],
    },
    {
        command: "pnpm add foldkit-remote-server foldkit-remote-drizzle",
        description:
            "Install the optional Foldkit Plus server-side query compilation.",
        tags: ["foldkit", "foldkit-plus", "remote", "drizzle", "dependencies"],
        comments: ["Optional; pairs with foldkit-surface and foldkit-remote."],
    },
    {
        command: "pnpm add foldkit-surface foldkit-sync foldkit-durable",
        description: "Install Foldkit Plus local-first replicated state.",
        tags: [
            "foldkit",
            "foldkit-plus",
            "sync",
            "durable",
            "offline",
            "dependencies",
        ],
        comments: [
            "foldkit-durable provides the persistence that foldkit-sync replicates.",
        ],
    },
    {
        command: "pnpm add foldkit-mirror",
        description:
            "Install Foldkit Plus URL and local key-value representations.",
        tags: ["foldkit", "foldkit-plus", "mirror", "url", "dependencies"],
        comments: ["Use this for state that lives in the URL or in storage."],
    },
    {
        command: "pnpm add foldkit-mixins foldkit-mixins-surface",
        description: "Install Foldkit Plus view extension points.",
        tags: ["foldkit", "foldkit-plus", "mixins", "view", "dependencies"],
        comments: [
            "foldkit-mixins-ui adds the styling layer on top of these two.",
        ],
    },
    {
        command: "curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash",
        description: "Install the Kimi Code CLI.",
        tags: ["kimi", "agents", "cli", "install"],
        comments: [
            "Read the script before piping it to a shell.",
            "Run source ~/.bashrc afterwards so the new binary is on PATH.",
        ],
    },
    {
        command: "npm install -g @moonshot-ai/kimi-code@latest",
        description: "Install or upgrade Kimi Code from npm.",
        tags: ["kimi", "agents", "cli", "install", "npm"],
        comments: [
            "Alternative to the install script; use it to move an existing install to the latest release.",
        ],
    },
    {
        command: "source ~/.bashrc",
        description: "Reload the shell profile in the current session.",
        tags: ["shell", "path", "setup", "kimi"],
        comments: [
            "Needed after an installer edits the profile; a new terminal has the same effect.",
        ],
    },
    {
        command: "kimi --version",
        description: "Print the installed Kimi Code version.",
        tags: ["kimi", "agents", "cli", "diagnostics"],
        comments: ["Use this to confirm the install landed on PATH."],
    },
    {
        command: "cd urm && kimi",
        description: "Start Kimi Code in the URM checkout.",
        tags: ["kimi", "agents", "cli", "session"],
        comments: [
            "Run from the directory that contains the URM checkout so the agent picks up AGENTS.md.",
        ],
    },
    {
        command: "kimi -C",
        description: "Resume the previous Kimi Code session.",
        tags: ["kimi", "agents", "cli", "session", "resume"],
        comments: ["Continues the last conversation in the current directory."],
    },
    {
        command: "/login",
        description: "Authenticate Kimi Code from inside the session.",
        tags: ["kimi", "agents", "auth", "login"],
        comments: ["Typed at the Kimi Code prompt, not in the shell."],
    },
    {
        command: "npx skills add jakubkrehel/oklch-skill",
        description: "Add Jakub Krehel’s OKLCH skill.",
        tags: ["skills", "agents", "design", "color", "oklch"],
        comments: ["Run from the project where you want to add the skill."],
    },
    {
        command: "npx skills add jakubkrehel/make-interfaces-feel-better",
        description: "Add Jakub Krehel’s Make Interfaces Feel Better skill.",
        tags: ["skills", "agents", "design", "interfaces"],
        comments: ["Run from the project where you want to add the skill."],
    },
    {
        command: "npx skills add jakubkrehel/skills",
        description: "Add skills from Jakub Krehel’s skills collection.",
        tags: ["skills", "agents", "setup"],
        comments: ["Run from the project where you want to add the skills."],
    },
    {
        command: "ssh -N -L 1420:127.0.0.1:1420 servername",
        description:
            "Forward local port 1420 to the remote client development server over SSH.",
        tags: ["ssh", "tunnel", "remote", "client", "development"],
        comments: [
            "Run on your local machine; replace servername with the remote SSH hostname or configured alias.",
            "Open http://localhost:1420 locally to reach port 1420 on the remote server’s loopback interface.",
            "-N opens the tunnel without running a remote command. Keep the terminal open; press Ctrl+C to close it.",
            "The remote development server must be running, and local port 1420 must be available.",
        ],
    },
    {
        command: "pnpm install",
        description: "Install the pinned workspace dependencies.",
        tags: ["setup", "dependencies", "pnpm"],
        comments: ["Run from the URM repository root."],
    },
    {
        command: "pnpm run",
        description: "List every script exposed by the root URM package.",
        tags: ["scripts", "discover", "pnpm", "reference"],
        comments: ["Use this to discover experimental or infrequent scripts."],
    },
    {
        command: "df -h /home/matt/urm",
        description: "Show available disk space on the URM filesystem.",
        tags: ["disk", "storage", "usage", "inspect", "filesystem"],
        comments: [
            "Check this before dependency installs or builds when disk space is low.",
        ],
    },
    {
        command: "du -xhd1 /home/matt 2>/dev/null | sort -h",
        description: "Compare disk usage across top-level home directories.",
        tags: ["disk", "storage", "usage", "inspect", "home"],
        comments: [
            "-x stays on the current filesystem; the results are sorted from smallest to largest.",
        ],
    },
    {
        command:
            "du -sh node_modules ~/.local/share/pnpm/store ~/.cache/pnpm ~/.npm 2>/dev/null",
        description:
            "Measure the main JavaScript dependency and cache locations.",
        tags: ["disk", "storage", "usage", "inspect", "pnpm", "npm"],
        comments: ["Run from the URM repository root."],
    },
    {
        command:
            "du -xhd1 node_modules/.pnpm 2>/dev/null | sort -h | tail -n 30",
        description:
            "List the thirty largest packages in the pnpm virtual store.",
        tags: ["disk", "storage", "usage", "inspect", "pnpm", "dependencies"],
        comments: [
            "Run from the URM repository root to identify unexpectedly large or duplicated packages.",
        ],
    },
    {
        command:
            "find node_modules/.pnpm -type f -name 'tsc.original.[0-9]*' -print",
        description: "Find numbered Effect TypeScript patch backups.",
        tags: ["disk", "storage", "inspect", "typescript", "effect", "tsgo"],
        comments: [
            "Review this output before running the matching cleanup command.",
            "The unnumbered tsc.original file is the canonical backup and is not matched.",
        ],
    },
    {
        command:
            "find node_modules/.pnpm -type f -name 'tsc.original.[0-9]*' -delete",
        description:
            "Delete duplicate numbered Effect TypeScript patch backups.",
        tags: ["disk", "storage", "cleanup", "typescript", "effect", "tsgo"],
        comments: [
            "Run the matching -print command first and confirm every result is a numbered backup.",
            "Keeps the unnumbered tsc.original backup used by the patch workflow.",
            "pnpm install may create another numbered backup when the prepare script runs.",
        ],
    },
    {
        command: "pnpm store prune",
        description: "Remove unreferenced packages from the global pnpm store.",
        tags: ["disk", "storage", "cleanup", "pnpm", "cache"],
        comments: [
            "Safe for installed projects; packages needed by a future install may be downloaded again.",
            "This can reclaim substantial space after dependency upgrades.",
        ],
    },
    {
        command: "npm cache verify",
        description:
            "Check npm cache integrity and report its current contents.",
        tags: ["disk", "storage", "inspect", "npm", "cache"],
        comments: [
            "Run this before clearing the npm cache to see whether npm can compact it automatically.",
        ],
    },
    {
        command: "npm cache clean --force",
        description: "Clear npm’s reproducible download cache.",
        tags: ["disk", "storage", "cleanup", "npm", "cache"],
        comments: [
            "Removes cached package downloads, not project source files or installed node_modules.",
            "Use when the npm cache is consuming significant space; later npm and npx runs will download packages again.",
        ],
    },
    {
        command:
            "git subtree add --prefix=.context/name https://github.com/username/project.git main --squash",
        description: "Vendor a context repository from its main branch.",
        tags: ["git", "subtree", "context", "vendor"],
        comments: [
            "Replace name, username, and project with the context repository values.",
        ],
    },
    {
        command:
            "git subtree pull --prefix=.context/name https://github.com/username/project.git main --squash",
        description:
            "Update a vendored context repository from its main branch.",
        tags: ["git", "subtree", "context", "update"],
        comments: [
            "Use the same prefix and upstream repository used by subtree add.",
        ],
    },
    {
        command:
            "git subtree add --prefix=.context/name https://github.com/username/project.git v1.2.3 --squash",
        description: "Vendor a context repository at a specific release tag.",
        tags: ["git", "subtree", "context", "release", "tag", "pinned"],
        comments: ["Replace v1.2.3 with the release tag to pin."],
    },
    {
        command: "pnpm dev",
        description: "Start the client development server.",
        tags: ["client", "web", "development", "vite"],
        comments: [
            "Alias for pnpm dev:client; serves port 1420 and writes logs/client.log.",
        ],
    },
    {
        command: "pnpm dev:client",
        description: "Start the shared browser client with log capture.",
        tags: ["client", "web", "development", "vite", "logs"],
        comments: ["Output is written to logs/client.log."],
    },
    {
        command: "pnpm build:client",
        description: "Build the shared client for browser and native hosts.",
        tags: ["client", "build", "vite"],
        comments: ["Writes the frontend assets to apps/client/dist."],
    },
    {
        command: "npx vite-bundle-visualizer",
        description: "Inspect the Vite bundle in an interactive visual report.",
        tags: ["client", "build", "vite", "bundle", "visualizer"],
        comments: [
            "Run from the repository root after building the client to investigate bundle size.",
        ],
    },
    {
        command: "pnpm preview:client",
        description: "Preview the production client build.",
        tags: ["client", "preview", "vite"],
        comments: ["Run pnpm build:client first."],
    },
    {
        command: "openssl rand -hex 32",
        description:
            "Generate a 32-byte webhook signing secret as hexadecimal text.",
        tags: [
            "security",
            "secret",
            "webhook",
            "zernio",
            "openssl",
            "generate",
        ],
        comments: [
            "Generate this once, then use the same value in ZERNIO_WEBHOOK_SECRET and the Zernio webhook settings.",
            "Do not reuse the Zernio API key or commit the generated value.",
        ],
    },
    {
        command:
            "pnpm --filter @urm/email exec alchemy plan alchemy.run.ts --stage production --profile default",
        description:
            "Preview the retained URM email-domain infrastructure changes.",
        tags: ["email", "cloudflare", "alchemy", "plan", "infrastructure"],
        comments: [
            "Run from the URM repository root after configuring the intended Cloudflare profile.",
            "Reads the dedicated packages/email/alchemy.run.ts stack and makes no provider changes.",
            "Confirm the account and urm.dev zone in the plan before deployment.",
        ],
    },
    {
        command:
            "pnpm --filter @urm/email deploy:email -- --stage production --profile default",
        description:
            "Deploy the retained mail.urm.dev and newsletter.urm.dev infrastructure.",
        tags: [
            "email",
            "cloudflare",
            "alchemy",
            "deploy",
            "production",
            "infrastructure",
        ],
        comments: [
            "Run from the URM repository root only after reviewing the matching Alchemy plan.",
            "This changes Cloudflare Email Sending resources in the selected account.",
            "Wait for both sending subdomains to report enabled before configuring senders.",
        ],
    },
    {
        command:
            "URM_EMAIL_FORWARD_TO=you@example.com pnpm --filter @urm/email exec alchemy plan alchemy.routing.run.ts --stage production --profile default",
        description:
            "Preview the URM platform email-routing destination and rules.",
        tags: [
            "email",
            "routing",
            "cloudflare",
            "alchemy",
            "plan",
            "infrastructure",
        ],
        comments: [
            "Replace you@example.com with the mailbox that will receive forwarded platform mail.",
            "Plans forwarding for hello, support, privacy, and postmaster at urm.dev without applying changes.",
            "Confirm the intended Cloudflare account, zone, and destination before deployment.",
        ],
    },
    {
        command:
            "URM_EMAIL_FORWARD_TO=you@example.com pnpm --filter @urm/email deploy:email-routing -- --stage production --profile default",
        description:
            "Deploy the retained URM apex email-routing configuration and rules.",
        tags: [
            "email",
            "routing",
            "cloudflare",
            "alchemy",
            "deploy",
            "production",
            "infrastructure",
        ],
        comments: [
            "Run only after reviewing the matching routing plan.",
            "Cloudflare sends a verification message when the destination address is first registered.",
            "Forwarding does not deliver until the destination mailbox is verified.",
        ],
    },
    {
        command: "pnpm --filter @urm/email typecheck",
        description:
            "Typecheck the email transport and infrastructure package.",
        tags: ["email", "typescript", "quality", "alchemy"],
        comments: ["Run from the URM repository root."],
    },
    {
        command: "pnpm --filter @urm/email test",
        description: "Run the email transport and template tests.",
        tags: ["email", "tests", "quality"],
        comments: ["Run from the URM repository root."],
    },
    {
        command: "pnpm exec alchemy --help",
        description: "List Alchemy infrastructure CLI commands and options.",
        tags: ["alchemy", "help", "reference"],
        comments: [
            "Defaults to alchemy.run.ts; pass an existing custom stack file immediately after the command.",
            "Stage defaults to the stage environment config, then dev_$USER; valid names match [a-z0-9]+([-_a-z0-9]+)* case-insensitively.",
            "Reference: https://alchemy.run/cli/",
        ],
    },
    {
        command: "pnpm exec alchemy deploy --stage dev --profile default",
        description: "Plan, approve, and apply stack changes.",
        tags: ["alchemy", "deploy", "infrastructure"],
        comments: [
            "Defaults to alchemy.run.ts; pass an existing custom stack file immediately after the command.",
            "--stage selects the environment; --profile selects credentials (default or $ALCHEMY_PROFILE); --env-file selects the environment file (default .env).",
            "Interactive terminals show the plan, approval prompt, and resource progress.",
            "Plain mode makes no changes without --yes.",
        ],
    },
    {
        command: "pnpm exec alchemy plan --stage dev --profile default",
        description: "Preview stack changes without applying them.",
        tags: ["alchemy", "plan", "preview"],
        comments: [
            "Defaults to alchemy.run.ts; pass an existing custom stack file immediately after the command.",
            "--stage selects the environment; --profile selects credentials (default or $ALCHEMY_PROFILE); --env-file selects the environment file (default .env).",
            "Applies nothing; interactive terminals render the plan in the TUI.",
        ],
    },
    {
        command: "pnpm exec alchemy destroy --stage dev --profile default",
        description: "Delete every tracked resource in the selected stage.",
        tags: ["alchemy", "destroy", "cleanup"],
        comments: [
            "Defaults to alchemy.run.ts; pass an existing custom stack file immediately after the command.",
            "--stage selects the environment; --profile selects credentials (default or $ALCHEMY_PROFILE); --env-file selects the environment file (default .env).",
            "Review the selected stage and deletion plan before approving.",
        ],
    },
    {
        command: "pnpm exec alchemy dev --stage dev --profile default",
        description: "Start the hot-reloading Alchemy development loop.",
        tags: ["alchemy", "development", "watch"],
        comments: [
            "Defaults to alchemy.run.ts; pass an existing custom stack file immediately after the command.",
            "--stage selects the environment; --profile selects credentials (default or $ALCHEMY_PROFILE); --env-file selects the environment file (default .env).",
        ],
    },
    {
        command: "pnpm exec alchemy tail --stage dev --profile default",
        description: "Stream live logs from deployed resources.",
        tags: ["alchemy", "logs", "debugging"],
        comments: [
            "Defaults to alchemy.run.ts; pass an existing custom stack file immediately after the command.",
            "--stage selects the environment; --profile selects credentials (default or $ALCHEMY_PROFILE); --env-file selects the environment file (default .env).",
        ],
    },
    {
        command: "pnpm exec alchemy logs --stage dev --profile default",
        description: "Fetch historical resource log entries.",
        tags: ["alchemy", "logs", "debugging", "history"],
        comments: [
            "Defaults to alchemy.run.ts; pass an existing custom stack file immediately after the command.",
            "--stage selects the environment; --profile selects credentials (default or $ALCHEMY_PROFILE); --env-file selects the environment file (default .env).",
        ],
    },
    {
        command: "pnpm exec alchemy login --profile default",
        description: "Authenticate the providers declared in the stack.",
        tags: ["alchemy", "auth", "setup", "profile"],
        comments: [
            "Uses alchemy.run.ts when present; without a stack file, falls back to built-in providers.",
            "Pass an existing custom stack file after login. Supports --profile and --env-file, but not --stage.",
        ],
    },
    {
        command: "pnpm exec alchemy unsafe nuke",
        description:
            "Delete provider-discoverable resources, including untracked infrastructure.",
        tags: ["alchemy", "unsafe", "destroy", "cleanup"],
        comments: [
            "Defaults to alchemy.run.ts; pass an existing custom stack file immediately after the command.",
            "Can delete resources outside Alchemy state; inspect the command help and provider scope before running.",
        ],
    },
    {
        command: "pnpm exec alchemy profile show",
        description: "Inspect stored Alchemy credentials.",
        tags: ["alchemy", "auth", "profile", "inspect"],
        comments: ["Profiles are stored in ~/.alchemy/profiles.json."],
    },
    {
        command: "pnpm exec alchemy profile clear",
        description: "Clear stored Alchemy credentials.",
        tags: ["alchemy", "auth", "profile", "cleanup"],
        comments: [
            "Removes saved authentication; authenticate again with pnpm exec alchemy login.",
        ],
    },
    {
        command: "pnpm exec alchemy state stacks",
        description: "List stack names in the state store.",
        tags: ["alchemy", "state", "stacks"],
        comments: [
            "Replace my-stack, dev, and resource-name where present; --profile, --env-file, and --local are supported.",
            "Reference: https://alchemy.run/cli/state/",
        ],
    },
    {
        command: "pnpm exec alchemy state stages --stack my-stack",
        description: "List recorded stages for a stack.",
        tags: ["alchemy", "state", "stages"],
        comments: [
            "Replace my-stack, dev, and resource-name where present; --profile, --env-file, and --local are supported.",
            "Reference: https://alchemy.run/cli/state/",
        ],
    },
    {
        command:
            "pnpm exec alchemy state resources --stack my-stack --stage dev",
        description: "List tracked resource names for a stack and stage.",
        tags: ["alchemy", "state", "resources"],
        comments: [
            "Replace my-stack, dev, and resource-name where present; --profile, --env-file, and --local are supported.",
            "Reference: https://alchemy.run/cli/state/",
        ],
    },
    {
        command:
            "pnpm exec alchemy state get --stack my-stack --stage dev --fqn resource-name",
        description: "Print one resource’s persisted state as JSON.",
        tags: ["alchemy", "state", "get"],
        comments: [
            "Replace my-stack, dev, and resource-name where present; --profile, --env-file, and --local are supported.",
            "Use state resources to find the fully qualified resource name.",
            "Reference: https://alchemy.run/cli/state/",
        ],
    },
    {
        command: "pnpm exec alchemy state export --stack my-stack --stage dev",
        description: "Export resource state as JSON.",
        tags: ["alchemy", "state", "export"],
        comments: [
            "Replace my-stack, dev, and resource-name where present; --profile, --env-file, and --local are supported.",
            "Omit --stage for all stages in the stack; omit both addressing flags for all stacks.",
            "Documented online but absent from the vendored .context/alchemy CLI; check your installed version supports state export.",
            "Reference: https://alchemy.run/cli/state/",
        ],
    },
    {
        command: "pnpm exec alchemy state tree",
        description: "Display stacks, stages, and resources as a tree.",
        tags: ["alchemy", "state", "tree"],
        comments: [
            "Replace my-stack, dev, and resource-name where present; --profile, --env-file, and --local are supported.",
            "Reference: https://alchemy.run/cli/state/",
        ],
    },
    {
        command: "pnpm exec alchemy state clear --stack my-stack --stage dev",
        description: "Delete state records for a stack and stage.",
        tags: ["alchemy", "state", "clear"],
        comments: [
            "Replace my-stack, dev, and resource-name where present; --profile, --env-file, and --local are supported.",
            "Leaves cloud resources in place. Omitting scope flags broadens the deletion; confirmation is required unless --yes is supplied.",
            "Reference: https://alchemy.run/cli/state/",
        ],
    },
    {
        command: "pnpm exec alchemy aws bootstrap",
        description: "Set up the per-account AWS assets bucket.",
        tags: ["alchemy", "aws", "setup", "bootstrap"],
        comments: ["Reference: https://alchemy.run/cli/aws/"],
    },
    {
        command: "pnpm exec alchemy cloudflare bootstrap",
        description: "Set up the Cloudflare state-store worker.",
        tags: ["alchemy", "cloudflare", "state", "setup", "bootstrap"],
        comments: ["Reference: https://alchemy.run/cli/cloudflare/"],
    },
    {
        command: "pnpm exec alchemy cloudflare create-token",
        description: "Create a Cloudflare API token.",
        tags: ["alchemy", "cloudflare", "auth", "token"],
        comments: ["Reference: https://alchemy.run/cli/cloudflare/"],
    },
    {
        command: "pnpm exec alchemy cloudflare state logs",
        description: "Read Cloudflare state-store worker logs.",
        tags: ["alchemy", "cloudflare", "state", "logs"],
        comments: ["Reference: https://alchemy.run/cli/cloudflare/"],
    },
    {
        command:
            "ALCHEMY_PLAIN=1 pnpm exec alchemy deploy --stage dev --profile default --yes",
        description:
            "Approve and apply an Alchemy deployment with plain output in CI.",
        tags: ["alchemy", "deploy", "ci", "plain", "tui"],
        comments: [
            "--yes approves all prompts; select the intended stage and profile before running.",
            "ALCHEMY_PLAIN=1 or ALCHEMY_NO_TUI=1 forces plain output before other detection.",
            "Otherwise ALCHEMY_TUI=1 forces the TUI; no TTY, CI=1, or known agent environment variables select plain output.",
            "Reference: https://alchemy.run/environments/ci/",
        ],
    },
    {
        command:
            "ALCHEMY_TUI=1 pnpm exec alchemy deploy --stage dev --profile default",
        description:
            "Use the interactive Alchemy deployment plan and approval UI.",
        tags: ["alchemy", "deploy", "interactive", "tui"],
        comments: [
            "Uses arrow-key approval and per-resource progress.",
            "Unset ALCHEMY_PLAIN and ALCHEMY_NO_TUI to allow the TUI override.",
        ],
    },
    {
        command:
            "pnpm exec alchemy sync --stage dev --profile default --dry-run",
        description: "Detect infrastructure drift without repairing it.",
        tags: ["alchemy", "sync", "drift", "preview"],
        comments: [
            "Reports drift without reconciling resources or writing state.",
            "Accepts a custom stack file, --stage, --profile, and --env-file.",
        ],
    },
    {
        command: "pnpm exec alchemy sync --stage dev --profile default",
        description: "Detect and repair infrastructure drift.",
        tags: ["alchemy", "sync", "drift", "repair"],
        comments: [
            "Displays a drift plan and requests approval when resources are drifted or missing.",
            "--yes skips approval; --dry-run only reports drift.",
        ],
    },
    {
        command: "pnpm exec alchemy cloudflare teardown --profile default",
        description: "Tear down the Cloudflare state store.",
        tags: [
            "alchemy",
            "cloudflare",
            "state",
            "teardown",
            "cleanup",
            "hidden",
        ],
        comments: [
            "Hidden command registered in the vendored CLI. Deletes state-store infrastructure without an approval prompt.",
            "Supports --env-file and --worker-name to select a custom state-store worker.",
        ],
    },
    {
        command: "pnpm exec alchemy login --profile default --configure",
        description:
            "Configure provider authentication interactively before logging in.",
        tags: ["alchemy", "auth", "profile", "configure", "setup"],
        comments: [
            "Runs each provider\u2019s interactive configuration step before login.",
        ],
    },
    {
        command:
            "pnpm exec alchemy destroy --stage dev --profile default --dry-run",
        description: "Preview resource deletion for a stage.",
        tags: ["alchemy", "destroy", "plan", "preview"],
        comments: ["Renders the destroy plan without applying deletions."],
    },
    {
        command:
            "pnpm exec alchemy deploy --stage dev --profile default --adopt",
        description:
            "Adopt conflicting existing cloud resources during deployment.",
        tags: ["alchemy", "deploy", "adopt", "recovery"],
        comments: [
            "Allows pre-existing resources to be adopted instead of failing on conflicts.",
            "Review the plan before approval, especially when recovering into a fresh state store.",
        ],
    },
    {
        command:
            "pnpm exec alchemy logs --stage dev --profile default --filter Worker --since 1h --limit 50",
        description: "Fetch recent logs for a specific resource.",
        tags: ["alchemy", "logs", "filter", "debugging"],
        comments: [
            "Replace Worker with a logical resource ID from the stack; multiple IDs are comma-separated.",
            "--since accepts a duration or ISO date; --limit bounds the number of entries.",
        ],
    },
    {
        command: "pnpm mobile:doctor",
        description: "Inspect Capacitor dependencies and native tooling.",
        tags: ["mobile", "capacitor", "diagnostics", "setup"],
        comments: [
            "Run from the repository root; also checks the npm registry.",
        ],
    },
    {
        command: "pnpm mobile:add:android",
        description: "Generate the Android native project once.",
        tags: ["mobile", "capacitor", "android", "setup"],
        comments: [
            "Requires a compatible JDK, Android SDK, and a device or emulator.",
            "Run only if apps/mobile/android does not exist.",
            "Next: pnpm mobile:run:android.",
        ],
    },
    {
        command: "pnpm mobile:devices:android",
        description: "List available Android device and simulator targets.",
        tags: ["mobile", "capacitor", "android", "devices"],
        comments: [
            "Requires a compatible JDK, Android SDK, and a device or emulator.",
            "Use a listed target id with pnpm mobile:run:android --target <target-id>.",
        ],
    },
    {
        command: "pnpm mobile:run:android",
        description: "Build, sync, and launch the Android app.",
        tags: ["mobile", "capacitor", "android", "development", "run"],
        comments: [
            "Requires a compatible JDK, Android SDK, and a device or emulator.",
            "First-time setup: pnpm mobile:add:android if the native project is absent.",
            "Builds apps/client/dist and runs a debug build on the selected target.",
        ],
    },
    {
        command: "pnpm mobile:sync:android",
        description: "Build the shared client and sync only Android.",
        tags: ["mobile", "capacitor", "android", "build", "sync"],
        comments: [
            "Refreshes the generated native project without launching the app.",
            "Does not require an iOS project.",
        ],
    },
    {
        command: "pnpm mobile:open:android",
        description: "Open the Android project in Android Studio.",
        tags: ["mobile", "capacitor", "android", "development", "ide"],
        comments: [
            "Requires a compatible JDK, Android SDK, and a device or emulator.",
            "Run pnpm mobile:sync:android first to refresh bundled web assets.",
        ],
    },
    {
        command: "pnpm mobile:add:ios",
        description: "Generate the iOS native project once.",
        tags: ["mobile", "capacitor", "ios", "setup"],
        comments: [
            "Requires macOS and Xcode.",
            "Run only if apps/mobile/ios does not exist.",
            "Next: pnpm mobile:run:ios.",
        ],
    },
    {
        command: "pnpm mobile:devices:ios",
        description: "List available iOS device and simulator targets.",
        tags: ["mobile", "capacitor", "ios", "devices"],
        comments: [
            "Requires macOS and Xcode.",
            "Use a listed target id with pnpm mobile:run:ios --target <target-id>.",
        ],
    },
    {
        command: "pnpm mobile:run:ios",
        description: "Build, sync, and launch the iOS app.",
        tags: ["mobile", "capacitor", "ios", "development", "run"],
        comments: [
            "Requires macOS and Xcode.",
            "First-time setup: pnpm mobile:add:ios if the native project is absent.",
            "Builds apps/client/dist and runs a debug build on the selected target.",
        ],
    },
    {
        command: "pnpm mobile:sync:ios",
        description: "Build the shared client and sync only iOS.",
        tags: ["mobile", "capacitor", "ios", "build", "sync"],
        comments: [
            "Refreshes the generated native project without launching the app.",
            "Requires macOS and an existing iOS project.",
        ],
    },
    {
        command: "pnpm mobile:open:ios",
        description: "Open the iOS project in Xcode.",
        tags: ["mobile", "capacitor", "ios", "development", "ide"],
        comments: [
            "Requires macOS and Xcode.",
            "Run pnpm mobile:sync:ios first to refresh bundled web assets.",
        ],
    },
    {
        command: "pnpm mobile:sync",
        description:
            "Build the shared client and sync all generated native platforms.",
        tags: ["mobile", "capacitor", "build", "sync"],
        comments: [
            "Use macOS when an iOS project is present.",
            "Use pnpm mobile:sync:android or pnpm mobile:sync:ios to select one platform.",
        ],
    },
    {
        command: "pnpm dev:desktop",
        description: "Run the Tauri desktop application in development.",
        tags: ["desktop", "tauri", "rust", "development"],
        comments: [
            "Tauri starts the shared client on port 1420 through beforeDevCommand.",
            "Stop a separately running client on that port before starting Tauri.",
        ],
    },
    {
        command: "pnpm build:desktop",
        description: "Build and bundle the Tauri desktop application.",
        tags: ["desktop", "tauri", "rust", "build", "bundle"],
        comments: [
            "Tauri builds the shared client through beforeBuildCommand.",
        ],
    },
    {
        command: "pnpm --filter @urm/desktop exec tauri info",
        description: "Show Tauri tooling and platform diagnostics.",
        tags: ["desktop", "tauri", "rust", "diagnostics"],
        comments: [
            "Use when investigating native build prerequisites or version mismatches.",
        ],
    },
    {
        command:
            "cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml",
        description:
            "Check the desktop Rust code without producing a final executable.",
        tags: ["desktop", "tauri", "rust", "quality"],
        comments: ["Run from the repository root."],
    },
    {
        command:
            "cargo clean --manifest-path apps/desktop/src-tauri/Cargo.toml",
        description:
            "Remove generated Rust build artifacts for the desktop app.",
        tags: ["desktop", "tauri", "rust", "clean", "cleanup", "disk"],
        comments: ["The next native build recompiles the removed artifacts."],
    },
    {
        command: "pnpm typecheck",
        description: "Typecheck every workspace package.",
        tags: ["quality", "typescript"],
        comments: ["Use a package filter for a focused check."],
    },
    {
        command: "pnpm --filter @urm/features typecheck",
        description: "Typecheck the features workspace.",
        tags: ["quality", "typescript", "features"],
        comments: ["Run after changes to this workspace."],
    },
    {
        command: "pnpm --filter @urm/client typecheck",
        description: "Typecheck the client workspace.",
        tags: ["quality", "typescript", "client"],
        comments: ["Run after changes to this workspace."],
    },
    {
        command: "pnpm --filter @urm/client test",
        description: "Run the client test suite.",
        tags: ["client", "tests", "quality"],
        comments: ["Runs the client workspace Vitest tests."],
    },
    {
        command: "pnpm test",
        description: "Run the full workspace test suite.",
        tags: ["quality", "tests", "vitest"],
        comments: ["Reserve the full suite for comprehensive verification."],
    },
    {
        command: "pnpm lint",
        description: "Run repository lint checks.",
        tags: ["quality", "lint"],
        comments: ["Lint configuration lives in packages/tools/config."],
    },
    {
        command: "pnpm check",
        description: "Run workspace typechecks, lint, and tests.",
        tags: ["quality", "typescript", "lint", "tests"],
        comments: ["This is the comprehensive repository check."],
    },
    {
        command: "pnpm docs:lint",
        description: "Check documentation headings, budgets, and LLMS output.",
        tags: ["docs", "lint", "quality", "llm"],
        comments: ["Run after editing repository documentation."],
    },
    {
        command: "pnpm docgen:llm",
        description: "Regenerate LLMS.md from llm-docs/src.",
        tags: ["docs", "llm", "generation"],
        comments: ["Run after changing the LLM documentation sources."],
    },
    {
        command: "pnpm docgen:llm:check",
        description: "Verify LLMS.md matches its documentation sources.",
        tags: ["docs", "llm", "generation", "quality"],
        comments: ["Does not rewrite LLMS.md."],
    },
    {
        command: "pnpm diagnostics",
        description: "Run Effect TypeScript diagnostics.",
        tags: ["effect", "typescript", "diagnostics", "quality"],
        comments: [
            "Uses the repository Effect language-service configuration.",
        ],
    },
    {
        command: 'btca ask "How does URM model an Effect service?"',
        description: "Query the configured vendored context repositories.",
        tags: ["effect", "context", "documentation"],
        comments: ["Use this before relying on unpinned online examples."],
    },
    {
        command: 'npx effect-solutions "How should this Layer be composed?"',
        description: "Ask the Effect solutions corpus a focused question.",
        tags: ["effect", "layer", "documentation"],
        comments: ["URM currently follows the pinned Effect v4 beta APIs."],
    },
    {
        command: "pscale --skill",
        description: "Print the installable PlanetScale agent skill file.",
        tags: ["planetscale", "pscale", "agents", "skills", "reference"],
        comments: [
            "Requires pscale 0.292.0 or later; run brew upgrade pscale when the flag is unknown.",
            "Agents and automation should start here, with pscale agent-guide --format json, or with the /docs/agent-setup/prompt setup prompt.",
            "Reference: https://planetscale.com/docs/cli",
        ],
    },
    {
        command: "pscale agent-guide --format json",
        description: "Print the PlanetScale bootstrap guide for AI agents.",
        tags: ["planetscale", "pscale", "agents", "reference", "json"],
        comments: [
            "Covers Vitess, Postgres, and Neki; requires pscale 0.292.0 or later.",
            "Always pass --format json in automation.",
        ],
    },
    {
        command: "pscale auth login",
        description: "Authenticate the CLI through the browser device flow.",
        tags: ["planetscale", "pscale", "auth", "login"],
        comments: [
            "Interactive only; CI and agents use a service token instead.",
            "pscale auth login --format json runs the JSON device login for agents.",
        ],
    },
    {
        command: "pscale auth check --format json",
        description:
            "Confirm the current PlanetScale credentials are wired up.",
        tags: ["planetscale", "pscale", "auth", "diagnostics", "json"],
        comments: [
            "Expect authenticated true and auth_method service_token when a service token is configured.",
            "Until an organization is set, this reports action_required with a NO_ORG issue and exits non-zero; resolve it with --org or PLANETSCALE_ORG.",
        ],
    },
    {
        command: "pscale auth logout",
        description: "Remove the stored PlanetScale credentials.",
        tags: ["planetscale", "pscale", "auth", "logout"],
        comments: [
            "Not needed under service-token auth; the token itself is the credential.",
        ],
    },
    {
        command:
            'export PLANETSCALE_SERVICE_TOKEN_ID="<id>" PLANETSCALE_SERVICE_TOKEN="<token>"',
        description:
            "Configure service-token authentication for CI and agents.",
        tags: ["planetscale", "pscale", "auth", "service-token", "ci"],
        comments: [
            "Environment variables are the recommended form; --service-token-id and --service-token flags on each command are equivalent.",
            "A service token has no active organization, so also export PLANETSCALE_ORG or pass --org on every resource subcommand.",
            "Never commit the token or log it; read it from the secret store.",
        ],
    },
    {
        command: 'export PLANETSCALE_ORG="<org>"',
        description: "Set the organization used by service-token commands.",
        tags: ["planetscale", "pscale", "org", "service-token", "ci"],
        comments: [
            "Alternatives are the --org flag on the subcommand or pscale org switch <org>, which works with a service token.",
            "--org belongs on the resource subcommand, never on root pscale; pscale --org <org> database list fails with unknown flag: --org.",
        ],
    },
    {
        command: "pscale org list --format json",
        description: "List the organizations the credentials can reach.",
        tags: ["planetscale", "pscale", "org", "inspect", "json"],
        comments: [
            "Use this instead of pscale org show under a service token, then pass the organization with --org or PLANETSCALE_ORG.",
        ],
    },
    {
        command: "pscale org show",
        description: "Show the currently active organization.",
        tags: ["planetscale", "pscale", "org", "inspect"],
        comments: [
            "Under a valid service token this prints “not authenticated yet. Please run 'pscale auth login'”; that is the no-current-org state, not an auth failure.",
            "Do not respond by running pscale auth login. Discover the organization with pscale org list instead.",
        ],
    },
    {
        command: "pscale org switch <org>",
        description: "Change the active PlanetScale organization.",
        tags: ["planetscale", "pscale", "org", "switch"],
        comments: [
            "Works with a service token; other org subcommands are list, member, show, sso, team, and update.",
        ],
    },
    {
        command: "pscale database list --org <org> --format json",
        description: "List the databases in an organization.",
        tags: ["planetscale", "pscale", "database", "inspect", "json"],
        comments: [
            "--org can be omitted when PLANETSCALE_ORG is exported or an organization is active.",
        ],
    },
    {
        command: "pscale database create <database> --org <org>",
        description: "Create a PlanetScale database.",
        tags: ["planetscale", "pscale", "database", "create"],
        comments: [
            "Other database subcommands: aggressive-cutover, delete, dump, ip-restriction, read-only-regions, regions, restore-dump, show, throttler, update.",
            "Reference: https://planetscale.com/docs/cli/database",
        ],
    },
    {
        command: "pscale database show <database> --org <org>",
        description: "Show the configuration of a single database.",
        tags: ["planetscale", "pscale", "database", "inspect"],
        comments: ["Add --format json for machine-readable output."],
    },
    {
        command: "pscale database dump <database> <branch> --org <org>",
        description: "Export a database branch to local dump files.",
        tags: ["planetscale", "pscale", "database", "dump", "backup"],
        comments: [
            "pscale database restore-dump loads the files back into a branch.",
        ],
    },
    {
        command: "pscale database delete <database> --org <org>",
        description: "Delete a PlanetScale database.",
        tags: ["planetscale", "pscale", "database", "delete", "destructive"],
        comments: [
            "Destructive and irreversible; confirm the organization and database name first.",
        ],
    },
    {
        command: "pscale branch list <database> --org <org> --format json",
        description: "List the branches of a database.",
        tags: ["planetscale", "pscale", "branch", "inspect", "json"],
        comments: ["Reference: https://planetscale.com/docs/cli/branch"],
    },
    {
        command: "pscale branch create <database> <branch> --org <org>",
        description: "Create a development branch from the database.",
        tags: ["planetscale", "pscale", "branch", "create"],
        comments: ["Branching works for Vitess, Postgres, and Neki databases."],
    },
    {
        command: "pscale branch switch <branch> --database <database>",
        description: "Select the active branch for later commands.",
        tags: ["planetscale", "pscale", "branch", "switch"],
        comments: [
            "Also available: show, update, demote, promote, refresh-schema, resize, and delete.",
        ],
    },
    {
        command: "pscale branch diff <database> <branch> --org <org>",
        description: "Show the schema difference against the parent branch.",
        tags: ["planetscale", "pscale", "branch", "schema", "diff"],
        comments: [
            "pscale branch schema prints the full branch schema instead of the difference.",
        ],
    },
    {
        command: "pscale branch lint <database> <branch> --org <org>",
        description: "Check a branch schema for Vitess compatibility problems.",
        tags: ["planetscale", "pscale", "branch", "schema", "lint", "quality"],
        comments: ["Run this before opening a deploy request."],
    },
    {
        command:
            "pscale branch safe-migrations enable <database> <branch> --org <org>",
        description: "Require deploy requests for schema changes on a branch.",
        tags: ["planetscale", "pscale", "branch", "safety", "migrations"],
        comments: [
            "Use disable to turn the protection off; production branches keep it enabled.",
        ],
    },
    {
        command: "pscale branch promote <database> <branch> --org <org>",
        description: "Promote a branch to production.",
        tags: ["planetscale", "pscale", "branch", "production", "promote"],
        comments: ["pscale branch demote reverses the change."],
    },
    {
        command:
            "pscale branch config-profile list <database> <branch> --org <org>",
        description: "List the Neki configuration profiles on a branch.",
        tags: ["planetscale", "pscale", "branch", "neki", "configuration"],
        comments: [
            "Neki branch subcommands also cover router, sidecar, shard, data-topology, routing-rules, and switchover.",
        ],
    },
    {
        command:
            'pscale sql <database> <branch> --query "select 1" --format json',
        description: "Run a SQL query without an interactive shell.",
        tags: ["planetscale", "pscale", "sql", "query", "agents", "json"],
        comments: [
            "This is the command agents and scripts should use; pscale shell and pscale connect open interactive sessions.",
            "Flags: --org, --role, --replica, --dbname, --keyspace, --force, --vertical, --format json.",
        ],
    },
    {
        command: "pscale shell <database> <branch> --org <org>",
        description: "Open an interactive SQL shell against a branch.",
        tags: ["planetscale", "pscale", "shell", "interactive", "sql"],
        comments: [
            "Interactive only; not usable under service-token automation.",
            "Flags: --db-name, --local-addr, --remote-addr, --role, --replica, --router.",
            "Uses the local MySQL or PostgreSQL client for the interactive session.",
        ],
    },
    {
        command: "pscale connect <database> <branch> --org <org>",
        description: "Open a local secure proxy to a Vitess branch.",
        tags: ["planetscale", "pscale", "connect", "proxy", "vitess"],
        comments: [
            "Vitess only; keep the terminal open while applications use the local port.",
            "Flags: --host, --port, --remote-addr, --role, --execute, --execute-env-url, --execute-protocol.",
        ],
    },
    {
        command: "pscale api organizations/<org>/databases --format json",
        description: "Call the PlanetScale API and print the raw response.",
        tags: ["planetscale", "pscale", "api", "json", "fallback"],
        comments: [
            "Use this when a command's human output is hard to parse; it uses the same credentials as the CLI.",
            "Flags: --org, --database, --branch, --method, --field key=value, --query key=value, --header, --input.",
        ],
    },
    {
        command: "pscale api organizations/<org>/service-tokens --format json",
        description: "List service tokens through the API.",
        tags: ["planetscale", "pscale", "api", "service-token", "json"],
        comments: [
            "pscale service-token list is unavailable when authenticated with a service token; this API call is the replacement.",
            "Append /<id> for the single-token view that replaces pscale service-token show-access.",
        ],
    },
    {
        command: "pscale service-token create --org <org>",
        description: "Create a service token for CI or agent access.",
        tags: ["planetscale", "pscale", "service-token", "auth", "ci"],
        comments: [
            "Requires interactive login; every service-token subcommand is blocked under service-token auth.",
            "Grant access with add-access; review with show-access and list.",
            "Permissions reference: https://planetscale.com/docs/api/reference/service-tokens",
        ],
    },
    {
        command: "pscale deploy-request create <database> <branch> --org <org>",
        description: "Open a deploy request for a Vitess schema change.",
        tags: ["planetscale", "pscale", "deploy-request", "schema", "vitess"],
        comments: [
            "Vitess only. Follow with deploy, and with review or reviews for gated deployments.",
            "Reference: https://planetscale.com/docs/vitess/schema-changes/deploy-requests",
        ],
    },
    {
        command: "pscale deploy-request deploy <database> <number> --org <org>",
        description: "Deploy a queued schema change.",
        tags: ["planetscale", "pscale", "deploy-request", "deploy", "vitess"],
        comments: [
            "Related subcommands: diff, show, list, queue, deployment, operations, storage-check, throttler, unblock.",
            "force-cutover, revert, skip-revert, cancel, and close control the deployment once it is running.",
        ],
    },
    {
        command: "pscale deploy-request revert <database> <number> --org <org>",
        description: "Revert a completed schema deployment.",
        tags: ["planetscale", "pscale", "deploy-request", "revert", "vitess"],
        comments: [
            "Only possible inside the revert window; skip-revert ends that window early.",
        ],
    },
    {
        command: "pscale keyspace list <database> <branch> --org <org>",
        description: "List the keyspaces inside a Vitess branch.",
        tags: ["planetscale", "pscale", "keyspace", "vitess", "sharding"],
        comments: [
            "Subcommands: create, create-external, delete, read-only-regions, resize, rollout-status, settings, show, update-settings, vschema.",
        ],
    },
    {
        command: "pscale workflow list <database> <branch> --org <org>",
        description: "List the Vitess workflows on a branch.",
        tags: ["planetscale", "pscale", "workflow", "vitess"],
        comments: [
            "Subcommands: create, show, cancel, complete, cutover, retry, reverse-cutover, reverse-traffic, switch-traffic, verify-data.",
        ],
    },
    {
        command: "pscale move-tables list <database> <branch> --org <org>",
        description: "List the Vitess MoveTables workflows on a branch.",
        tags: ["planetscale", "pscale", "move-tables", "vitess", "migration"],
        comments: [
            "Equivalent to pscale branch vtctld move-tables; subcommands are create, show, status, switch-traffic, reverse-traffic, complete, cancel.",
        ],
    },
    {
        command: "pscale backup list <database> <branch> --org <org>",
        description: "List the backups of a database branch.",
        tags: ["planetscale", "pscale", "backup", "inspect"],
        comments: [
            "Subcommands: create, delete, policy, restore, restore show, show, update.",
            "Available for Vitess, Postgres, and Neki branches.",
        ],
    },
    {
        command: "pscale insights queries --org <org> --format json",
        description: "Read server-side query insights from production traffic.",
        tags: ["planetscale", "pscale", "insights", "performance", "json"],
        comments: [
            "Also exposes queries samples, show, summary, traffic-budgets, errors, anomalies, tags, and recommendations.",
            "recommendations dismiss clears a schema recommendation.",
        ],
    },
    {
        command: "pscale inspect all --org <org> --format json",
        description: "Run read-only diagnostics over a direct connection.",
        tags: [
            "planetscale",
            "pscale",
            "inspect",
            "diagnostics",
            "performance",
        ],
        comments: [
            "Individual checks include table-sizes, index-sizes, unused-indexes, redundant-indexes, invalid-indexes, seq-scans, long-running-queries, locks, outliers, calls, bloat, vacuum-stats, replication-slots, subscriptions.",
            "Flags: --keyspace, --dbname, --role, --replica.",
        ],
    },
    {
        command: "pscale metrics show --org <org> --period 24h --format json",
        description: "Query historical and current branch metrics.",
        tags: ["planetscale", "pscale", "metrics", "monitoring", "json"],
        comments: [
            "Subcommands: instant, keyspace-tables, queries, report, show, tables, tablets, tags.",
            "Flags: --metric, --period, --from, --to, --steps.",
        ],
    },
    {
        command:
            "pscale logs <database> <branch> --org <org> --period 1h --limit 100",
        description: "Query recent Postgres or Neki branch logs.",
        tags: ["planetscale", "pscale", "logs", "monitoring", "postgres"],
        comments: [
            "Flags: --query, --period, --from, --to, --level, --server, --shard, --limit, --page.",
        ],
    },
    {
        command: "pscale audit-log list --org <org>",
        description: "List the organization audit log entries.",
        tags: ["planetscale", "pscale", "audit-log", "security"],
        comments: [
            "pscale audit-log auth-attempts download exports authentication attempts.",
        ],
    },
    {
        command: "pscale password list <database> <branch> --org <org>",
        description: "List the connection credentials of a Vitess branch.",
        tags: ["planetscale", "pscale", "password", "credentials", "vitess"],
        comments: [
            "Subcommands: create, delete, renew, show, update. Flags: --name, --new-name, --cidrs, --status.",
            "Passwords are shown once at creation; store them in the secret manager, never in the repository.",
        ],
    },
    {
        command: "pscale role list <database> <branch> --org <org>",
        description: "List the Postgres or Neki roles on a branch.",
        tags: ["planetscale", "pscale", "role", "postgres", "credentials"],
        comments: [
            "Subcommands: create, default, delete, get, reassign, renew, reset, reset-default, update.",
            "Flags: --inherited-roles, --ttl, --force, --successor, --name, --web.",
        ],
    },
    {
        command: "pscale pgbouncer list <database> <branch> --org <org>",
        description: "List the dedicated PgBouncers on a Postgres branch.",
        tags: ["planetscale", "pscale", "pgbouncer", "postgres", "connection"],
        comments: ["Subcommands: create, delete, resize, show."],
    },
    {
        command:
            "pscale read-only-replica list <database> <branch> --org <org>",
        description: "List the read-only replicas of a Postgres branch.",
        tags: ["planetscale", "pscale", "replica", "postgres", "scaling"],
        comments: [
            "Subcommands: create, delete, show, update. Flags: --region, --replicas, --cluster-size, --parameters, --force.",
        ],
    },
    {
        command: "pscale traffic-control rule list --org <org>",
        description: "Manage Postgres database traffic control rules.",
        tags: ["planetscale", "pscale", "traffic-control", "postgres"],
        comments: [
            "Postgres only; budget manages traffic budgets alongside rule.",
        ],
    },
    {
        command: "pscale import d1 doctor --org <org>",
        description:
            "Check a Cloudflare D1 import for problems before starting.",
        tags: ["planetscale", "pscale", "import", "postgres", "cloudflare"],
        comments: [
            "The import flow is doctor, lint, convert-schema, start, verify, status, complete.",
        ],
    },
    {
        command: "pscale webhook list --org <org>",
        description: "List the webhooks configured for a database.",
        tags: ["planetscale", "pscale", "webhook", "integration"],
        comments: [
            "Subcommands: create, delete, show, test, update. Flags: --events, --url, --enabled.",
        ],
    },
    {
        command: "pscale region list --org <org>",
        description: "List the PlanetScale regions available to the account.",
        tags: ["planetscale", "pscale", "region", "reference"],
        comments: [
            "pscale size cluster list shows the cluster sizes, with --engine, --region, --metal, and --external filters.",
        ],
    },
    {
        command: "pscale ping",
        description: "Measure latency to the public PlanetScale regions.",
        tags: ["planetscale", "pscale", "ping", "latency", "diagnostics"],
        comments: [
            "Flags: --count/-n, --concurrency, --provider/-p, --timeout.",
        ],
    },
    {
        command: "pscale maintenance list --org <org>",
        description: "View planned maintenance schedules for a database.",
        tags: ["planetscale", "pscale", "maintenance", "vitess"],
        comments: ["Subcommands: list, show, windows."],
    },
    {
        command: "pscale billing payment-method show --org <org>",
        description: "Show the organization payment method.",
        tags: ["planetscale", "pscale", "billing"],
        comments: [
            "The same subcommand updates or deletes the payment method.",
        ],
    },
    {
        command: "pscale completion zsh",
        description: "Generate a shell completion script for pscale.",
        tags: ["planetscale", "pscale", "completion", "shell", "setup"],
        comments: ["Shells supported: bash, zsh, fish, powershell."],
    },
    {
        command: "pscale help agents",
        description: "Show the PlanetScale agent automation help topic.",
        tags: ["planetscale", "pscale", "help", "agents", "reference"],
        comments: [
            "pscale help <command> covers every other command group.",
            "Global flags: --api-token, --api-url, --config, --debug, --format, --no-color, --service-token, --service-token-id, --skill, --version.",
        ],
    },
]
