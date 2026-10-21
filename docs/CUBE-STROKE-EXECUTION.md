# Cube-C2B1 authoritative stroke execution and exact history

Cube-C2A is accepted for development progression at implementation `dcd8d2378ed5173aca8d0b1c8f6044085bc5619f`, delivery `d7b3ae7ca462f14eb5ac3f4a043b60c0397d2973`. C2B1 connects its certified physical centers to accepted C1 dabs without changing Cube-A/B/C1/C2A source or limits. This is a numerical TypeScript layer, independent of React, DOM, camera, workers, storage and host services. It is not a selectable cube editor.

## Authority and entry points

`createSolidCubeSession(terrain, historyLimits?)` in `src/editor/solid-cube-session.ts` binds the exact terrain object, its complete canonical key at index zero, sample count and elevation byte length. One private Cube-A Float32 array remains authoritative. History stores patches, never an independently editable terrain copy. A module-level weak ownership registry prevents two sessions from running simultaneous strokes on the same terrain object. External mutation still requires revision detection; another history object does not bypass the lease.

The frozen facade exposes `begin(firstPosition, settings, options?)`, `pump(steps?)`, `release`, `cancel`, `undo`, `redo`, `clearHistory` and `dispose`; `stroke`, `lastStroke`, `binding`, `terrain` and `history` expose state. The returned stroke accepts physical `SurfacePosition` observations and reports immutable settings, status, failure and progress. Callers drive scheduling explicitly; there are no timers or infinite drain loops.

Settings are copied and validated by the unchanged C1 factory at gesture start. The resulting frozen C1 settings are reused for every later center. Changing the caller's object cannot alter a held stroke. Source identity/configuration/dimensions and the exact expected revision are checked at public input, release, every pump, C1 handoffs, reservation and publication. Foreign/invalid input fails the active gesture and seals any earlier prefix.

## Input, path and publication order

`accept` returns `false` when the existing eight-input C2A queue is full. That observation has **not** been accepted; the host must retain it and retry in order. Accepted inputs are never thinned. Hard input/path exhaustion throws and terminates safely. Host observations still cannot establish unobserved pointer travel or resolve every ambiguous physical intent; C2A's explicit route/continuation/backtrack/corner policy remains authoritative.

There is one initial dab, followed only by C2A's regular physical radius/4 centers. No release stamp, face-transition reset or failure replay is added. Before initializing a center, the executor requires its ordinal to equal the number of already committed dabs. It holds one C1 job, consumes no next center while that job is pending and performs no speculative source advancement.

Each `pump(1..4096)` performs one stage:

1. Advance one bounded C2A route/arithmetic/event step, or consume its path certificate.
2. Initialize one unchanged C1 preparation on the current authoritative epoch.
3. Advance C1 by the caller's bounded quantum.
4. Merge prepared changes into a prospective complete gesture patch, at most one sorted merge item per bookkeeping step.
5. Publish one fully prepared/reserved dab through C1's existing atomic hook.
6. Seal completion only after release, exhausted accepted path events and no pending dab.

Route reconstruction and C1 initialization may each contain indivisible bounded calculations. Publication and replay use the unchanged bounded atomic hook. Cooperative progression is not a promise that every call fits a browser frame. See actual timings in the [completion report](CUBE-C2B1-COMPLETION.md).

After successful publication, the session advances its lease by the **actual number of changed words**, matching Cube-A's revision semantics. Subsequent dabs use the newly published source. In particular, Smooth reads the updated pre-dab connected graph values, rather than a gesture-start snapshot. A no-op commit counts as an executed dab but performs no writes or revision advancement.

Progress separates accepted observations, generated centers, initialized/prepared/reserved dabs, committed dabs, changing dabs, changed-word writes and fully executed inputs. An input is fully executed only after C2A has processed it and all generated centers through that input have committed. Statistics also retain the last physical committed center/ordinal/input sequence, expected/pending revisions, uncompleted accepted inputs and generated-but-uncommitted dabs. A partially executed input is not reported complete.

## Exact history construction

`createSolidCubeHistory` privately constructs C1 jobs; callers cannot inject arbitrary proposals or call a pending job's raw `commit`. Its public current-job description contains only immutable settings, center, revision, status and statistics. `beginOperation` requires strict identity with the history's authority and excludes a concurrent history operation.

