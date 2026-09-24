# Region map maintenance

The map on `region-codes.md` reads the generated `docs/assets/data/regions.json` snapshot. It never requests the upstream API from the visitor's browser.

Before previewing or building locally:

```sh
python scripts/sync_regions.py
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/region-core.test.cjs
mkdocs serve
```

The deployment workflow fetches and validates a complete snapshot on pushes, manual runs, and daily at 10:17 UTC. An upstream failure stops the deployment and preserves the previously published site. The snapshot is a generated, ignored build input; do not commit it or edit the generated `site/` directory. For an offline rebuild, an already generated snapshot can be reused; its retrieval time remains visible.

`region-policy.json` owns the four additional community-approved MeshMapper mappings and accepted coordination statuses. Configuration works anywhere with an approved matching API region, including API-provided MeshMapper codes. The API index owns region IDs, names, optional flags, and status; GeoJSON supplies boundaries only. Shared geometry files are downloaded once. Hidden layers still participate in selection. New proposed or unknown statuses are not automatically approved. If a mapped local region disappears or loses approval, synchronization fails for review. Overlaps between the four additional mappings require the visitor to select one; other matching API codes are still included.

The US boundary uses unwrapped longitudes across Alaska's antimeridian. These are preserved (within ±360°), and selection checks equivalent longitude copies; manually entered coordinates still use the standard ±180° range.

The generator uses `region def` to define and flood-allow the matching codes, with `|*` separators keeping them directly under `*`, followed by `region save`. Lists are packed into commands of at most 159 ASCII characters to leave a terminator in the 160-byte CLI buffer; every batch starts at `*`. It never emits deny commands. Updating an existing entry puts it under `*` and enables flooding. It does not reset other entries or change global/default/home scope. The page includes manual `region put`/`region allowf` instructions for firmware without `region def`. Before claiming physical-device verification, run a generated sequence on a test repeater, inspect each `region get` response, and confirm persistence after reboot.

Map assets use pinned Leaflet 1.9.4 with integrity checks and OpenStreetMap attribution. Coordinate lookup works if Leaflet or map tiles are unavailable, provided the snapshot loaded. No coordinates are sent to a geocoding service.

Optional browser checks: with Playwright and its Chromium browser installed, serve a built site and run `REGION_TEST_URL=http://127.0.0.1:8767 node tests/region-browser.cjs`. The test covers copy/fallback, map clicks, overlap, mobile/dark appearance, repeated selections, and failed data/library loads. Screenshots go to `/private/tmp` by default; set `REGION_SCREENSHOT_DIR` to change that location.
