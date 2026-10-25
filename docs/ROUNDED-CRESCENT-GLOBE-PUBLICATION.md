# Rounded Crescent Globe publication - 2026-10-25

Rounded Crescent Globe is technically qualified and published on GitHub `origin/main`, with the normal development application at [127.0.0.1:5262](http://127.0.0.1:5262/). Create it through **New World / Map -> World shape -> Rounded Crescent Globe**. Work remains in `D:/serrian-tide-world` on `main`. This publication note and preview evidence add no application changes after C.

| Checkpoint | Published commit | Frozen receipt | Verified Git blobs |
| --- | --- | --- | --- |
| A: physical foundation | `e1c0d3eeb542d1ea307d0c6f32fe1a33810ffe91` | [Foundation](evidence/rounded-crescent-globe-foundation/receipt.json) | 1,302 |
| B: operational editor | `6f6db6ec3d4249e84f80a631aa50654bdc3e9d3e` | [Operational](evidence/rounded-crescent-globe-operational/receipt.json) | 1,479 |
| C: configuration and final qualification | `f1f3cfaf6f4d22bd8e777b95bb3a2517f39f0f62` | [Final](evidence/rounded-crescent-globe-final/receipt.json) | 1,515 |

Each receipt verified with zero hash errors against its own commit. It preserves exact source inputs and evidence; older passing runs explicitly list changes since their execution. Diagnostic failures remain diagnostic evidence. The completed [13-point engineering report](ROUNDED-CRESCENT-GLOBE-WORLDS.md) describes construction, configuration, numerical methods, resources and limitations.

Verification includes 297 passing source tests, 54 passing Rounded Crescent browser cases, 13 selected shared browser cases, TypeScript, production build, and two built-bundle workflows. The independent pixel checks cover 27 pose/start/configuration combinations: no missing/outside stable material, reference color error at most 1 channel level, quarter-ray color error at most 2, and exact coverage alpha. History and format-46 Save/Open preserve exact Float32 words. Browser touch/pen coverage is emulated.

The separate post-publication [5262 preview receipt](evidence/rounded-crescent-globe-publication/receipt.json) records two successful ordinary UI workflows, actual AMD WebGL2 and forced Canvas: creation, focus, painting, Undo/Redo, Save/Open, real workers and no page errors. The normal preview was not restarted and no owner browser tab or saved map was modified. The auxiliary 5301 test server has been stopped.

The hardest measured Canvas tip stroke was 124.7 ms p95 against the 125 ms gate, so its margin is narrow. Default held painting measured 30.8-42.4 ms p95; navigation measured 83.3-145.3 ms p95. These are development-PC measurements. Owner appearance/usability acceptance and physical-device performance remain separate. Surface distances are qualified local numerical approximations, not certified global geodesic intervals.

The recovery branch remains `recovery/excavation-paused-2026-10-23` at `35f7f5d34edf861c33c5eb4decad92d41664c749`. The pre-shape tag remains `checkpoint/pre-rounded-crescent-globe-2026-10-25` at `ecee5d9df8eb2a59b92c306924fa05d9f0cd617e`. No server deployment or database change was performed. Filled-Torus has not been started; this pass ends here.

## Verify or repeat a selected check

The verifier is `docs/evidence/crescent-cut-globe-final/support/verify-receipt.py`:

```powershell
python -X utf8 docs/evidence/crescent-cut-globe-final/support/verify-receipt.py e1c0d3eeb542d1ea307d0c6f32fe1a33810ffe91 docs/evidence/rounded-crescent-globe-foundation
python -X utf8 docs/evidence/crescent-cut-globe-final/support/verify-receipt.py 6f6db6ec3d4249e84f80a631aa50654bdc3e9d3e docs/evidence/rounded-crescent-globe-operational
python -X utf8 docs/evidence/crescent-cut-globe-final/support/verify-receipt.py f1f3cfaf6f4d22bd8e777b95bb3a2517f39f0f62 docs/evidence/rounded-crescent-globe-final
```

The receipts contain the exact successful commands and raw artifacts. Their reproduction ZIPs contain tracked implementation/tests, dependency lock, native saved-map seed fixtures and support scripts. After installing the locked dependencies, start the source server with `node node_modules/vite/bin/vite.js --config .local/vite-rounded-final.config.mjs`, set `ATLAS_TEST_URL=http://127.0.0.1:5301`, and select the relevant receipt command. Browser jobs use installed Chrome, one worker, zero retries, and serial BelowNormal execution. For the built-bundle smoke, build first and unset `ATLAS_TEST_URL`; the script serves `dist` itself and opens fresh isolated browser contexts. The root Rounded Playwright configuration now defaults to the usual 5262 preview.