History patches contain sorted, unique canonical indices, the first before value and latest after value. Every value is an exact finite Float32. `Object.is` comparisons preserve `+0` versus `-0`; Uint32 views expose the raw before/after words for independent verification without exposing writable buffers.

For each prepared dab, a cooperative ordered merge combines its changes with the old committed-prefix patch. Disjoint indices pass through. On an overlap, the previous latest-after word must exactly equal the new dab's before word. The merged record preserves the original before word and adopts the new after word. A word restored exactly to its original value is removed. No Map, full-terrain clone or global scan is needed. The old prefix stays intact throughout reservation.

Only after the new net record is complete and within limits can C1 publish. Immediately afterward, private bounded bookkeeping promotes the reserved record and the revision lease. No caller callback separates native publication from promotion. A rejected atomic publication leaves the old authority and prefix record unchanged. C1's full validation precedes all numerical writes.

Inductively, after zero dabs the record is empty. If the record exactly describes the first `k` commits, the source-word check and sorted merge describe the first `k+1`; failed/cancelled reservation leaves the first `k` untouched. Thus sealing produces precisely one net patch for the committed prefix. Applying all stored before words restores that gesture's original target state; applying all after words restores its resulting target state. Independent all-word comparisons verify the induction examples, including revisits, backtracking, signed zero and updated Smooth.

## Replay and branching

Undo/Redo publishes one complete gesture patch atomically, never a sequence of per-dab inversions. Up to 64 descriptors reference the private fixed-size chunks; replay needs no second full patch copy. Source validation checks every target word before any write. The history cursor changes only after success. Repeated sample visits therefore cannot double-apply or lose the gesture's original value.

An actual changing publication clears the Redo branch. Beginning, preparing, cancelling without a publication, and complete no-op strokes preserve Redo. An entirely net-zero gesture adds no entry. Entry-count eviction is delayed until sealing, so an eventual net-zero operation does not evict an older entry solely for count. Typed-memory eviction can occur on a changing publication to retain the new exact prefix within the memory limit; it is never performed speculatively for an uncommitted draft.

An external revision change stops normal stroke execution before another publication; it is never silently adopted as the next dab epoch. The exact committed prefix is retained. Explicit Undo/Redo then uses the current epoch and validates all stored source words: disjoint external edits remain untouched, while an overlapping conflicting word rejects the **entire** replay without moving the cursor or writing any terrain. The host must resolve that conflict explicitly or call idle `clearHistory` to discard history and accept the current epoch. There is no force-replay/clobber path.

## Release, cancellation and failure

Release stops admission and enters `draining`; completion requires all accepted work to commit. Cancellation/disposal discards pending path output, C1 preparation and reserved-but-uncommitted history, and seals earlier committed dabs as one operation with its actual termination reason. Failure behaves the same but records the failing stage/name/message and propagates the exception. A source conflict found during cancellation is classified as failure, rather than hiding the conflict behind a successful cancellation.

Cancellation before any changing commit leaves authority/history unchanged. A partial prefix is labelled `cancelled`, `failed` or `disposed`, never `complete`. Repeated pump/cancel calls on a terminal stroke are inert. A stopped stroke releases ownership; `dispose` blocks new work on that session. Undo/Redo first ends any active stroke, then operates on its sealed prefix.

Initial validation failure throws before returning a stroke. The session cancels all created work, closes the empty operation and releases its ownership token, allowing a later valid begin. Failure during later C1 initialization conservatively charges the remaining aggregate work allowance if no job exists to report its exact consumed work; the separate `failedInitializationWorkAllowance` counter makes this explicit.

## Hard bounds and resource semantics

All existing hard ceilings are unchanged and may only be lowered through options. The new layer adds conservative aggregate limits:

