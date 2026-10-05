# Region map maintenance

[`docs/regions.json`](../docs/regions.json) is the single source of truth, published as
<https://docs.gulfcoastmesh.org/regions.json>. It is committed to the repository.
The browser map, command generator, and refresh script all use this file.
There is no separate policy file or second snapshot.

## Editing the source

Edit `policy` at the top of `docs/regions.json`:

- `aliases` translates upstream IDs into the community's approved codes.
- `louisianaCodes` supplies the common codes for Louisiana area selections.
- `areas` defines selectable areas, optional additional messaging `codes`, and `meshmapper` codes.
  `louisiana` adds the common codes; `required` requires that area in the upstream map.
  Areas without geometry remain in the reference catalog but are not selected automatically.
- `allowedStatuses` lists upstream coordination statuses accepted for automatic suggestions.

`regions` contains normalized upstream records; each `geometry` references an entry in
`geometries`. `retrievedAt` records the geographic data refresh time. Consumers should use
`policy.areas` for the full selectable-area catalog, including areas without mapped boundaries.
Each area's generated `location` contains a `geometry` key into the embedded `geometries`
object and a GeoJSON `bbox` in `[west, south, east, north]` order (longitude/latitude degrees).
Resolve a boundary as `data.geometries[area.location.geometry]`; no second download is needed.
`location: null` means no confirmed boundary is available. New Orleans and Baton Rouge identify
`parentArea: "us-la-msy"`; the parent's boundary is not presented as their exact boundary.
Refreshes regenerate `location` from normalized source geometry; edit rules, not generated locations.

The Lafayette MeshMapper override deliberately retains `gc-la-lft-mm` from the community list.
The MSY-specific code is `us-la-msy`; map `us-la-msy-mm` and `gc-la-msy-mm` to that code, and do not set an MSY `meshmapper` override. Keep unrelated local MeshMapper codes unchanged.

## Refresh and verification

```sh
python scripts/sync_regions.py
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/region-core.test.cjs
mkdocs serve
```

The refresh script preserves the file's policy and replaces geographic data only after a
complete validated fetch. It accepts old and canonical upstream IDs, merges equivalent
boundary coverage, and fails if a required area disappears or a supported area loses approval.
`--output PATH` writes a preview snapshot while still reading policy from `docs/regions.json`.
Failed refreshes preserve the existing file. An offline build can use the committed snapshot.

Deployment refreshes data on pushes, manual runs, and daily at 10:17 UTC. An upstream failure
stops deployment and leaves the published site intact. MkDocs copies `regions.json` to the
site root. Do not edit the generated `site/` directory.

## Selection and commands

Map clicks and coordinate entry automatically select matching areas. Each matching area's messaging and MeshMapper codes
are combined and deduplicated. New Orleans and Baton Rouge inherit the broader MSY codes.
Hidden approved map layers participate; proposed and optional scopes are not automatically added.
Other approved geographic scopes remain included.

`region def` enables the selected scopes, with `|*` separators keeping them under `*`, followed
by `region save`. Commands fit within 159 ASCII characters. Existing unrelated entries are not
removed, and unscoped `*` should remain allowed. These instructions are for repeaters only.
Physical-device verification requires running commands on a test repeater, checking `region get`
responses, and confirming persistence after reboot.

Leaflet 1.9.4 is pinned with integrity checks and OpenStreetMap attribution. Coordinate lookup works without Leaflet if `regions.json` loaded. Alaska's unwrapped antimeridian
coordinates are preserved and equivalent longitude copies are checked during lookup.

Optional browser checks: with Playwright and Chromium installed, serve a built site and run
`REGION_TEST_URL=http://127.0.0.1:8767 node tests/region-browser.cjs`. Checks cover the public
JSON, overlapping regions, map clicks, copy/fallback, mobile/dark appearance, and
failed data/library loads. Screenshots default to `/tmp`; override with `REGION_SCREENSHOT_DIR`.
