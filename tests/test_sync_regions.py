import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import sync_regions as sync

POLYGON = {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]}
POLICY = json.loads((sync.ROOT / "docs/regions.json").read_text())["policy"]
# Map regions that the sheet's groups and extras look for (local areas are listed separately).
RULE_REGIONS = sorted({ref for rule in POLICY["groups"] + POLICY["extras"]
                       for key in ("any", "all") for ref in rule["when"].get(key, [])}
                      - {area["id"] for area in POLICY["areas"]})


class SyncTests(unittest.TestCase):
    def setUp(self):
        # us-pns stays first and us-gpt last: tests below change those two entries.
        self.manifest = {"regions": [
            {"id": code, "name": code, "coordination_status": "official_local", "file": "shared.geojson"}
            for code in ("us-pns", *RULE_REGIONS, "us-lft", "us-msy", "us-gpt")
        ]}
        self.geojson = {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {"id": "untrusted", "coordination_status": "proposed"}, "geometry": POLYGON}
        ]}
        self.calls = []

    def fetch(self, url):
        self.calls.append(url)
        return copy.deepcopy(self.manifest if url == sync.INDEX_URL else self.geojson)

    def test_identity_from_manifest_and_shared_download(self):
        result = sync.build_snapshot(self.fetch)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(len(result["geometries"]), 1)
        self.assertEqual(result["regions"][0]["id"], "us-pns")
        self.assertEqual(result["regions"][0]["status"], "official_local")
        # The sheet retired the MeshMapper -mm codes, including Pensacola's.
        self.assertNotIn("meshmapper", result["policy"]["areas"][0])

    def test_normalizes_legacy_ids_and_preserves_local_policy(self):
        result = sync.build_snapshot(self.fetch)
        ids = {region["id"] for region in result["regions"]}
        self.assertIn("us-la-msy", ids)
        self.assertIn("us-la-lft", ids)
        self.assertNotIn("us-msy", ids)
        expected = json.loads((sync.ROOT / "docs/regions.json").read_text())["policy"]
        def rules(policy):
            result = copy.deepcopy(policy)
            for area in result["areas"]:
                area.pop("location", None)
            return result
        self.assertEqual(rules(result["policy"]), rules(expected))
        # Manual-only areas do not require invented upstream geometry.
        self.assertNotIn("us-la-mlu", ids)

    def test_accepts_canonical_ids_and_deduplicates_aliases(self):
        for original in list(self.manifest["regions"]):
            if original["id"] == "us-msy":
                canonical = dict(original, id="us-la-msy", file="canonical.geojson")
                self.manifest["regions"].append(canonical)
        for reverse in (False, True):
            if reverse:
                self.manifest["regions"].reverse()
            result = sync.build_snapshot(self.fetch)
            matches = [r for r in result["regions"] if r["id"] == "us-la-msy"]
            self.assertEqual(len(matches), 1)
            sync.validate_geometry(result["geometries"][matches[0]["geometry"]])
        self.manifest["regions"] = [r for r in self.manifest["regions"] if r["id"] != "us-msy"]
        self.assertTrue(sync.build_snapshot(self.fetch))

    def test_area_locations_reference_embedded_boundaries(self):
        result = sync.build_snapshot(self.fetch)
        areas = {area["id"]: area for area in result["policy"]["areas"]}
        location = areas["us-la-msy"]["location"]
        self.assertEqual(location["bbox"], [0, 0, 2, 2])
        self.assertIn(location["geometry"], result["geometries"])
        self.assertIsNone(areas["us-la-mlu"]["location"])
        self.assertIsNone(areas["us-la-gno"]["location"])
        self.assertEqual(areas["us-la-gno"]["parentArea"], "us-la-msy")

    def test_public_snapshot_round_trip_and_default_path(self):
        import io
        result = sync.build_snapshot(self.fetch)
        stream = io.StringIO()
        sync.write_snapshot(result, stream)
        self.assertEqual(json.loads(stream.getvalue()), result)

    def test_rejects_missing_local_region(self):
        self.manifest["regions"].pop()
        with self.assertRaisesRegex(ValueError, "missing supported"):
            sync.build_snapshot(self.fetch)

    def test_rejects_duplicate_and_unsafe_codes(self):
        for code in ("us-pns", "us-gpt\nregion save", "x" * 32):
            with self.subTest(code=code):
                self.manifest["regions"][-1]["id"] = code
                with self.assertRaisesRegex(ValueError, "Invalid or duplicate"):
                    sync.build_snapshot(self.fetch)

    def test_rejects_unapproved_local_area(self):
        self.manifest["regions"][0]["coordination_status"] = "proposed"
        with self.assertRaisesRegex(ValueError, "no longer approved"):
            sync.build_snapshot(self.fetch)

    def test_rejects_rule_region_missing_from_index(self):
        self.manifest["regions"] = [r for r in self.manifest["regions"] if r["id"] != "us-al-dhn"]
        with self.assertRaisesRegex(ValueError, "missing regions used by policy rule Alabama Gulf Coast: us-al-dhn"):
            sync.build_snapshot(self.fetch)

    def test_rule_validation(self):
        known = {"us-la"}
        good = {"name": "ok", "when": {"any": ["us-la"]}, "codes": ["us"]}
        sync.validate_rules({"groups": [good], "extras": [], "meshmapperCodes": ["us"]}, known)
        bad_rules = [
            ({"name": "no condition", "when": {"none": ["us-la"]}, "codes": ["us"]}, "any or all"),
            ({"name": "bad code", "when": {"any": ["us-la"]}, "codes": ["us\nregion save"]}, "Invalid codes"),
            ({"name": "no codes", "when": {"any": ["us-la"]}, "codes": []}, "Invalid codes"),
            ({"note": "unknown region", "when": {"all": ["us-la", "us-zz"]}, "codes": ["us"]}, "us-zz"),
        ]
        for rule, message in bad_rules:
            with self.subTest(rule=rule), self.assertRaisesRegex(ValueError, message):
                sync.validate_rules({"groups": [], "extras": [rule]}, known)
        with self.assertRaisesRegex(ValueError, "MeshMapper"):
            sync.validate_rules({"meshmapperCodes": ["Bad Code"]}, known)

    def test_folds_retired_meshmapper_and_north_mississippi_ids(self):
        for code in ("gc-la-lft-mm", "us-la-lc-mm", "us-ms-gpt-mm", "us-ms-ne", "us-ms-ne-mm"):
            self.manifest["regions"].insert(1, {"id": code, "name": code,
                "coordination_status": "official_local", "file": code + ".geojson"})
        result = sync.build_snapshot(self.fetch)
        ids = [region["id"] for region in result["regions"]]
        for code in ("us-la-lft", "us-la-lc", "us-ms-gpt", "us-ms-n"):
            self.assertEqual(ids.count(code), 1, code)
        for code in ("gc-la-lft-mm", "us-la-lc-mm", "us-ms-gpt-mm", "us-ms-ne", "us-ms-ne-mm"):
            self.assertNotIn(code, ids)
        merged = next(r for r in result["regions"] if r["id"] == "us-ms-n")["geometry"]
        sync.validate_geometry(result["geometries"][merged])

    def test_rejects_invalid_geometry(self):
        for geometry in (None, {"type": "Point", "coordinates": [0, 0]},
                         {"type": "Polygon", "coordinates": [[[0, 0], [1, 1], [2, 2]]]},
                         {"type": "Polygon", "coordinates": [[[999, 0], [1, 1], [2, 2], [999, 0]]]}):
            with self.subTest(geometry=geometry), self.assertRaises(ValueError):
                sync.validate_geometry(geometry)

    def test_supports_multi_and_collections(self):
        sync.validate_geometry({"type": "MultiPolygon", "coordinates": [POLYGON["coordinates"]]})
        sync.validate_geometry({"type": "GeometryCollection", "geometries": [POLYGON]})
        sync.validate_geometry({"type": "Polygon", "coordinates": [
            [[-190, 50], [-170, 50], [-170, 60], [-190, 60], [-190, 50]]]})

    def test_failed_refresh_preserves_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "regions.json"
            output.write_text('{"previous":true}')
            with patch.object(sync, "build_snapshot", side_effect=ValueError("source unavailable")), \
                 patch.object(sys, "argv", ["sync_regions.py", "--output", str(output)]), \
                 self.assertRaises(ValueError):
                sync.main()
            self.assertEqual(json.loads(output.read_text()), {"previous": True})


if __name__ == "__main__":
    unittest.main()
