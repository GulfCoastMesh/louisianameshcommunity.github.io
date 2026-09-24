# MeshCore Region Codes

## What is region coding?

The goal of region coding isn’t to stop you from talking to people farther away. It’s to keep conversations from being repeated in places where they don’t need to go.
Every time a repeater retransmits a message, that transmission uses airtime. Keeping unnecessary rebroadcasts out of an area means less traffic competing with the people using that part of the network. That’s the practical benefit we’re aiming for.

*MeshCore calls this a region scope.*

When you send a scoped message, a small code travels with the packet. A compatible repeater checks that code against the regions it’s configured to allow. If the scope is allowed, the repeater can forward the message. Otherwise, it doesn’t pass that flood message onward.

## Find your repeater's region codes

Choose where the **repeater is installed on the map below**.

<div id="region-picker">
  <p data-status role="status" aria-live="polite">Loading region data…</p>
  <div data-map role="region" aria-label="Repeater region map"></div>
  <p data-map-note></p>
  <p data-timestamp></p>
  <p>Thank you Caboosey <a href="https://regions.caboosey.net">for providing this data.</a>
  <div data-result></div>
  <p data-copy-status role="status" aria-live="polite"></p>
  <noscript>Enable JavaScript to use the map and command generator. See the manual instructions below.</noscript>
</div>

### Thank you for helping the Gulf Coast Mesh.
