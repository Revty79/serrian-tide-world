# A7-P1C matched spherical measurements

384 matched held strokes, 16 navigation contexts per revision; exact saved-fixture and final-word hashes verified for every pair. Values are p50 / p95 / max in milliseconds. Desktop/mobile profiles run on one Windows host; mobile is Pixel 7 layout plus 4x page CPU throttling, not physical hardware or worker/GPU throttling. Baseline hardware profile uses the original CPU sphere renderer. Compositor PNG timing includes capture overhead.

| Backend/profile/detail/view/cost | Visible before | Visible after | Main tasks before | Main tasks after |
| --- | --- | --- | --- | --- |
| hardware/desktop/N128/globe/ordinary | 21.5 / 35.3 / 35.3 | 22.7 / 34.3 / 34.3 | 0.0 / 5.6 / 33.3 | 0.0 / 1.2 / 8.0 |
| hardware/desktop/N128/globe/large | 24.3 / 31.5 / 31.5 | 40.1 / 48.7 / 48.7 | 0.0 / 5.5 / 34.5 | 0.0 / 1.2 / 18.1 |
| hardware/desktop/N128/net/ordinary | 25.7 / 32.5 / 32.5 | 26.6 / 33.4 / 33.4 | 0.0 / 1.8 / 5.3 | 0.0 / 1.5 / 6.3 |
| hardware/desktop/N128/net/large | 18.6 / 31.4 / 31.4 | 38.1 / 47.7 / 47.7 | 0.0 / 1.7 / 5.8 | 0.0 / 1.5 / 7.2 |
| hardware/desktop/N256/globe/ordinary | 27.6 / 46.9 / 46.9 | 34.7 / 47.9 / 47.9 | 0.0 / 5.0 / 33.2 | 0.0 / 1.3 / 18.1 |
| hardware/desktop/N256/globe/large | 43.6 / 96.2 / 96.2 | 119.2 / 230.3 / 230.3 | 0.0 / 6.5 / 66.3 | 0.0 / 1.4 / 16.8 |
| hardware/desktop/N256/net/ordinary | 28.5 / 33.8 / 33.8 | 32.8 / 45.9 / 45.9 | 0.0 / 1.8 / 7.8 | 0.0 / 1.6 / 9.9 |
| hardware/desktop/N256/net/large | 32.5 / 48.6 / 48.6 | 119.5 / 268.5 / 268.5 | 0.0 / 1.8 / 20.8 | 0.0 / 1.7 / 20.7 |
| hardware/mobile/N128/globe/ordinary | 46.7 / 69.9 / 69.9 | 46.0 / 94.3 / 94.3 | 0.0 / 14.5 / 138.9 | 0.0 / 5.3 / 34.7 |
| hardware/mobile/N128/globe/large | 72.0 / 155.6 / 155.6 | 172.6 / 240.7 / 240.7 | 0.0 / 17.7 / 106.1 | 0.0 / 7.3 / 40.1 |
| hardware/mobile/N128/net/ordinary | 31.7 / 48.8 / 48.8 | 52.6 / 80.3 / 80.3 | 0.0 / 8.3 / 23.0 | 0.0 / 7.5 / 26.7 |
| hardware/mobile/N128/net/large | 55.2 / 68.5 / 68.5 | 182.6 / 219.6 / 219.6 | 0.0 / 8.1 / 54.5 | 0.0 / 9.7 / 27.7 |
| hardware/mobile/N256/globe/ordinary | 78.6 / 173.3 / 173.3 | 137.2 / 200.7 / 200.7 | 0.0 / 13.3 / 123.6 | 0.0 / 9.1 / 51.8 |
| hardware/mobile/N256/globe/large | 168.0 / 457.3 / 457.3 | 619.9 / 664.9 / 664.9 | 0.0 / 12.9 / 376.1 | 0.0 / 9.7 / 39.4 |
| hardware/mobile/N256/net/ordinary | 67.3 / 725.0 / 725.0 | 153.4 / 197.8 / 197.8 | 0.0 / 8.3 / 46.8 | 0.0 / 11.1 / 49.4 |
| hardware/mobile/N256/net/large | 140.5 / 162.1 / 162.1 | 638.5 / 674.3 / 674.3 | 0.0 / 8.1 / 146.9 | 0.0 / 10.7 / 35.9 |
| fallback/desktop/N128/globe/ordinary | 23.4 / 34.1 / 34.1 | 71.4 / 81.3 / 81.3 | 0.0 / 8.7 / 35.2 | 0.0 / 1.3 / 12.5 |
| fallback/desktop/N128/globe/large | 27.2 / 40.8 / 40.8 | 74.0 / 97.7 / 97.7 | 0.0 / 8.7 / 40.1 | 0.0 / 1.2 / 17.1 |
| fallback/desktop/N128/net/ordinary | 27.0 / 32.4 / 32.4 | 37.4 / 49.7 / 49.7 | 0.0 / 4.3 / 9.4 | 0.0 / 1.6 / 13.1 |
| fallback/desktop/N128/net/large | 24.7 / 33.0 / 33.0 | 60.4 / 77.4 / 77.4 | 0.0 / 4.2 / 8.8 | 0.0 / 1.5 / 12.5 |
| fallback/desktop/N256/globe/ordinary | 26.8 / 36.9 / 36.9 | 83.6 / 111.2 / 111.2 | 0.0 / 5.4 / 56.0 | 0.0 / 1.3 / 20.8 |
| fallback/desktop/N256/globe/large | 40.5 / 99.3 / 99.3 | 149.0 / 278.4 / 278.4 | 0.0 / 3.9 / 70.2 | 0.0 / 1.3 / 17.7 |
| fallback/desktop/N256/net/ordinary | 24.6 / 32.3 / 32.3 | 75.9 / 82.9 / 82.9 | 0.0 / 4.7 / 12.1 | 0.0 / 1.6 / 16.1 |
| fallback/desktop/N256/net/large | 35.3 / 42.5 / 42.5 | 133.3 / 250.8 / 250.8 | 0.0 / 4.8 / 17.4 | 0.0 / 1.6 / 20.3 |
| fallback/mobile/N128/globe/ordinary | 52.8 / 82.4 / 82.4 | 179.5 / 215.1 / 215.1 | 0.0 / 12.9 / 138.0 | 0.0 / 10.9 / 45.3 |
| fallback/mobile/N128/globe/large | 69.8 / 142.9 / 142.9 | 263.2 / 330.8 / 330.8 | 0.0 / 12.7 / 118.1 | 0.0 / 9.9 / 44.5 |
| fallback/mobile/N128/net/ordinary | 38.6 / 48.4 / 48.4 | 114.1 / 148.5 / 148.5 | 0.0 / 13.1 / 32.6 | 0.0 / 13.1 / 24.6 |
| fallback/mobile/N128/net/large | 63.0 / 73.6 / 73.6 | 220.8 / 285.4 / 285.4 | 0.0 / 14.2 / 52.9 | 0.0 / 12.1 / 28.5 |
| fallback/mobile/N256/globe/ordinary | 83.6 / 152.2 / 152.2 | 267.4 / 329.0 / 329.0 | 0.0 / 7.6 / 169.7 | 0.0 / 10.7 / 61.8 |
| fallback/mobile/N256/globe/large | 159.0 / 401.9 / 401.9 | 682.4 / 748.6 / 748.6 | 0.0 / 8.1 / 324.3 | 0.0 / 10.3 / 30.3 |
| fallback/mobile/N256/net/ordinary | 67.5 / 77.0 / 77.0 | 219.6 / 290.5 / 290.5 | 0.0 / 14.7 / 44.8 | 0.0 / 12.9 / 44.7 |
| fallback/mobile/N256/net/large | 144.3 / 153.5 / 153.5 | 619.0 / 673.4 / 673.4 | 0.0 / 13.1 / 148.9 | 0.0 / 12.1 / 28.6 |

