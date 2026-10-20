# A7-P1C delivery receipt

Implementation: [`b32cf840adfe5189831ba7082e129390d2e197ce`](https://github.com/Revty79/serrian-tide-world/commit/b32cf840adfe5189831ba7082e129390d2e197ce) on `main`.
Approved base: `ec1c6e195dd66272bf8aa3ba3232463831e000cb`.

This later receipt-only commit adds this document and the [complete 656-file implementation inventory](evidence/a7-p1c-implementation-files.txt). It changes no runtime, tests, numerical algorithms, persistence format or hosting. The implementation is a technical review candidate; Ember independent review and owner hands-on visual/painting acceptance remain outstanding.

## Verification checkpoint

- Frozen public source/test/driver files: 238. All current raw source hashes and all 33 committed changed-source blob identities were checked again after the implementation commit.
- Source-registry digest: `35315994ad5095b15c2d5af280171a01b70b25561e342415e213bb8138069d8c`.
- [Implementation evidence manifest](evidence/a7-p1c-delivery-manifest.json): SHA-256 `4180a312db1354d7e07a334ed606f123decaf4dff931dc2bb83b74cf89c48ed7`; committed Git blob `84e811565d2dae86211091fa46c7b4b1a930f04e`.
- All 622 artifact/document blob identities match that manifest in the implementation tree. Raw Windows SHA-256 values and portable normalized Git blob identities are distinguished explicitly.
- All 1,478 historical evidence/report blobs and 205 other protected accepted source blobs remain unchanged. The approved eleven-phase roadmap table and GitHub Issue #1 are preserved.
- All 14 verification/evidence phases completed with exit 0. The completed immutable-baseline measurement was hash-verified for reuse; the candidate diagnostic correction does not affect its separately exported accepted runtime. See [baseline provenance](evidence/a7-p1c-baseline-measurement-provenance.json).

## Exact results

| Check | Result |
| --- | --- |
| Numerical suite | 471 passed; 0 failed/skipped |
| Accepted-source equivalence | 184 cases; 90,440,416 recorded UInt32 comparisons; 0 complete-word or full-history mismatches |
| Complete browser suite | 328 passed; 4 existing conditional skips; exit 0 |
| Actual-hardware sphere browser checks | 16 passed; strict GPU checks through edits, recovery and history |
| Built production contexts | 8 passed; hardware/fallback × desktop/mobile layout × N128/N256; exact Save/Open/Undo/Redo; no page errors |
| TypeScript / production build | Both exit 0 |
| Repeated initial-response comparison | 384 exact paired fixture/final terrain hashes; 16 navigation contexts per revision |
| Sustained comparison | 64 exact paired final terrain hashes; at least 7 real spaced dabs each |
| Matched photo proof | 32 pairs; identical geography and exact displayed cameras; all final PNG hashes verified |

Full conditions, source decisions, memory/queue bounds and exact logs are in [the completion report](A7-P1C-COMPLETION.md). The [source inventory](evidence/a7-p1c-source-inventory.json), [raw numerical proof](evidence/a7-p1c-golden-equivalence.json), [photo proof](evidence/a7-p1c-photo-proof.json), [performance report](evidence/a7-p1c-performance.md), [sustained report](evidence/a7-p1c-sustained.md) and [interactive photo gallery](evidence/a7-p1c-visual-review.html) provide the underlying evidence. Direct desktop/mobile PNG links are in the completion report. Genuine full/hardware interaction traces are enumerated in the preservation receipts.

## Performance acceptance remains open

Initial visible-response p50 increased in **31/32** measured groups. For N256 mobile-profile large Globe trials, hardware p50 changed **168.0 → 619.9 ms**, and CPU fallback **159.0 → 682.4 ms**. These regressions are not concealed by the shorter main-thread tasks.

Observed numerical drain was faster in **48/64** sustained single-trial comparisons; 16 did not improve. For the seven-dab hardware mobile-profile N256 Globe Smooth trial, observed numerical drain changed **3170.0 → 1276.1 ms**, its largest main-thread task **432.1 → 35.5 ms**, and first visible terrain **534.3 → 619.0 ms**. These are descriptive observations, not universal speed claims. Delays also occur on cooperative paths; worker startup alone does not explain the whole visible cost.

Mobile results use emulation and 4× page-main-thread throttling on a Windows host. They do not establish physical-phone, worker or GPU performance. RAF scheduling intervals are separate from coherent image presentation. Display interpolation adds no geographical detail; CPU fallback and additional bounded display memory have documented costs.

## Review boundary

Stop for Ember independent review and owner hands-on visual/painting acceptance. The flat/wrapped adoption plan is a bounded proposal only. No flat migration, later geometry, main-site/Worlds integration, database/Production mutation or deployment was performed.
