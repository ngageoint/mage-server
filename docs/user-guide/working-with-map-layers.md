# Working with Map Layers

[← Back to Navigating MAGE](../Navigating_MAGE.md)

## What's a Map Layer?

A map layer is additional geospatial content drawn on your event's map — a base map, static features your admin uploaded, or an overlay drawn from a feed. See [Map Layer](../domain.md#map-layer) in the Domain Model for more.

**Note:** your event's admin decides which layers are available to the event — you can't add or remove one yourself. What you control is which of them you're currently showing and how they look.

## Showing or Hiding a Layer

1. Open the **Layers** control on the map.
2. Layers are grouped by type — **Mage**, **Base Layers**, **Grid Overlays**, **Feeds**, **Feature Overlays**, and **Tile Overlays**.
3. Check or uncheck a layer to show or hide it. **Base Layers** use a single choice instead of a checkbox, since only one base map shows at a time.
4. Drag a layer up or down within its group to change which one draws on top of the others.

## Adjusting a Layer's Appearance

Click the arrow on a layer's row to expand its settings:

- **Opacity** — adjust how transparent the layer appears on the map.
- **Zoom to Layer** — if the layer has a defined area, jump the map to it.
- **Override Style** — for layers that support it, turn this on to set a custom stroke color, fill color, and stroke width instead of the layer's default appearance.

## Common Issues

**A layer isn't showing up in an event.** This takes two separate steps, and missing either one means the layer won't appear. First, an admin has to add the layer on the Admin page. Second, it still has to be enabled from the **Layers** control on the MAGE homepage (see [Showing or Hiding a Layer](#showing-or-hiding-a-layer) above) — adding it on the Admin page alone doesn't turn it on for participants.

## Learn More

- [MAGE Domain Model](../domain.md#map-layer) — Map Layer concept
- [Working with Feeds](working-with-feeds.md) — feeds show up in the same Layers control
- [Working with Layers (Admin)](../admin-guide/environment/working-with-layers.md) — how an admin creates and attaches a layer
