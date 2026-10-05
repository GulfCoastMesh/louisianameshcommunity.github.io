# MeshCore Region Codes

> **Gulf Coast Mesh MSY update:** The current MSY-specific code is `us-la-msy`; the community dropped
> `us-la-msy-mm` because MM codes use too much byte space. If a repeater is having issues, you can
> remove `us-la-msy-mm` and the older `gc-la-msy-mm` if present. The map below now recommends
> `us-la-msy` without an MSY MeshMapper code.

## What is region coding?

The goal of region coding isn’t to stop you from talking to people farther away. It’s to keep conversations from being repeated in places where they don’t need to go.
Every time a repeater retransmits a message, that transmission uses airtime. Keeping unnecessary rebroadcasts out of an area means less traffic competing with the people using that part of the network. That’s the practical benefit we’re aiming for.

*MeshCore calls this a region scope.*

When you send a scoped message, a small code travels with the packet. A compatible repeater checks that code against the regions it’s configured to allow. If the scope is allowed, the repeater can forward the message. Otherwise, it doesn’t pass that flood message onward.

## Find your repeater's region codes

Choose where the **repeater is installed on the map below**, or enter its coordinates. Region codes are selected automatically from the mapped boundaries.

**Enter region codes on repeaters only, not companions. Leave `*` (unscoped) allowed.**

<div id="region-picker">
  <p data-status role="status" aria-live="polite">Loading region data…</p>
  <form>
    <fieldset disabled>
      <legend>Find by coordinates</legend>
      <label>Latitude <input name="latitude" type="number" min="-90" max="90" step="any" required></label>
      <label>Longitude <input name="longitude" type="number" min="-180" max="180" step="any" required></label>
      <button type="submit">Find region codes</button>
    </fieldset>
  </form>
  <div data-map role="region" aria-label="Repeater region map"></div>
  <p data-map-note></p>
  <div data-result></div>
  <p data-copy-status role="status" aria-live="polite"></p>
  <noscript>Enable JavaScript to use the map and command generator.</noscript>
</div>

### Thank you for helping the Gulf Coast Mesh.