The task columns above describe the entire task population. The table below instead takes each stroke's largest main-thread task, then reports that 12-stroke distribution. Long-task observations and both populations remain in JSON.

| Backend/profile/detail/view/cost | Per-stroke worst task before | Per-stroke worst task after |
| --- | --- | --- |
| hardware/desktop/N128/globe/ordinary | 25.0 / 33.3 / 33.3 | 4.8 / 8.0 / 8.0 |
| hardware/desktop/N128/globe/large | 23.6 / 34.5 / 34.5 | 5.9 / 18.1 / 18.1 |
| hardware/desktop/N128/net/ordinary | 3.6 / 5.3 / 5.3 | 4.5 / 6.3 / 6.3 |
| hardware/desktop/N128/net/large | 4.3 / 5.8 / 5.8 | 6.0 / 7.2 / 7.2 |
| hardware/desktop/N256/globe/ordinary | 30.9 / 33.2 / 33.2 | 8.9 / 18.1 / 18.1 |
| hardware/desktop/N256/globe/large | 27.3 / 66.3 / 66.3 | 14.1 / 16.8 / 16.8 |
| hardware/desktop/N256/net/ordinary | 6.2 / 7.8 / 7.8 | 8.7 / 9.9 / 9.9 |
| hardware/desktop/N256/net/large | 12.5 / 20.8 / 20.8 | 13.8 / 20.7 / 20.7 |
| hardware/mobile/N128/globe/ordinary | 87.6 / 138.9 / 138.9 | 24.4 / 34.7 / 34.7 |
| hardware/mobile/N128/globe/large | 84.2 / 106.1 / 106.1 | 27.1 / 40.1 / 40.1 |
| hardware/mobile/N128/net/ordinary | 20.8 / 23.0 / 23.0 | 23.0 / 26.7 / 26.7 |
| hardware/mobile/N128/net/large | 39.4 / 54.5 / 54.5 | 25.4 / 27.7 / 27.7 |
| hardware/mobile/N256/globe/ordinary | 119.5 / 123.6 / 123.6 | 37.7 / 51.8 / 51.8 |
| hardware/mobile/N256/globe/large | 129.5 / 376.1 / 376.1 | 34.8 / 39.4 / 39.4 |
| hardware/mobile/N256/net/ordinary | 39.5 / 46.8 / 46.8 | 38.9 / 49.4 / 49.4 |
| hardware/mobile/N256/net/large | 109.2 / 146.9 / 146.9 | 34.6 / 35.9 / 35.9 |
| fallback/desktop/N128/globe/ordinary | 33.4 / 35.2 / 35.2 | 11.3 / 12.5 / 12.5 |
| fallback/desktop/N128/globe/large | 31.6 / 40.1 / 40.1 | 10.9 / 17.1 / 17.1 |
| fallback/desktop/N128/net/ordinary | 6.5 / 9.4 / 9.4 | 11.0 / 13.1 / 13.1 |
| fallback/desktop/N128/net/large | 6.8 / 8.8 / 8.8 | 9.9 / 12.5 / 12.5 |
| fallback/desktop/N256/globe/ordinary | 36.1 / 56.0 / 56.0 | 15.4 / 20.8 / 20.8 |
| fallback/desktop/N256/globe/large | 36.0 / 70.2 / 70.2 | 14.4 / 17.7 / 17.7 |
| fallback/desktop/N256/net/ordinary | 9.0 / 12.1 / 12.1 | 15.4 / 16.1 / 16.1 |
| fallback/desktop/N256/net/large | 14.2 / 17.4 / 17.4 | 14.4 / 20.3 / 20.3 |
| fallback/mobile/N128/globe/ordinary | 111.1 / 138.0 / 138.0 | 21.6 / 45.3 / 45.3 |
| fallback/mobile/N128/globe/large | 109.2 / 118.1 / 118.1 | 25.8 / 44.5 / 44.5 |
| fallback/mobile/N128/net/ordinary | 25.9 / 32.6 / 32.6 | 22.4 / 24.6 / 24.6 |
| fallback/mobile/N128/net/large | 43.9 / 52.9 / 52.9 | 26.6 / 28.5 / 28.5 |
| fallback/mobile/N256/globe/ordinary | 139.3 / 169.7 / 169.7 | 39.9 / 61.8 / 61.8 |
| fallback/mobile/N256/globe/large | 134.9 / 324.3 / 324.3 | 28.2 / 30.3 / 30.3 |
| fallback/mobile/N256/net/ordinary | 43.3 / 44.8 / 44.8 | 40.5 / 44.7 / 44.7 |
| fallback/mobile/N256/net/large | 108.6 / 148.9 / 148.9 | 28.2 / 28.6 / 28.6 |

