"""Fetch and validate a complete region snapshot before publishing it with MkDocs."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
INDEX_URL = "https://regions.caboosey.net/regions/index.json"
CODE = re.compile(r"[a-z0-9][a-z0-9-]{0,30}\Z")
MAX_BYTES = 25 * 1024 * 1024


def fetch_json(url):
    if urlparse(url).scheme != "https":
        raise ValueError("Region sources must use HTTPS: " + url)
    request = Request(url, headers={"User-Agent": "GulfCoastMeshDocs/1.0"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=45) as response:
                if urlparse(response.url).scheme != "https":
                    raise ValueError("Region source redirected away from HTTPS")
                body = response.read(MAX_BYTES + 1)
            break
        except (URLError, TimeoutError) as error:
            retryable = not isinstance(error, HTTPError) or error.code == 429 or error.code >= 500
            if attempt == 2 or not retryable:
                raise ValueError("Could not fetch {}: {}".format(url, error)) from error
            time.sleep(attempt + 1)
    if len(body) > MAX_BYTES:
        raise ValueError("Region source exceeds size limit: " + url)
    return json.loads(body)


def validate_geometry(geometry):
    if not isinstance(geometry, dict):
        raise ValueError("Missing geometry")
    kind = geometry.get("type")
    if kind == "GeometryCollection":
        children = geometry.get("geometries")
        if not isinstance(children, list) or not children:
            raise ValueError("Empty geometry collection")
        for child in children:
            validate_geometry(child)
        return
    if kind not in ("Polygon", "MultiPolygon"):
        raise ValueError("Unsupported geometry: " + str(kind))
    coordinates = geometry.get("coordinates")
    polygons = [coordinates] if kind == "Polygon" else coordinates
    if not isinstance(polygons, list) or not polygons:
        raise ValueError("Empty geometry")
    for polygon in polygons:
        if not isinstance(polygon, list) or not polygon:
            raise ValueError("Empty polygon")
        for ring in polygon:
            if not isinstance(ring, list) or len(ring) < 4 or ring[0] != ring[-1]:
                raise ValueError("Polygon rings must be closed with at least four positions")
            for position in ring:
                if not isinstance(position, list) or len(position) < 2:
                    raise ValueError("Invalid coordinate")
                lon, lat = position[:2]
                if any(isinstance(n, bool) or not isinstance(n, (int, float)) or not math.isfinite(n)
                       for n in (lon, lat)) or not (-360 <= lon <= 360 and -90 <= lat <= 90):
                    raise ValueError("Invalid longitude/latitude: " + repr(position))


def geometry_bounds(geometry):
    """GeoJSON bbox order: west, south, east, north (longitude, latitude)."""
    if geometry["type"] == "GeometryCollection":
        bounds = [geometry_bounds(child) for child in geometry["geometries"]]
        return [min(b[0] for b in bounds), min(b[1] for b in bounds),
                max(b[2] for b in bounds), max(b[3] for b in bounds)]
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    positions = [point for polygon in polygons for ring in polygon for point in ring]
    return [min(p[0] for p in positions), min(p[1] for p in positions),
            max(p[0] for p in positions), max(p[1] for p in positions)]


def normalize_snapshot(snapshot, policy):
    """Apply local naming policy while retaining all source boundary coverage."""
    aliases = policy.get("aliases", {})
    regions = {}
    for source in snapshot["regions"]:
        region = dict(source)
        region["id"] = aliases.get(region["id"], region["id"])
        code = region["id"]
        if code in regions:
            existing = regions[code]
            # Both names can coexist upstream during a rename. Keep their union.
            if existing["geometry"] != region["geometry"]:
                geometry = "local:merged:" + code
                snapshot["geometries"][geometry] = {
                    "type": "GeometryCollection", "geometries": [
                        snapshot["geometries"][existing["geometry"]],
                        snapshot["geometries"][region["geometry"]],
                    ]}
                existing["geometry"] = geometry
            # Prefer canonical metadata when both names are present.
            if source["id"] == code:
                region["geometry"] = existing["geometry"]
                regions[code] = region
        else:
            regions[code] = region
    snapshot["regions"] = list(regions.values())
    for area in policy["areas"]:
        region = regions.get(area["id"])
        # A missing boundary is explicit, never inferred from a nearby city or parent.
        area["location"] = None if region is None else {
            "geometry": region["geometry"],
            "bbox": geometry_bounds(snapshot["geometries"][region["geometry"]]),
        }
    snapshot["policy"] = policy
    return snapshot


def build_snapshot(fetch=fetch_json):
    policy = json.loads((ROOT / "docs/regions.json").read_text())["policy"]
    manifest = fetch(INDEX_URL)
    entries = manifest.get("regions")
    if not isinstance(entries, list) or not entries:
        raise ValueError("Index must contain a nonempty regions array")
    seen = set()
    urls = []
    for entry in entries:
        code = entry.get("id", "")
        if not isinstance(code, str) or not CODE.fullmatch(code) or code in seen:
            raise ValueError("Invalid or duplicate region ID: " + str(code))
        seen.add(code)
        if not isinstance(entry.get("name"), str) or not entry["name"].strip():
            raise ValueError("Missing region name: " + code)
        if not isinstance(entry.get("file"), str) or not entry["file"]:
            raise ValueError("Missing region file: " + code)
        for flag in ("visible", "optional"):
            if flag in entry and not isinstance(entry[flag], bool):
                raise ValueError("Invalid " + flag + ": " + code)
        urls.append(urljoin(INDEX_URL, entry["file"]))
    required = {area["id"] for area in policy["areas"] if area.get("required")}
    canonical_seen = {policy.get("aliases", {}).get(code, code) for code in seen}
    if not required <= canonical_seen:
        raise ValueError("Index is missing supported local areas: " + ", ".join(sorted(required - canonical_seen)))
    unique_urls = sorted(set(urls))
    with ThreadPoolExecutor(max_workers=6) as pool:
        sources = dict(zip(unique_urls, pool.map(fetch, unique_urls)))
    geometries = {}
    for url, data in sources.items():
        if data.get("type") != "FeatureCollection" or not data.get("features"):
            raise ValueError("Expected nonempty GeoJSON FeatureCollection: " + url)
        children = []
        for feature in data["features"]:
            if feature.get("type") != "Feature":
                raise ValueError("Expected GeoJSON Feature: " + url)
            geometry = feature.get("geometry")
            try:
                validate_geometry(geometry)
            except ValueError as error:
                raise ValueError("{}: {}".format(url, error)) from error
            children.append(geometry)
        geometries[url] = {"type": "GeometryCollection", "geometries": children}
    regions = [{
        "id": entry["id"], "name": entry["name"],
        "status": entry.get("coordination_status", "unknown"),
        "optional": entry.get("optional", False), "visible": entry.get("visible", True),
        "geometry": url,
    } for entry, url in zip(entries, urls)]
    snapshot = normalize_snapshot({"version": 1, "source": INDEX_URL,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "regions": regions, "geometries": geometries}, policy)
    for area in policy["areas"]:
        region = next((item for item in snapshot["regions"] if item["id"] == area["id"]), None)
        if region and (region["optional"] or region["status"] not in policy["allowedStatuses"]):
            raise ValueError("Supported area is no longer approved: " + area["id"])
    return snapshot


def write_snapshot(snapshot, stream):
    # Keep the editable rules readable without expanding millions of coordinates.
    header = {key: value for key, value in snapshot.items() if key not in ("regions", "geometries")}
    stream.write(json.dumps(header, indent=2, allow_nan=False)[:-2])
    stream.write(',\n  "regions": ')
    json.dump(snapshot["regions"], stream, indent=2, allow_nan=False)
    stream.write(',\n  "geometries": ')
    json.dump(snapshot["geometries"], stream, separators=(",", ":"), allow_nan=False)
    stream.write("\n}\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "docs/regions.json")
    args = parser.parse_args()
    snapshot = build_snapshot()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Replace only after the entire snapshot has passed validation.
    with tempfile.NamedTemporaryFile(mode="w", dir=args.output.parent, delete=False) as temporary:
        write_snapshot(snapshot, temporary)
        path = Path(temporary.name)
    path.replace(args.output)
    print("Validated {} regions; wrote {}".format(len(snapshot["regions"]), args.output))


if __name__ == "__main__":
    main()
