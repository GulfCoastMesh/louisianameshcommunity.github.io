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


class SyncTests(unittest.TestCase):
    def setUp(self):
        self.manifest = {"regions": [
            {"id": code, "name": code, "coordination_status": "official_local", "file": "shared.geojson"}
            for code in ("us-pns", "us-lft", "us-msy", "us-gpt")
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
        self.assertEqual(result["policy"]["areas"][0]["meshmapper"], "gc-fl-pns-mm")

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
