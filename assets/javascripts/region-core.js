/* Geometry and command rules shared by the map and the offline tests. */
(function (root) {
  "use strict";
  function ringLocation(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j], b = ring[i];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      // Ignore the duplicated closing vertex; a zero-length segment has no direction.
      if (length > 0 && Math.abs((point[0] - a[0]) * dy - (point[1] - a[1]) * dx) / length < 1e-10 &&
          point[0] >= Math.min(a[0], b[0]) - 1e-10 && point[0] <= Math.max(a[0], b[0]) + 1e-10 &&
          point[1] >= Math.min(a[1], b[1]) - 1e-10 && point[1] <= Math.max(a[1], b[1]) + 1e-10) return 0;
      if ((a[1] > point[1]) !== (b[1] > point[1]) &&
          point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside ? 1 : -1;
  }
  function inPolygon(point, polygon) {
    const outer = ringLocation(point, polygon[0]);
    if (outer < 0) return false;
    // A shared boundary belongs to both areas and is resolved by the visitor.
    return !polygon.slice(1).some(ring => ringLocation(point, ring) === 1);
  }
  function contains(point, geometry) {
    // The US source keeps Alaska continuous across the antimeridian (e.g. -187°).
    // Preserve those rings and test equivalent world copies of the selected point.
    const inWrappedPolygon = polygon => [0, -360, 360].some(offset => inPolygon([point[0] + offset, point[1]], polygon));
    if (geometry.type === "Polygon") return inWrappedPolygon(geometry.coordinates);
    if (geometry.type === "MultiPolygon") return geometry.coordinates.some(inWrappedPolygon);
    if (geometry.type === "GeometryCollection") return geometry.geometries.some(child => contains(point, child));
    return false;
  }
  function matchesAt(data, lon, lat) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) {
      throw new Error("Enter a latitude from -90 to 90 and longitude from -180 to 180.");
    }
    return data.regions.filter(region => contains([lon, lat], data.geometries[region.geometry]));
  }
  function configure(data, matches, selectedAreas) {
    const canonical = code => (data.policy.aliases || {})[code] || code;
    const approved = matches.filter(region => !region.optional && data.policy.allowedStatuses.includes(region.status));
    const suggested = data.policy.areas.filter(area => approved.some(region => canonical(region.id) === area.id));
    const selected = selectedAreas === undefined ? suggested.map(area => area.id) : selectedAreas;
    if (!Array.isArray(selected) || selected.some(id => !data.policy.areas.some(area => area.id === id))) {
      throw new Error("Choose a known local area.");
    }
    const areas = data.policy.areas.filter(area => selected.includes(area.id));
    if (!approved.length && !areas.length) return {state: "unsupported", areas: [], suggested};
    // Local areas are controlled by the selection; broader geographic scopes remain automatic.
    const localCodes = new Set(data.policy.areas.flatMap(area =>
      [area.id, ...(area.codes || []), area.meshmapper].filter(Boolean)));
    const codes = approved.map(region => canonical(region.id)).filter(code => !localCodes.has(code));
    for (const area of areas) {
      codes.push(...(area.codes || [area.id]));
      if (area.meshmapper) codes.push(area.meshmapper);
      if (area.louisiana) codes.push(...data.policy.louisianaCodes);
    }
    const allowed = [...new Set(codes)].sort();
    if (!allowed.length) return {state: "unsupported", areas, suggested};
    for (const code of allowed) {
      if (!/^[a-z0-9][a-z0-9-]{0,30}$/.test(code)) throw new Error("Invalid region code in data; commands unavailable.");
    }
    const commands = [];
    const definition = codes => "region def " + codes.join("|* ");
    let batch = [];
    for (const code of allowed) {
      // Stay within the 160-byte CLI buffer, leaving room for its terminator.
      // Each line starts at *, and each |* returns to * before the next code.
      if (batch.length && definition([...batch, code]).length > 159) {
        commands.push(definition(batch));
        batch = [];
      }
      batch.push(code);
    }
    if (batch.length) commands.push(definition(batch));
    commands.push("region save");
    return {state: "ready", areas, suggested, allowed, commands,
      verification: allowed.map(code => `region get ${code}`)};
  }
  const api = {contains, matchesAt, configure};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RegionCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
