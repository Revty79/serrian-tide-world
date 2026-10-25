# Flat Ring checkpoint C evidence

Read `selected-cases.json` before interpreting the original phase reports. It selects 46 distinct passing Flat Ring cases and 19 passing affected-family cases, with zero retries. Mixed historical reports deliberately preserve original failed/skipped probes; those are excluded from the selected count. `measurements.json` summarizes the final raw artifacts.

`browser-artifacts.zip` contains the latest selected raw JSON/PNG output under `.local/flat-ring-*`, selected legacy output, the pre-optimization distance module, equivalence probe, private Vite configuration, and final source-check runner. Failed diagnostic captures/progress files are excluded. Some retained configuration and recovery cases predate later geometry-only changes; exact phase scope is recorded in the manifest and engineering report. No native-device or owner acceptance is asserted.

To reproduce on the installed dependencies and Node 24, extract the archive at the repository root so its `.local/` paths are restored. Run `python -X utf8 .local/final-flat-ring-checks.py` for the 297 relevant source checks, exact distance comparison, TypeScript and build. The same commands are recorded in the logs.

For browser verification, start a private Vite instance with `node node_modules/vite/bin/vite.js --config .local/vite-flat-ring.config.mjs --host 127.0.0.1 --port 5294 --strictPort`. Then run `node node_modules/@playwright/test/cli.js test --config=playwright.flat-ring.config.mjs --workers=1 --retries=0` and the same command with `--config=playwright.flat-ring-regression.config.mjs`. Installed Chrome and hardware WebGL2 are required for hardware claims. Run heavy phases serially on this PC. The owner's port 5262 is separate.

`receipt.json` freezes normalized text/binary SHA-256 hashes. Verify A and B against their own publication commits, not C's changed tree. C's hashes describe the publication commit containing this directory; the receipt itself is excluded to avoid a self-hash cycle. The engineering report supplies the qualification/limits and owner-review boundary.
