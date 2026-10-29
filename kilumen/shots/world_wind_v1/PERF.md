# world_wind_v1 perf (box headless Chromium, 3x off/on interleaved, 200 rAF frames each)
phone = 844x390 mobile emulation, 4x CPU throttle, lite variant

phone route1 | wind OFF: 47.2 ms/frame (23.8 fps), >20ms frames 134, render 20.13 ms (p95 46.5) | wind ON: 31.4 ms/frame (32.7 fps), >20ms 110, render 13.67 ms (p95 28.9), wind draw 0.91 ms over 208 tiles
phone route_saltmere_mirefen | wind OFF: 30.6 ms/frame (32.9 fps), >20ms frames 101, render 12.79 ms (p95 31.3) | wind ON: 33.8 ms/frame (30.3 fps), >20ms 124, render 14.50 ms (p95 29.9), wind draw 0.98 ms over 216 tiles
phone sunmeadow_fields | wind OFF: 42.0 ms/frame (28.1 fps), >20ms frames 120, render 17.58 ms (p95 38.0) | wind ON: 40.3 ms/frame (25.8 fps), >20ms 122, render 16.57 ms (p95 39.7), wind draw 1.06 ms over 204 tiles
phone brookhollow | wind OFF: 35.5 ms/frame (28.3 fps), >20ms frames 125, render 13.55 ms (p95 31.0) | wind ON: 38.8 ms/frame (26.2 fps), >20ms 144, render 14.22 ms (p95 28.7), wind draw 0.82 ms over 182 tiles
pc route1 | wind OFF: 16.7 ms/frame (59.8 fps), >20ms frames 0, render 2.98 ms (p95 6.6) | wind ON: 16.7 ms/frame (59.9 fps), >20ms 0, render 3.02 ms (p95 6.0), wind draw 0.28 ms over 139 tiles
pc route_saltmere_mirefen | wind OFF: 16.8 ms/frame (59.4 fps), >20ms frames 1, render 3.60 ms (p95 7.5) | wind ON: 16.8 ms/frame (59.5 fps), >20ms 1, render 3.97 ms (p95 7.9), wind draw 0.32 ms over 160 tiles
pc sunmeadow_fields | wind OFF: 16.7 ms/frame (59.8 fps), >20ms frames 0, render 3.20 ms (p95 6.3) | wind ON: 16.8 ms/frame (59.5 fps), >20ms 1, render 3.61 ms (p95 6.9), wind draw 0.33 ms over 144 tiles
pc brookhollow | wind OFF: 16.7 ms/frame (60.0 fps), >20ms frames 0, render 2.76 ms (p95 5.0) | wind ON: 16.8 ms/frame (59.4 fps), >20ms 1, render 2.82 ms (p95 4.8), wind draw 0.31 ms over 133 tiles
