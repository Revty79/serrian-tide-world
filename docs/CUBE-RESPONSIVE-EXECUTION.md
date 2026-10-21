# Cube-C2B2 responsive numerical execution

Cube-C2B2 adds an optional scheduler around accepted Cube-A/B/C1/C2A/C2B1. It does not add cube rendering, input UI, persistence or geometry. The baseline is accepted C2B1 delivery `701062a9c257a1546dbde566e8571ed88f979456`, implementation `48048844039a8d85aa9d9997bac104140ea64f68`.

## Authority and scheduling

`createResponsiveSolidCubeSession(terrain, options)` owns the same C2B1 session and history as the original constructor. Both constructors share the terrain ownership registry. The original cooperative constructor remains available. The sole core change is a trusted path factory with optional synchronization and post-publication acknowledgement hooks. No accepted geometry, route, spacing, C1 or history implementation changes.

The host is the only terrain/history authority. Workers receive **zero elevation arrays** and propose **zero elevation changes**. They own independent exact private snapshots of pure path/configuration state, reconstructed by running unchanged C2A over a bounded action log. They cannot mutate a saved document. C1 preparation, complete physical footprint, canonical sample ownership, exact before/after words, history reservation and atomic publication remain on the host through the accepted interfaces.

Three modes are available: `cooperative`, `auto` (default), and `worker` (forced path-worker evaluation). The initial dab always stays local. Auto promotes after eight certified route queries, at a boundary where all generated dabs have been canonically committed. This is the largest tested many-bend prefix whose path pumps stayed below 10 ms in the recorded page-target CDP4x baseline: first eight intervals had maximum 9.6 ms; first twelve reached 19.6 ms. It is a measured workload policy, not a frame-time guarantee. Short strokes avoid startup and transport. Optional replay-log exhaustion keeps the exact local path; it never drops input or increases numerical budgets.

The evaluated C1 worker prototype copied one source per three-dab experiment, returned proposals and required complete host recomputation before publication. It was slower in 31/32 matched pairs. That prototype is retained as isolated evidence, not adopted. Its result does not prove all possible C1 worker architectures inferior. This pass targets expensive pure path work while retaining the complete accepted C1 host validation contract.

## Exact handoff and validation

Before promotion, successful accepts, pumps, release and full nonempty events are recorded. Each worker independently replays this **pure path** log and compares every full past event and final statistics/status to the host checkpoint. Replay never reapplies terrain. The original local path remains frozen until the first live worker step is validated. Exact carried arc residuals, route continuation and ambiguity policy are therefore reconstructed by the same accepted algorithm, without adding a private-state serialization format or silently resetting spacing.

Every packet binds task ID, generation, immutable configuration/terrain identity and worker role. Each live request carries the next sequence, ordered input ordinals, release state and canonical acknowledgement `{revision, committedDabs, writes}`. Each role sends an acceptance acknowledgement and then one full path result. The host admits only the current task/generation/binding/role/sequence/revision, rejects duplicates/reordering and ignores stale task/generation messages.

The two roles must be distinct Worker objects. Complete result bodies are compared cooperatively, including route/tie policy, rational witnesses, algebraic rounding bounds, center, ordinals, work counters and error/status. Timing metadata is separately validated because execution times differ between workers. A bounded owned immutable clone prevents later mutation, getters, cycles, unsafe prototypes or nonfinite values from entering the host path.

Additional host checks independently validate physical endpoints against accepted inputs, world/chart agreement, closed faces, connected segments and vertices, parameter order, real fold/edge identities, transported directions, length enclosures, absence of internal singular corners, and exact nearest/even rounding cells. These checks also reject tested correlated corruptions of both replicas. **The replicas still run the same accepted C2A program.** Matching replicas are not an independently implemented global-shortest-route or carried-arc proof and are not Byzantine protection against arbitrary replacement worker programs. The accepted completeness argument and independently executed Python/finite Float32 reference remain the mathematical verification.

After a validated dab center enters the host, unchanged C1 derives the entire numerical proposal from the current canonical source. Unchanged history validates/reserves its full prospective union before publication. Only a successful atomic commit invokes the path acknowledgement. Revision increments equal actual changed words; no-op dabs advance the committed-dab ordinal without advancing revision. A worker rejects a subsequent request until every previously generated dab is canonically acknowledged. No speculative terrain epoch or subsequent C1 preparation occurs in a worker.

## Equivalence argument

Initially both modes use the same first accepted point and unchanged C1 source. A handoff reconstructs the exact C2A checkpoint and checks all already-consumed events. For each subsequent step, unchanged deterministic C2A replicas produce the same event sequence as accepted C2A, subject to the independent host witness checks. Before each dab the sole host authority has the identical canonical Float32 source because the preceding dab was committed once and acknowledged. Unchanged C1 therefore calculates identical full before/after words, and unchanged history merges the same ordered changes. Induction gives identical per-dab words/revisions, final terrain and complete net history. Signed zero is compared as raw words; path scalar comparison uses `Object.is`.