Navigation intervals below measure RAF scheduling. They do not establish that a new coherent CPU image was presented on every RAF; fallback reconstruction can span multiple frames. Display diagnostics and completed-image timings remain separate.

| Navigation backend/profile/detail/view | RAF interval before | RAF interval after |
| --- | --- | --- |
| hardware/desktop/N128/globe | 16.7 / 16.9 / 16.9 | 16.7 / 16.8 / 16.9 |
| hardware/desktop/N128/net | 16.7 / 16.8 / 16.8 | 16.7 / 16.8 / 16.9 |
| hardware/desktop/N256/globe | 16.7 / 16.9 / 17.0 | 16.7 / 16.8 / 16.9 |
| hardware/desktop/N256/net | 16.7 / 16.8 / 16.8 | 16.7 / 16.8 / 16.9 |
| hardware/mobile/N128/globe | 16.7 / 16.9 / 66.7 | 16.7 / 16.8 / 16.9 |
| hardware/mobile/N128/net | 16.7 / 16.9 / 16.9 | 16.7 / 16.8 / 17.0 |
| hardware/mobile/N256/globe | 16.7 / 16.9 / 66.6 | 16.7 / 16.8 / 17.0 |
| hardware/mobile/N256/net | 16.7 / 16.9 / 16.9 | 16.7 / 16.9 / 17.0 |
| fallback/desktop/N128/globe | 16.7 / 16.8 / 33.4 | 16.7 / 16.8 / 16.8 |
| fallback/desktop/N128/net | 16.7 / 16.8 / 16.8 | 16.7 / 16.8 / 16.8 |
| fallback/desktop/N256/globe | 16.7 / 16.8 / 16.8 | 16.7 / 16.7 / 16.8 |
| fallback/desktop/N256/net | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 |
| fallback/mobile/N128/globe | 16.7 / 33.4 / 100.0 | 16.7 / 16.8 / 16.8 |
| fallback/mobile/N128/net | 16.7 / 16.7 / 16.8 | 16.7 / 16.7 / 16.8 |
| fallback/mobile/N256/globe | 16.7 / 33.4 / 100.0 | 16.7 / 16.8 / 16.8 |
| fallback/mobile/N256/net | 16.7 / 16.8 / 16.8 | 16.7 / 16.7 / 16.8 |

Worker tasks: 84. Ready round trip 43.0 / 83.0 / 95.8 ms; private snapshot 5.5 / 7.4 / 10.9 ms; worker compute 56.5 / 155.4 / 161.0 ms; per-task host validation maximum 4.4 / 7.1 / 7.8 ms; commit maximum 3.1 / 4.5 / 4.8 ms. Acknowledgement retained-window distribution 11.0 / 47.3 / 69.4 ms, lifetime count 234. These are distinct events, not end-to-end visible latency. Ready time includes private topology/snapshot setup on a preloaded worker.

Full per-tool raw populations, queue peaks, actual graphics diagnostics and JS-realm heap readings are in [the machine-readable summary](a7-p1c-performance-summary.json). Heap readings include development/test overhead and do not represent total process/GPU/worker memory. See the completion report for interpretation and limitations.
