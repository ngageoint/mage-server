# Working with Layers (Admin)

## What's a Layer?

A Layer is geospatial content an admin makes available to events — a base map, static features, or offline-capable map data. See [Working with Map Layers](../../user-guide/working-with-map-layers.md) for what a layer looks like once it's showing on a user's map.

## Note

There are three layer types, and the dashboard filters them along a different axis than creation does — **Online** (Imagery, Feature) vs. **Downloadable** (GeoPackage, meant for offline use). Attaching a layer to an event is only half the job — see [Common Issues](#common-issues).

## Creating a Layer

1. On the Layers dashboard, click **New Layer**.
2. Fill in **Layer Name**, **Layer Type**, and optional **Description**.
3. What else you fill in depends on the type:
   - **Imagery** (WMS, XYZ, or TMS) — a **Layer URL**, a **Format** choice, and whether it's a **Base Layer**. For WMS specifically, click **Load WMS Capabilities** to discover the server's available layers and select which ones to use — only layers in **EPSG:3857** are usable in MAGE clients; others are listed but disabled. A **Preview Map** panel lets you check it before saving, and **Advanced Options** exposes WMS version, transparency, and styles if the defaults don't fit.
   - **Feature** (static KML/KMZ) — creation itself is just the name/description; there's no file to upload yet. You add its actual map data afterward, from the layer's own detail page.
   - **GeoPackage** (downloadable) — upload a `.gpkg` file at creation. This is the only chance to attach that specific file; editing the layer later can't replace it.

## The Layer Detail Page

- **Metadata** — type-specific details (Base Layer, Format, URL for Imagery; the WMS sub-settings if applicable).
- **Add KML or KMZ Data** (Feature layers only) — upload more KML, KMZ, or a zipped shapefile (50MB max per upload) at any time; each upload reports how many features it created, or an error if it failed. This is also how a freshly-created Feature layer gets its first data.
- **Events** — which events this layer is attached to, with its own **Add Event**/remove controls. This is the same relationship as the event's own Layers card, just viewed from the layer's side — attaching works from either page.
- **Layer Preview** — once the layer is available.
- **Download** — only shown for file-based layers (Feature, GeoPackage), since an Imagery layer is just a URL reference with nothing to download.

### GeoPackage Processing

After uploading a GeoPackage, the layer enters a **Processing** state while the server indexes its feature layers and optimizes its tile layers — it isn't available yet. If the file is invalid, you'll see its specific validation errors (warnings or fatal). For a fatal error, MAGE still lets you **Proceed With Layer Creation** anyway, but says so plainly: doing this with an invalid GeoPackage may cause app and server crashes. Don't use this unless you're confident the errors are cosmetic.

## Deleting a Layer

From the layer detail page, **Delete** permanently removes the layer and all its associated data — there's no name-confirmation step here (unlike deleting an Event or User), just a Cancel/Delete choice.

## Common Issues

**I added a layer, but users still don't see it.** Two separate steps are both required: the layer has to be attached to the event (from either the event's Layers card or the layer's own Events card), *and* it has to be enabled from the **Layers** control on the map itself — attaching it on the admin side doesn't turn it on for participants. See [Working with Map Layers](../../user-guide/working-with-map-layers.md#common-issues).

**Most of a WMS server's layers show up disabled.** MAGE clients can only render **EPSG:3857** layers. If a WMS server's layers use a different projection, they're listed for visibility but can't be selected.

**A Feature layer I just created is empty.** That's expected — creating it only sets its name and description. Open its detail page and use **Add KML or KMZ Data** to actually populate it.

**A GeoPackage layer stays in "Processing" for a while.** Indexing and tile optimization run in the background and can take time for a large file; it isn't stuck unless the upload has also produced validation errors.

## Learn More

- [Working with Map Layers](../../user-guide/working-with-map-layers.md) — the same layer from a field user's side
- [Working with Events (Admin)](working-with-events.md) — the other side of attaching a layer to an event
- [Working with Feeds](working-with-feeds.md)