This argument depends on the trusted default worker implementation and deterministic accepted primitives. It is supported by full-word native/worker comparisons after every publication, an independent small-grid reference, complete large-grid vectors and real browser-worker tests. It does not establish interactive visual acceptance.

## Failure and lifecycle

Before the first live worker result is adopted, construction/startup/decode/crash failure can resume the **same frozen local path**. At most eight inputs accepted since the checkpoint are flushed in ordinal order; committed terrain is never replayed. Failed validation of a current response is rejected rather than silently accepted. Once any live worker step is adopted, the local checkpoint is freed and later worker failure is explicit failure, not a successful full gesture. There is no approximate or residual-reset fallback.

Source synchronization is checked before all host work and publication, including asynchronous faults while C1 is preparing, collecting history or reserved. Failure/cancellation disposes pending work and seals the exact committed prefix as one operation with its actual termination. Normal release drains every accepted input. Disjoint external edits can be preserved by explicit validated Undo/Redo; overlapping conflicts retain the accepted atomic rejection behavior. Cancellation/disposal never paints pending proposals.

Workers are acquired lazily. Normal complete strokes may retain at most two idle workers within their session. Each reuse starts a fresh runtime, task and source binding; idle errors evict the instance. Faults/cancellation terminate workers. `reuseWorkers:false` disables retention. Session disposal terminates retained/active workers, closes scheduling ports and resolves progress waits. A global ownership registry prevents a factory from leasing the same worker to both roles or stealing another active session's worker.

`waitForProgress()` waits on the shared event signal during worker or idle input waits. Local/validation work yields a normal MessageChannel task (Node uses `setImmediate`). It does not spin a high-priority microtask loop. The caller pumps one bounded quantum, waits, retries any explicitly non-admitted input and reports failures. Options may lower startup/request deadlines but cannot exceed 10 seconds each. A request deadline clears when both results arrive, before cooperative host validation, so paused validation does not create a false timeout. A paused or failed transport remains bounded by its deadline.

## Bounds and retained data

| Resource | Bound |
| --- | --- |
| Workers per session | Two; separate primary/verifier realms |
| Pending input, including transit | Eight; accepted hard cap 256; false means non-admission and requires retry |
| Live requests | One physical step per role; at most two stored result bodies and four expected replies |
| Host numerical work | One accepted C1 job and one exact gesture-history lifecycle |
| Optional replay log | 4,096 actions, 128 events, 2 MiB modeled data |
| Live result body | 512 KiB modeled data per role |
| Cooperative value validation | 128 fields per normal pump; 32,768 nodes, depth 32, arrays 4,096, keys 64, BigInts 16,384 bits |
| Diagnostic timing retention | 128 samples per fixed stage, with lifetime counts/totals/maxima |
| Terrain source copies to adopted workers | Zero |
| Path checkpoint copies | Two at promotion, then freed after adoption; cancellation frees all retained path data |
| Existing path limits | Eight pending inputs, 256 accepted, 4,096 dabs, eight output events, unchanged per-step and 16,000,000 total work |
| Existing C1/history limits | Unchanged: C1 65,536 changes / 786,432 prepared typed bytes; gesture union 65,536 words; 32 entries / 8 MiB retained history |

Modeled data bytes are explicit conservative accounting of values, not browser allocator/RSS measurements. Workers add runtime/module heaps, two path computations, transport copies, replay and host certificate validation. The original provider limits apply independently to each execution; redundant execution increases total CPU while reducing where expensive work runs. Page CDP heap measurements do not include full worker RSS. The report records observed queues, work and copy counts separately from these configured bounds.

## Separate history-capacity decision

The existing 65,536-word gesture ceiling is a capability limit, not solved by scheduling. Required wide N256 examples stop after one committed dab. Their exact failed prefix remains one Undo/Redo operation. No hidden splitting, thinning, quantization or capacity increase is permitted here.

A separately authorized checkpoint could compare larger bounded exact unions, chunked/compressed exact patches, whole-authority snapshots or an explicit creator-visible stroke limit. Each option needs memory/replay/startup measurements on weaker devices, atomic conflict handling, signed-zero preservation, eviction/branching behavior and full prefix tests. A held gesture must remain one logical operation. This document proposes evaluation only; it does not authorize or implement it.

## Measurement boundary and next gate

The [completion report](CUBE-C2B2-COMPLETION.md) separates baseline/final processing, first authoritative change, complete draining, main tasks, frame gaps, startup, transport, acknowledgement, memory and cold/warm counts. Mobile means Chromium Pixel 7 emulation with page-target CDP4x for performance; worker threads are not guaranteed the same throttling and no physical phone was tested. No cube map renderer exists, so there is no first-visible terrain-pixel measurement or owner hands-on cube acceptance.

**Stop after Cube-C2B2 for independent review and owner direction.** History-capacity work, Cube-D rendering, Cube-E editor, Cube-F persistence/workspace selection, hollow cubes and website/Worlds integration remain separate checkpoints. Existing sphere/cylinder/flat/wrapped UI and v1–v4 persistence remain authoritative and unchanged.
