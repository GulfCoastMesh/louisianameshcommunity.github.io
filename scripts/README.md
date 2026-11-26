# Region map maintenance

[`docs/regions.json`](../docs/regions.json) is the single source of truth, published as
<https://docs.gulfcoastmesh.org/regions.json>. It is committed to the repository.
The browser map, command generator, and refresh script all use this file.
There is no separate policy file or second snapshot.

## Editing the source

The Gulf Coast Mesh region scope sheet is the authority. When the sheet and the upstream map
disagree, the policy follows the sheet, and the reference lists in `docs/region-codes.md` copy it.

Edit `policy` at the top of `docs/regions.json`:

- `aliases` translates upstream IDs into the community's approved codes.
- `louisianaCodes` supplies the common codes for Louisiana area selections.
- `areas` defines selectable areas and optional additional messaging `codes`.
  `louisiana` adds the common codes; `required` requires that area in the upstream map.
  Areas without geometry remain in the reference catalog but are not selected automatically.
  An area-level `meshmapper` code is still supported, but no area uses one now.
- `groups` add one full list from the sheet wherever their `when` rule matches. A rule uses
  `any` (at least one listed region), `all` (every listed region) and `none` (no listed region).
  It needs `any` or `all`. Rules see the approved map regions and the chosen local areas; a local
  area that isn't chosen counts as absent. Groups only add codes; they never remove them.
- `extras` are codes the map can't decide, such as a sub-area, a base or antenna height. They use
  the same `when` rules, appear beside the commands with a short `note`, and are never part of
  the generated command list. Codes that are already allowed are left out.
- `meshmapperCodes` lists the regular codes that carry MeshMapper wardriving traffic. The map
  reports these, plus any code ending in `-mm`, as MeshMapper codes.
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

The sheet retired the MeshMapper `-mm` codes. Aliases fold the old IDs into the area codes
(`us-la-msy-mm` and `gc-la-msy-mm` to `us-la-msy`, `us-la-lft-mm` and `gc-la-lft-mm` to
`us-la-lft`, `us-la-lc-mm` to `us-la-lc`, `us-ms-gpt-mm` to `us-ms-gpt`). MeshMapper uses
`us-la-msy` (MSY), `us-ms-gpt` (GPT), `us-fl-nw` (NW Florida) and `us-ms-n` (North Mississippi).
The sheet names North Mississippi `us-ms-n`, so the map's `us-ms-ne` and `us-ms-ne-mm` alias to it.
Louisiana's common codes don't include `us-east`; only the Emerald Coast list does.

The Gulf Coast Mesh app (`lib/services/region_index_service.dart` in GulfCoastMesh-App-Public)
bundles this file and repeats the area logic in Dart. It reads `aliases`, `allowedStatuses`,
`areas` (`codes`, `meshmapper`, `louisiana`) and `louisianaCodes`, so keep those fields working.
It doesn't know `groups` or `extras` yet. `louisianaCodes` must stay equal to the Louisiana
group's list; a test checks this.

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
It also fails if a group or extra names a region the map no longer has, so the sheet's codes
can't drop out silently; update the rule when that happens.
`--output PATH` writes a preview snapshot while still reading policy from `docs/regions.json`.
Failed refreshes preserve the existing file. An offline build can use the committed snapshot.

Deployment refreshes data on pushes, manual runs, and daily at 10:17 UTC. An upstream failure
stops deployment and leaves the published site intact. MkDocs copies `regions.json` to the
site root. Do not edit the generated `site/` directory.

## Selection and commands

Map clicks and coordinate entry automatically select matching areas. Each matching area's messaging codes
are combined and deduplicated, and each matching group adds its list from the sheet.
New Orleans and Baton Rouge inherit the broader MSY codes; their own codes appear as extras.
Hidden approved map layers participate; proposed and optional scopes are not automatically added.
Other approved geographic scopes remain included.

Each selected scope gets its own `region def <code>` command, run one at a time, followed by a
single `region save`. Existing unrelated entries are not
removed, and unscoped `*` should remain allowed. These instructions are for repeaters only.
Physical-device verification requires running commands on a test repeater, checking `region get`
responses, and confirming persistence after reboot.

Leaflet 1.9.4 is pinned with integrity checks and OpenStreetMap attribution. Coordinate lookup works without Leaflet if `regions.json` loaded. Alaska's unwrapped antimeridian
coordinates are preserved and equivalent longitude copies are checked during lookup.

Optional browser checks: with Playwright and Chromium installed, serve a built site and run
`REGION_TEST_URL=http://127.0.0.1:8767 node tests/region-browser.cjs`. Checks cover the public
JSON, overlapping regions, map clicks, copy/fallback, mobile/dark appearance, and
failed data/library loads. Screenshots default to `/tmp`; override with `REGION_SCREENSHOT_DIR`.
