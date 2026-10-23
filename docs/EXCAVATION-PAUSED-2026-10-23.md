# Excavation work paused by owner

Owner direction on 2026-10-23: return to the morning shape-editing checkpoint.
Finish queued shapes first. Holes, tunnels and links, including operation at
arbitrary terrain heights and depths, are a later shared pass.

This recovery branch preserves published Pyramid connections from e92de38 plus
unfinished Tetrahedron connection integration. It is not a passing release or
owner-accepted result. The owner reports Pyramid hole/tunnel rejection followed
by inability to resume painting. That regression is unresolved here.

Eight Tetrahedron main workflow cases passed in an earlier draft, along with
focused boundary/storage checks. The latest pixel-only run has two failures;
final whole-source validation and a Tetrahedron delivery receipt are incomplete.
The final added guard tests have not run. Do not merge this branch as verified.

The published Pyramid evidence remains a historical technical record, not proof
of owner acceptance. Local ignored diagnostic artifacts remain under .local.
No user map data or IndexedDB records are changed by the source rollback.

Recovery parent: e92de38a78bfa0e890c7e4a0067c1fcedbd05042.
Morning candidates: 7d6a3f7 (live at 06:00 MDT) and 0b3f038 (07:30 MDT).
