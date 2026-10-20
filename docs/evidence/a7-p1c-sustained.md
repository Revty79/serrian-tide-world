# A7-P1C sustained large-brush comparison

64 matched additional trials per revision, one held stroke/tool/context. Each applies at least four real spaced dabs across the joined px/py charts. All saved-fixture and final full-word hashes match. Mobile remains desktop-hosted emulation with 4x page-main-thread throttling. The main 384-case report separately measures three repeated initial-response trials/tool/cost. Values below are individual held trials, not replicated per-tool distributions. Full task/frame populations and worker diagnostics are retained in JSON/raw traces.

| Context/tool | Dabs before/after | First pixels before/after (ms) | Observed numerical drain before/after (ms) | Main-task maximum before/after (ms) |
| --- | --- | --- | --- | --- |
| hardware/desktop/128/globe/Raise | 7 / 7 | 36.3 / 75.0 | 962.2 / 932.6 | 27.9 / 11.6 |
| hardware/desktop/128/globe/Lower | 7 / 7 | 34.8 / 37.3 | 996.8 / 999.0 | 26.1 / 11.1 |
| hardware/desktop/128/globe/Smooth | 7 / 7 | 45.9 / 54.4 | 998.6 / 1001.2 | 26.6 / 30.8 |
| hardware/desktop/128/globe/Flatten | 7 / 7 | 29.3 / 38.7 | 938.1 / 983.4 | 25.0 / 10.9 |
| hardware/desktop/128/net/Raise | 7 / 7 | 32.8 / 41.4 | 900.0 / 1019.2 | 8.5 / 13.9 |
| hardware/desktop/128/net/Lower | 7 / 7 | 31.3 / 38.1 | 864.8 / 1019.0 | 9.7 / 10.5 |
| hardware/desktop/128/net/Smooth | 7 / 7 | 127.9 / 38.3 | 928.8 / 1000.0 | 12.3 / 11.9 |
| hardware/desktop/128/net/Flatten | 7 / 7 | 15.8 / 35.4 | 854.1 / 892.2 | 8.7 / 8.4 |
| hardware/desktop/256/globe/Raise | 7 / 7 | 54.4 / 154.2 | 1073.8 / 1052.6 | 40.0 / 21.2 |
| hardware/desktop/256/globe/Lower | 7 / 7 | 47.3 / 109.6 | 1065.2 / 1018.1 | 29.9 / 19.4 |
| hardware/desktop/256/globe/Smooth | 7 / 7 | 113.3 / 233.7 | 1182.0 / 981.5 | 84.1 / 9.8 |
| hardware/desktop/256/globe/Flatten | 7 / 7 | 44.1 / 106.6 | 1004.3 / 1017.1 | 34.5 / 18.6 |
| hardware/desktop/256/net/Raise | 7 / 7 | 31.2 / 105.6 | 966.6 / 1053.5 | 22.7 / 19.9 |
| hardware/desktop/256/net/Lower | 7 / 7 | 31.2 / 105.2 | 969.4 / 1035.8 | 18.5 / 13.8 |
| hardware/desktop/256/net/Smooth | 7 / 7 | 163.8 / 216.6 | 985.9 / 1000.5 | 29.4 / 9.9 |
| hardware/desktop/256/net/Flatten | 7 / 7 | 30.6 / 94.6 | 932.7 / 1021.3 | 23.0 / 22.0 |
| hardware/mobile/128/globe/Raise | 7 / 7 | 100.7 / 240.6 | 1787.8 / 1420.1 | 80.5 / 42.1 |
| hardware/mobile/128/globe/Lower | 7 / 7 | 83.2 / 150.7 | 1814.9 / 1315.1 | 86.8 / 32.1 |
| hardware/mobile/128/globe/Smooth | 7 / 7 | 180.2 / 206.7 | 2009.1 / 1236.8 | 133.9 / 27.1 |
| hardware/mobile/128/globe/Flatten | 7 / 7 | 68.3 / 153.0 | 1727.9 / 1354.5 | 86.8 / 28.0 |
| hardware/mobile/128/net/Raise | 7 / 7 | 52.5 / 156.3 | 1343.0 / 1547.5 | 46.3 / 28.6 |
| hardware/mobile/128/net/Lower | 7 / 7 | 56.6 / 153.4 | 1364.6 / 1419.9 | 38.9 / 35.6 |
| hardware/mobile/128/net/Smooth | 7 / 7 | 72.6 / 209.8 | 1375.2 / 1339.8 | 43.5 / 23.8 |
| hardware/mobile/128/net/Flatten | 7 / 7 | 45.7 / 155.6 | 1340.6 / 1470.1 | 38.5 / 31.0 |
| hardware/mobile/256/globe/Raise | 7 / 7 | 197.3 / 850.5 | 2420.7 / 1606.7 | 141.0 / 89.2 |
| hardware/mobile/256/globe/Lower | 7 / 7 | 158.0 / 635.3 | 2389.7 / 1585.9 | 127.3 / 68.6 |
| hardware/mobile/256/globe/Smooth | 7 / 7 | 534.3 / 619.0 | 3170.0 / 1276.1 | 432.1 / 35.5 |
| hardware/mobile/256/globe/Flatten | 7 / 7 | 145.8 / 620.4 | 2333.4 / 1534.8 | 124.9 / 63.2 |
| hardware/mobile/256/net/Raise | 7 / 7 | 134.7 / 604.3 | 1780.3 / 1660.9 | 112.6 / 66.8 |
| hardware/mobile/256/net/Lower | 7 / 7 | 127.4 / 631.3 | 2230.0 / 1712.7 | 189.1 / 67.3 |
| hardware/mobile/256/net/Smooth | 7 / 7 | 780.9 / 1234.7 | 2042.4 / 1409.1 | 152.6 / 35.6 |
| hardware/mobile/256/net/Flatten | 7 / 7 | 136.2 / 655.6 | 1881.4 / 1678.6 | 118.3 / 68.7 |
| fallback/desktop/128/globe/Raise | 7 / 7 | 34.9 / 105.8 | 1197.4 / 922.8 | 45.4 / 11.3 |
| fallback/desktop/128/globe/Lower | 7 / 7 | 32.0 / 91.3 | 1211.4 / 925.0 | 44.7 / 9.6 |
| fallback/desktop/128/globe/Smooth | 7 / 7 | 62.6 / 75.1 | 1120.9 / 976.4 | 40.7 / 17.5 |
| fallback/desktop/128/globe/Flatten | 7 / 7 | 26.7 / 77.2 | 1157.3 / 945.2 | 46.8 / 11.7 |
| fallback/desktop/128/net/Raise | 7 / 7 | 32.7 / 50.0 | 955.2 / 951.2 | 14.8 / 11.2 |
| fallback/desktop/128/net/Lower | 7 / 7 | 17.3 / 40.6 | 972.9 / 924.2 | 14.2 / 13.3 |
| fallback/desktop/128/net/Smooth | 7 / 7 | 16.0 / 80.8 | 973.8 / 915.6 | 17.0 / 12.2 |
| fallback/desktop/128/net/Flatten | 7 / 7 | 16.7 / 52.5 | 971.5 / 970.3 | 14.9 / 10.9 |
| fallback/desktop/256/globe/Raise | 7 / 7 | 60.5 / 193.4 | 1396.5 / 1097.1 | 62.4 / 23.0 |
| fallback/desktop/256/globe/Lower | 7 / 7 | 54.1 / 198.1 | 1349.1 / 1085.2 | 43.7 / 19.0 |
| fallback/desktop/256/globe/Smooth | 7 / 7 | 122.5 / 227.7 | 1387.8 / 966.5 | 88.6 / 13.5 |
| fallback/desktop/256/globe/Flatten | 7 / 7 | 51.7 / 130.1 | 1269.2 / 1015.6 | 49.7 / 14.3 |
| fallback/desktop/256/net/Raise | 7 / 7 | 36.1 / 114.1 | 991.7 / 999.3 | 30.8 / 16.3 |
| fallback/desktop/256/net/Lower | 7 / 7 | 37.2 / 115.2 | 1042.4 / 982.5 | 30.2 / 19.4 |
| fallback/desktop/256/net/Smooth | 7 / 7 | 46.1 / 214.3 | 1068.9 / 968.5 | 32.9 / 13.3 |
| fallback/desktop/256/net/Flatten | 7 / 7 | 35.6 / 116.4 | 1009.7 / 984.4 | 31.6 / 16.3 |
| fallback/mobile/128/globe/Raise | 7 / 7 | 116.3 / 380.0 | 2149.2 / 1727.2 | 109.6 / 38.5 |
| fallback/mobile/128/globe/Lower | 7 / 7 | 72.5 / 277.3 | 2039.3 / 1565.1 | 106.7 / 39.6 |
| fallback/mobile/128/globe/Smooth | 7 / 7 | 180.1 / 322.7 | 2394.8 / 1425.0 | 152.1 / 20.5 |
| fallback/mobile/128/globe/Flatten | 7 / 7 | 70.3 / 246.1 | 1933.8 / 1572.8 | 108.6 / 34.9 |
| fallback/mobile/128/net/Raise | 7 / 7 | 63.7 / 220.2 | 1745.8 / 1700.4 | 58.5 / 53.6 |
| fallback/mobile/128/net/Lower | 7 / 7 | 54.2 / 200.0 | 1633.8 / 1595.6 | 49.3 / 27.2 |
| fallback/mobile/128/net/Smooth | 7 / 7 | 71.0 / 261.6 | 1661.7 / 1435.8 | 56.3 / 26.4 |
| fallback/mobile/128/net/Flatten | 7 / 7 | 60.7 / 200.7 | 1603.2 / 1541.7 | 47.2 / 30.4 |
| fallback/mobile/256/globe/Raise | 7 / 7 | 199.9 / 856.3 | 2756.4 / 1908.6 | 159.3 / 84.2 |
| fallback/mobile/256/globe/Lower | 7 / 7 | 180.4 / 694.5 | 2577.0 / 1800.1 | 137.5 / 70.2 |
| fallback/mobile/256/globe/Smooth | 7 / 7 | 509.9 / 646.8 | 3244.6 / 1509.9 | 426.6 / 61.4 |
| fallback/mobile/256/globe/Flatten | 7 / 7 | 147.0 / 681.5 | 2500.2 / 1966.0 | 131.1 / 72.6 |
| fallback/mobile/256/net/Raise | 7 / 7 | 125.4 / 590.0 | 2101.2 / 1969.2 | 106.5 / 69.1 |
| fallback/mobile/256/net/Lower | 7 / 7 | 124.4 / 586.0 | 2006.3 / 1933.3 | 106.7 / 73.7 |
| fallback/mobile/256/net/Smooth | 7 / 7 | 753.9 / 612.8 | 2241.5 / 1595.3 | 161.3 / 28.4 |
| fallback/mobile/256/net/Flatten | 7 / 7 | 140.5 / 578.9 | 2159.2 / 1957.7 | 121.2 / 67.4 |

Numerical drain is sampled at a RAF; it is separate from the coherent image catching up and from Save completion. These are descriptive matched observations. See [full raw summary](a7-p1c-sustained-summary.json), [repeated-response report](a7-p1c-performance.md) and [completion](../A7-P1C-COMPLETION.md).
