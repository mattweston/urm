import { Option } from "effect"
import {
    ContributorSummary,
    DependencyEdge,
    PackageSnapshot,
    RepositorySnapshot,
    Telemetry,
    WeeklyDownloads,
    WeeklyTelemetry,
} from "./domain.ts"

export const sampleTelemetry = Telemetry.make({
    fetchedAt: Date.UTC(2026, 5, 22, 12, 0, 0),
    repository: RepositorySnapshot.make({
        stars: 342,
        forks: 18,
        watchers: 342,
        openIssues: 12,
        openPullRequests: 3,
        visibleContributors: 9,
        pushedAt: "2026-06-21T19:20:00Z",
        defaultBranch: "main",
    }),
    packages: [
        PackageSnapshot.make({
            id: "Core",
            npmName: "foldkit",
            displayName: "foldkit",
            role: "runtime",
            latestVersion: "0.115.0",
            publishedAt: "2026-06-20T12:00:00Z",
            totalDownloads: 1200,
            lastWeekDownloads: 160,
            dependencyCount: 1,
            downloadsByWeek: [
                WeeklyDownloads.make({
                    weekStart: "2026-06-01",
                    downloads: 110,
                }),
                WeeklyDownloads.make({
                    weekStart: "2026-06-08",
                    downloads: 130,
                }),
                WeeklyDownloads.make({
                    weekStart: "2026-06-15",
                    downloads: 160,
                }),
            ],
        }),
        PackageSnapshot.make({
            id: "Ui",
            npmName: "@foldkit/ui",
            displayName: "@foldkit/ui",
            role: "components",
            latestVersion: "0.115.0",
            publishedAt: "2026-06-20T12:00:00Z",
            totalDownloads: 820,
            lastWeekDownloads: 95,
            dependencyCount: 1,
            downloadsByWeek: [
                WeeklyDownloads.make({
                    weekStart: "2026-06-01",
                    downloads: 70,
                }),
                WeeklyDownloads.make({
                    weekStart: "2026-06-08",
                    downloads: 90,
                }),
                WeeklyDownloads.make({
                    weekStart: "2026-06-15",
                    downloads: 95,
                }),
            ],
        }),
        PackageSnapshot.make({
            id: "Devtools",
            npmName: "@foldkit/devtools",
            displayName: "@foldkit/devtools",
            role: "inspection",
            latestVersion: "0.115.0",
            publishedAt: "2026-06-20T12:00:00Z",
            totalDownloads: 460,
            lastWeekDownloads: 48,
            dependencyCount: 1,
            downloadsByWeek: [
                WeeklyDownloads.make({
                    weekStart: "2026-06-01",
                    downloads: 38,
                }),
                WeeklyDownloads.make({
                    weekStart: "2026-06-08",
                    downloads: 44,
                }),
                WeeklyDownloads.make({
                    weekStart: "2026-06-15",
                    downloads: 48,
                }),
            ],
        }),
        PackageSnapshot.make({
            id: "VitePlugin",
            npmName: "@foldkit/vite-plugin",
            displayName: "@foldkit/vite-plugin",
            role: "build",
            latestVersion: "0.115.0",
            publishedAt: "2026-06-20T12:00:00Z",
            totalDownloads: 320,
            lastWeekDownloads: 36,
            dependencyCount: 1,
            downloadsByWeek: [
                WeeklyDownloads.make({
                    weekStart: "2026-06-01",
                    downloads: 26,
                }),
                WeeklyDownloads.make({
                    weekStart: "2026-06-08",
                    downloads: 31,
                }),
                WeeklyDownloads.make({
                    weekStart: "2026-06-15",
                    downloads: 36,
                }),
            ],
        }),
    ],
    weeks: [
        WeeklyTelemetry.make({
            weekStart: "2026-06-01",
            cumulativeStars: 330,
            commits: 12,
            releases: 1,
        }),
        WeeklyTelemetry.make({
            weekStart: "2026-06-08",
            cumulativeStars: 336,
            commits: 17,
            releases: 0,
        }),
        WeeklyTelemetry.make({
            weekStart: "2026-06-15",
            cumulativeStars: 342,
            commits: 22,
            releases: 1,
        }),
    ],
    dependencyEdges: [
        DependencyEdge.make({
            source: "Ui",
            target: "Core",
            kind: "PeerDependency",
        }),
        DependencyEdge.make({
            source: "Devtools",
            target: "Core",
            kind: "PeerDependency",
        }),
        DependencyEdge.make({
            source: "VitePlugin",
            target: "Core",
            kind: "PeerDependency",
        }),
    ],
    topContributors: [
        ContributorSummary.make({
            login: "devin",
            contributions: 42,
            avatarUrl: Option.none(),
        }),
        ContributorSummary.make({
            login: "maya",
            contributions: 21,
            avatarUrl: Option.none(),
        }),
        ContributorSummary.make({
            login: "alex",
            contributions: 14,
            avatarUrl: Option.none(),
        }),
    ],
    warnings: [],
})
