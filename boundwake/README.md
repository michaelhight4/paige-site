# Boundwake
Year-at-a-time isekai fantasy life sim. Separate game; data+content fork of Lifeline's engine (`/workspace/lifesim`). Notes/design: `/workspace/fantasy_lifesim/`.

## Run (zero-build, same as Lifeline)
    cd /workspace/boundwake && python3 -m http.server 8090   # open http://localhost:8090/
URL flags: `?fresh` new life, `?nosave`, `?seed=N`, `?skipintro`, `?ambient=0`.

## Tests
    node tests/smoke.mjs        # 120 seeded lives through engine + pack (reincarnate + heir paths)
    node tests/ui_shot.mjs      # headless Chrome; needs server on :8090; shots in tests/shots/  (cd tests && npm i once)

## Rebuild the content pack after notes change
    python3 tools/build_pack.py && python3 tools/build_events.py
`data_fantasy/` is GENERATED from the notes — edit the notes (or tools/build_events.py for events), not the JSON.
See STATUS.md.