| Resource | Ceiling / behavior |
| --- | --- |
| C2A input/output | Existing 8 pending inputs, 8 output events, 256 accepted observations, 4096 generated dabs |
| C2A arithmetic | Existing 128 radical classes, 4096 refinement bits and accepted route/work/bit ceilings |
| C1 pending work | One privately owned preparation; existing 65,536 changes / 786,432 prepared typed bytes and all existing work/read/candidate ceilings |
| Aggregate C1 work per stroke | 16,000,000 work units across all committed/pending/failed initialization work; options only lower it |
| Completed history | At most 32 entries and 8 MiB retained typed buffers, including the current committed-prefix record after publication |
| One net gesture patch | At most 65,536 samples, preserving the unchanged atomic replay ceiling |
| History merge work | At most 16,000,000 item steps per gesture; quantum at most 4096 |
| History chunks | 1024 indices/before/after values = 12,288 bytes; capacity charged including unused tail slots |

During reservation one additional draft of at most 786,432 bytes can coexist with retained history and the pending C1 prepared buffers of at most 786,432 bytes. Thus logical engine typed history/draft/preparation storage is bounded by 8 MiB + 2 × 786,432 bytes, excluding terrain, path arithmetic, JS objects and garbage awaiting collection. A no-op reservation reuses the record and reports zero extra draft bytes. Completed stroke handles retain scalar prefix metadata rather than old evicted history buffers. Process RSS/heap observations include verification snapshots and VM behavior; they are evidence, not an exact heap bound.

The per-dab 65,536-change ceiling does not imply an arbitrarily large gesture union can be replayed atomically. A wide N256 gesture whose union exceeds 65,536 net words stops **before the offending dab publishes**, preserving the earlier exact prefix. Supporting larger single-gesture unions would require a separately approved foundation/atomic-history design; no existing ceiling was increased here.

Long gestures can exhaust C2A's 256-input, radical-class, precision or work ceilings. A worker would move costs, not solve these mathematical bounds. A future continuation design must carry a certified equivalent residual, direction/context and global center ordinal; resetting residuals or substituting accumulated rounded lengths is not acceptable.

## Verification and future integration

The tests compare complete canonical Float32 words and exact history entries against a separately implemented sequential executor using unchanged C2A/C1 primitives. The Python verification driver independently reconstructs small-grid physical footprints and finite Float32 formulas through the accepted Fraction oracle, checks complete per-dab chains, faults and replay, and checks full raw N128/N256 vector streams. Large-grid sequential comparison reuses C1 in the separate executor; it is explicitly not a second independent large-grid brush-mathematics implementation. Full details and source hashes are in the completion report.

The eventual Next.js host must own user/authentication, permissions, World records, storage, input scheduling and presentation. A future surface-specific view provider chooses connected layouts; rectangular strips, cube faces and spherical projections are not interchangeable. Hollow cube interior/exterior terrain will remain independently editable under one parent World. This pass implements none of those host/view/persistence contracts.

## Proposed bounded Cube-C2B2 responsiveness checkpoint

This is a proposal requiring independent C2B1 review and owner authorization:

1. Measure isolated C2A route/arithmetic, C1 preparation, reservation, host validation/publication, input-to-commit and actual frame gaps on representative N128/N256 ordinary/wide/long workloads. Establish desktop, throttled mobile and physical-device conditions explicitly; keep existing budgets.
2. Evaluate a worker/hybrid placement for costly path reconstruction and C1 preparation without changing physical route selection, exact residuals, Float32 formulas, source epochs or history semantics. Keep one main-thread terrain authority and exact atomic history publication.
3. Define bounded stroke-id/dab-ordinal/source-binding messages with progress acknowledgements, one valid source chain, explicit queue/transport/memory limits, cancellation generations and no advancement before validated publication acknowledgement. Stale proposals must never paint.
4. Test startup failure, worker loss, late/duplicate/out-of-order messages and cancellation at every handoff. A fallback resumes only uncommitted work from a certified acknowledged state; it must never replay the committed prefix or reset physical spacing. Benchmark whether a hybrid threshold is justified rather than assuming workers improve every case.
5. Re-run independent complete words/history, all numerical and existing browser/save regressions. Report actual timing distributions, retained sample counts, worker startup/transport/commit costs and device qualifications. C2B2's exact evidence surface must be scoped before implementation; no new cube visual editor, professional renderer, codec or geometry is implied.

Worker optimization alone cannot remove input/radical limits or the 65,536-word atomic gesture-history ceiling. Any increase or new certified continuation foundation needs explicit separate approval. **Stop after C2B1; C2B2, Cube-D/E/F, hollow cubes and integration have not begun.**
