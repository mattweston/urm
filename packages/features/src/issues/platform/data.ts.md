import type { Issue } from "@urm/domain/schemas/issues"

const now = Date.now()

export const initialIssues: ReadonlyArray<Issue> = [
{
id: "ISS-128",
title: "Tighten the issue board spacing on mobile",
description:
"The board feels crowded below 768px. Add breathing room and keep cards readable.",
content: "Audit the layout at tablet and phone widths.",
status: "open",
priority: "high",
labels: JSON.stringify(["ui", "mobile"]),
assignee*id: "Sofia Davis",
order_position: 1,
updated_at: now - 1000 * 60 _ 45,
},
{
id: "ISS-131",
title: "Drag cards between status columns",
description:
"Allow moving issues between columns with pointer drag and keyboard reordering.",
content: "Use the kanban labs patterns as the interaction reference.",
status: "in_progress",
priority: "urgent",
labels: JSON.stringify(["kanban", "interaction"]),
assignee_id: "Jackson Lee",
order_position: 2,
updated_at: now - 1000 _ 60 _ 90,
},
{
id: "ISS-122",
title: "Document the issue filters",
description:
"Describe how search, status, and priority filters interact in the UI.",
content: "Add copy to the details panel and landing page.",
status: "on_hold",
priority: "medium",
labels: JSON.stringify(["docs"]),
assignee_id: "Amelia Rivera",
order_position: 3,
updated_at: now - 1000 _ 60 _ 180,
},
{
id: "ISS-118",
title: "Ship the first pass of issue list view",
description:
"The list table should support quick scanning and compact metadata.",
content: "Use the filtered results from the board view.",
status: "closed",
priority: "low",
labels: JSON.stringify(["list", "release"]),
assignee_id: "Maya Chen",
order_position: 4,
updated_at: now - 1000 _ 60 \_ 24 \* 5,
},
]
