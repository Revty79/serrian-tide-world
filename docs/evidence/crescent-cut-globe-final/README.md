# Crescent-Cut Globe final checkpoint C

See ../../CRESCENT-CUT-GLOBE-WORLDS.md for the engineering report and summary.json for final measurements.
The commit containing receipt.json is C. A and B are named in the receipt and retain their own frozen artifacts.

reproduction.zip contains the complete normalized source/config snapshot, every final measurement and pixel image, and commands/manifests/logs. Extract source/, install its locked dependencies, copy support/vite-cut-globe.config.mjs to source/.local/, then run Vite with --config .local/vite-cut-globe.config.mjs --host 127.0.0.1 --port 5298 from source/. Copy support/run-cut-globe.py into source/.local/ to preserve command logs. Run commands from runs/ manifests in source/; source-files.txt lists the 29 selected source tests. Browser config uses installed Chrome, workers=1, retries=0; run heavy commands serially. Adapt paths and availability to the reproduction machine. No owner tabs or saved maps are needed.

Source hashes normalize CRLF to LF to match repository Git blobs. PNG and ZIP artifacts are hashed as raw binary. The receipt excludes itself, avoiding a recursive hash. Verify a published checkpoint using support/verify-receipt.py SHA docs/evidence/crescent-cut-globe-final from its repository. Check earlier receipts against their own commit SHAs.

development-reports/ preserves original failed aggregates and the targeted intermediate resolution. Those runs used their recorded earlier source hashes; they are not final-source passing reports. Final browser 41/41 and performance 3/3 runs include their unchanged-input manifests.

Touch/pen evidence is browser emulation, not physical-device acceptance. Direct double coastal RGB and accepted GPU precision are distinguished in the report. Owner visual acceptance remains separate.
