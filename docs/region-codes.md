# MeshCore Region Codes

> **Updated November 2026:** these codes follow the Gulf Coast Mesh region scope list. Louisiana
> repeaters don't use `us-east` anymore, and the MeshMapper `-mm` codes are retired. MeshMapper now
> uses regular codes like `us-la-msy`, `us-ms-gpt`, `us-fl-nw` and `us-ms-n`. North Mississippi uses
> `us-ms-n`, not `us-ms-ne`. To drop an old code from a repeater, run `region remove <code>`, then
> `region save`.

## What is region coding?

The goal of region coding isn’t to stop you from talking to people farther away. It’s to keep conversations from being repeated in places where they don’t need to go.
Every time a repeater retransmits a message, that transmission uses airtime. Keeping unnecessary rebroadcasts out of an area means less traffic competing with the people using that part of the network. That’s the practical benefit we’re aiming for.

*MeshCore calls this a region scope.*

When you send a scoped message, a small code travels with the packet. A compatible repeater checks that code against the regions it’s configured to allow. If the scope is allowed, the repeater can forward the message. Otherwise, it doesn’t pass that flood message onward.

## Find your repeater's region codes

Choose where the **repeater is installed on the map below**, or enter its coordinates. Region codes are selected automatically from the mapped boundaries. Some codes depend on things the map can't see, like a base or antenna height. The map lists those separately, and the [full list by area](#region-codes-by-area) is below the map.

**Enter region codes on repeaters only, not companions. Leave `*` (unscoped) allowed, and leave the default scope empty.**

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

## Region codes by area

This is the Gulf Coast Mesh list. On every repeater, leave `*` (unscoped) allowed, or Public won't work. Leave the default scope empty too. Don't put a region code in it.

### Louisiana

Every Louisiana repeater: `us`, `us-la`, `us-gc`, `us-southeast`, `us-south`.

Then add the code for where the repeater is:

- Baton Rouge to the Mississippi state line (MSY): `us-la-msy`. In the New Orleans area, also add `us-la-gno`. In the Baton Rouge area, also add `us-la-btr`.
- Lafayette, from the Atchafalaya to Jennings: `us-la-lft`
- Lake Charles, from Jennings and DeRidder to the Texas state line: `us-la-lc`
- Monroe: `us-la-mlu`
- Around St. James Parish: `us-la-sja`

`us-la` carries statewide messages. Each area code keeps messages inside that area.

### Mississippi

Every Mississippi repeater: `us`, `us-southeast`, `us-south`, `us-gc`, `us-ms`.

Then add the codes for where the repeater is:

- I-59 corridor from Picayune north (MSY): `us-la`, `us-la-msy`, `us-ms-gpt`, `us-ms-pb`
- The coast, from the Louisiana line to the Alabama line (GPT): `us-ms-gpt`, `us-ms-pb`
- North Mississippi Mesh (GTR): `us-ms-n`
- Central Mississippi Mesh (JAN): `us-ms-jan`

`us-la` passes messages from Louisiana and `us-la-msy` from the Baton Rouge, New Orleans and Northshore area. `us-ms-gpt` covers coastal Mississippi and `us-ms-pb` the Pine Belt.

Repeaters need these to forward MeshMapper wardriving traffic: `us-la-msy` for MSY, `us-ms-gpt` for GPT and `us-ms-n` for North Mississippi. JAN doesn't have a MeshMapper code yet.

### Alabama

For the Alabama Gulf Coast, from Alabama to Florida. Every repeater: `us`, `us-gc`, `us-southeast`, `us-south`. Then add all of these:

- `us-al`: Alabama
- `us-al-mob`: Mobile metro and Mobile County
- `us-al-fhp`: Spanish Fort and Fairhope
- `us-al-guf`: Foley and Gulf Shores
- `us-al-dhn`: Dothan area
- `us-ms`: Mississippi (relay)
- `us-fl`: Florida (relay)
- `us-fl-nw`: for Pensacola

The relay codes pass statewide messages across state lines, like a good neighbor. All repeaters should have the state-level codes.

To set up a new repeater in one go, run this command, then `region save`. It sets the same codes as the map.

```
region def us us-south|us us-southeast|us us-gc|us us-al us-al-mob|us-al us-al-fhp|us-al us-al-guf|us-al us-al-dhn|us-al us-ms|us us-fl|us us-fl-nw|us-fl
```

### Florida

For the Emerald Coast, from Escambia County to Franklin and Liberty counties. Every repeater: `us`, `us-southeast`, `us-south`, `us-east`, `us-gc`. Emerald Coast repeaters also add `us-fl` and `us-fl-nw`. `us-fl-nw` is the MeshMapper wardriving code too.

Then add the code for the repeater's county:

- `us-pns`: Escambia and Santa Rosa counties only
- `us-vps`: Okaloosa, Walton and Holmes counties and Eglin AFB only
- `us-ecp`: Bay, Washington, Jackson, Calhoun, Franklin and Gulf counties only
- `us-fl-gulf`: Gulf County only
- `us-tlh`: Gadsden, Leon, Wakulla and Jefferson counties only. This is outside the Emerald Coast and the `us-fl-nw` area.

On a base, also add its code:

- `us-npa`: NAS Pensacola only
- `us-nse`: NAS Whiting Field and its outlying fields only
- `us-pam`: Tyndall AFB only

Neighboring states, only if they fit:

- `us-al`: near the Alabama line, near open water, or 100 ft or higher
- `us-ms`: 100 ft or higher, or near open water
- `us-ga`: near the Georgia line, or 100 ft or higher

`us-east` is the area New England Mesh defined. It follows FEMA regions 1 to 4, except Alabama, Tennessee, Mississippi and Kentucky.

### Texas

For Port Arthur, Galveston and Beaumont. Every repeater: `us`, `us-southeast`, `us-south`, `us-gc`. The area code hasn't been decided yet.

## Channel scopes

Companions set a region scope on each channel. Every hashtag and private channel needs a region code, except `#dx`. Public and `#dx` stay unscoped (`*`).

### Baton Rouge and New Orleans, north to Hattiesburg

- Public: `*`
- `#weather`, `#wx`, `#test`, `#repeater-testing`, `#fun`: `us-la-msy`
- `#metairie`, `#westbank`: `us-la-gno`
- `#news`: `us-la`
- `#fishing`, `#hunting`, `#grumpymesh`: `us-gc`
- `#pinebelt`: `us-ms-pb`
- `#dx`: `*`

### Mississippi

- Public: `*`
- `#pearlrivercounty`, `#k5prc`, `#picayune`: `us-ms-prc`
- `#mississippi`, `#south-mississippi`: `us-ms`
- `#pinebelt`: `us-ms-pb`
- `#grumpymesh`: `us-gc`
- `#dx`: `*`

### Emerald Coast

- Public: `*` (unscoped for now)
- `#gulfcoast`, `#camping`, `#hunting`, `#fishing`: `us-gc`
- `#florida`: `us-fl`
- `#test`, `#weather`, `#wx`, `#airshow`, `#bot`: `us-fl-nw`
- `#dx`: `*` (unscoped for now)

## Neighboring meshes

- [Gulf Coast Mesh](https://www.gulfcoastmesh.org)
- [Emerald Coast](https://ecmesh.us/)
- [Acadiana Mesh](https://acadianamesh.com/)
- [MobMesh](https://mobmesh.org)
- [Region code map](https://regions.caboosey.net)

### Thank you for helping the Gulf Coast Mesh.
