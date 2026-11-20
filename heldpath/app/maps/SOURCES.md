# Map data sources

## World basemap (`world.pmtiles`)

Low-zoom (z0–6) extract of the [Protomaps](https://protomaps.com) daily basemap build `20261118`, tileset version 4.15.2, extracted with the official `pmtiles` CLI (`--maxzoom=6`).

- Data: OpenStreetMap, under the [ODbL](https://www.openstreetmap.org/copyright), and Natural Earth.
- Built by Protomaps / Planetiler. Official builds: https://maps.protomaps.com/builds/
- Redistributed here as a small overview so zooming out never goes black, including offline.
- Attribution: © OpenStreetMap contributors, Protomaps.

## Florence starter (`firenze.pmtiles`)

Street-level Protomaps extract of Florence, already bundled with the app.

## Online fill-in and offline area downloads

When the device is online, street-level tiles anywhere in the world are fetched from [OpenFreeMap](https://openfreemap.org/), which allows commercial use and offline area downloads.

Heldpath honours OpenFreeMap's published limits: at most 3,000 tiles or 50 MB per download, at most 4 parallel requests, and a unique User-Agent identifying this app. Viewed tiles are cached on the device.

- Map schema: OpenMapTiles.
- Attribution: OpenFreeMap © OpenMapTiles. Data from OpenStreetMap.
- Terms: https://openfreemap.org/

## Pedestrian routing graph (`firenze_walk.json`)

Built from the Florence starter pack's `roads` layer at zoom 15 by `scripts/build_walk_graph.mjs`.

Walkable ways kept: footways, paths, sidewalks, steps, pedestrian streets, cycleways, tracks, residential / service / unclassified / living streets, and minor / medium / primary roads (so city streets and bridges stay connected). Motorways, motorway links, trunks and trunk links are excluded. The graph is undirected (one-way tags are ignored for walking).

Same data licence as the pack: © OpenStreetMap contributors (ODbL).
