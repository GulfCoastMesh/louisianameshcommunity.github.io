(function () {
  "use strict";
  const assetBase = new URL("../", document.currentScript.src);
  let leafletPromise;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!leafletPromise) leafletPromise = new Promise((resolve, reject) => {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      style.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      style.crossOrigin = "anonymous";
      document.head.append(style);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
      script.crossOrigin = "anonymous";
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error("The map library could not load."));
      document.head.append(script);
    });
    return leafletPromise;
  }
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  async function initialize() {
    const root = document.getElementById("region-picker");
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = "true";
    const status = root.querySelector("[data-status]");
    const result = root.querySelector("[data-result]");
    const form = root.querySelector("form");
    const fields = root.querySelector("fieldset");
    const feedback = root.querySelector("[data-copy-status]");
    let data, map, marker, matches = [], selectedPoint;
    const layers = [];
    const palette = ["#2574b8", "#bd4f00", "#258343", "#9640b0"];
    const say = message => { status.textContent = message; };
    function commandList(commands) {
      const list = element("ol", undefined, "region-commands");
      commands.forEach(command => {
        const row = element("li");
        const code = element("code", command);
        code.tabIndex = 0;
        const button = element("button", "Copy");
        button.type = "button";
        button.setAttribute("aria-label", "Copy " + command);
        button.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(command);
            feedback.textContent = "Copied: " + command;
          } catch (_) {
            const range = document.createRange();
            range.selectNodeContents(code);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            code.focus();
            feedback.textContent = "Automatic copy is unavailable. The command is selected; use your device’s Copy action.";
          }
        });
        row.append(code, button);
        list.append(row);
      });
      return list;
    }
    function render(selectedArea) {
      result.replaceChildren();
      feedback.textContent = "";
      const config = RegionCore.configure(data, matches, selectedArea);
      const location = `${selectedPoint.lat.toFixed(5)}, ${selectedPoint.lng.toFixed(5)}`;
      if (config.state === "unsupported") {
        say("No approved regions were found at this location. No commands generated.");
        result.append(element("p", "Move the marker or enter another location. Proposed, optional, and uncoordinated regions are not automatically configured."));
        return;
      }
      if (config.areas.length > 1) {
        const label = element("label", "This location touches more than one local area. Choose your local MeshMapper area: ");
        const select = element("select");
        select.append(new Option("Choose an area…", ""));
        config.areas.forEach(area => select.append(new Option(area.name, area.id)));
        select.value = selectedArea || "";
        select.addEventListener("change", () => render(select.value));
        label.append(select);
        result.append(label);
      }
      if (config.state === "choose") {
        say("Choose a local area to generate commands for " + location + ".");
        return;
      }
      say("Configuration for " + (config.area ? config.area.name + " at " : "") + location + ".");
      result.append(element("h4", "Regions in area:"));
      result.append(element("p", "Allow: " + config.allowed.join(", ")));
      if (!config.allowed.some(code => code.endsWith("-mm"))) {
        result.append(element("p", "No MeshMapper code is known for this location."));
      }
      const regionNames = matches.filter(region => config.allowed.includes(region.id))
        .map(region => `${region.name} (${region.id})`).join("; ");
      result.append(element("h4", config.commands.length === 2 ? "Set your regions, then save" : "Set your regions in batches, then save"));
      result.append(element("p", "Log into your repeater and open Command Line or Terminal."));
      if (config.commands.length > 2) {
        result.append(element("p", "This list exceeds one command’s length limit, so it is split into batches. Run every region def command in order before saving."));
      }
      result.append(element("p", "Wait for each reply. If any command returns an error, stop before saving and resolve it; a failed command may have applied only part of the list."));
      result.append(commandList(config.commands));
      const verification = element("details");
      verification.append(element("summary", "Verify the saved settings"));
      verification.append(element("p", "Run these after region save succeeds. Each allowed region should show F."));
      verification.append(commandList(config.verification));
      result.append(verification);
    }
    function selectPoint(lat, lng) {
      result.replaceChildren();
      try {
        matches = RegionCore.matchesAt(data, lng, lat);
        selectedPoint = {lat, lng};
        if (form) {
          form.elements.latitude.value = lat.toFixed(6);
          form.elements.longitude.value = lng.toFixed(6);
        }
        if (map) {
          if (!marker) marker = L.circleMarker([lat, lng], {radius: 7, color: "#111", fillColor: "#fff", fillOpacity: 1}).addTo(map);
          else marker.setLatLng([lat, lng]);
          marker.bringToFront();
          const ids = new Set(matches.map(region => region.id));
          layers.forEach(({layer, region, color}) => layer.setStyle({color,
            weight: ids.has(region.id) ? 3 : 1,
            fillOpacity: ids.has(region.id) ? 0.17 : 0.025}));
        }
        render();
      } catch (error) {
        say(error.message);
      }
    }
    if (form) {
      form.addEventListener("submit", event => {
        event.preventDefault();
        const lat = Number(form.elements.latitude.value);
        const lng = Number(form.elements.longitude.value);
        selectPoint(lat, lng);
        if (map && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) map.panTo([lat, lng]);
      });
    }
    try {
      const response = await fetch(new URL("data/regions.json", assetBase), {signal: AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error("Region data is unavailable (HTTP " + response.status + ").");
      data = await response.json();
      if (data.version !== 1 || !data.regions?.length || !data.policy?.areas?.length || !data.geometries ||
          !Number.isFinite(Date.parse(data.retrievedAt))) throw new Error("Region data is invalid.");
      if (fields) fields.disabled = false;
      say(form ? "Click your repeater’s location on the map, or enter its coordinates." : "Click your repeater’s location on the map.");
    } catch (error) {
      say(error.message + " Reload to try again. No commands are available until data loads.");
      return;
    }
    try {
      const L = await loadLeaflet();
      if (!root.isConnected) return;
      map = L.map(root.querySelector("[data-map]"), {scrollWheelZoom: false}).fitBounds([[29, -93], [31.6, -86.8]]);
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19
      }).addTo(map);
      tiles.once("tileerror", () => { root.querySelector("[data-map-note]").textContent = "Some base-map tiles could not load. Region boundaries and coordinate lookup remain available."; });
      const overlays = {};
      data.regions.forEach((region, index) => {
        const localIndex = data.policy.areas.findIndex(area => area.id === region.id);
        const color = palette[(localIndex < 0 ? index : localIndex) % palette.length];
        const layer = L.geoJSON(data.geometries[region.geometry], {interactive: false,
          style: {color, weight: 1, fillOpacity: 0.025}});
        // Leaflet layer-control labels accept HTML, so escape upstream names using textContent.
        overlays[element("span", `${region.name} (${region.id})`).innerHTML] = layer;
        if (region.visible || localIndex >= 0) layer.addTo(map);
        layers.push({layer, region, color});
      });
      L.control.layers({}, overlays, {collapsed: true}).addTo(map);
      map.on("click", event => selectPoint(event.latlng.lat, event.latlng.lng));
      root.querySelector("[data-map-note]").textContent = "Use +/− to zoom.";
      if (selectedPoint) selectPoint(selectedPoint.lat, selectedPoint.lng);
    } catch (error) {
      root.querySelector("[data-map-note]").textContent = error.message;
    }
  }
  if (typeof document$ !== "undefined") document$.subscribe(initialize);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
