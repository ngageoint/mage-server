# Working with Observations

[← Back to Navigating MAGE](../Navigating_MAGE.md)

## What's an Observation?

An observation is how you log something you've seen in the field — a location, a timestamp, whatever form data your event requires, and optional photos/video/audio. See the [Domain Model](../domain.md#observation) for the full concept.

## What's a Form?

A form is the set of fields you fill out on an observation — the questions your event's admin decided matter for this operation (species and habitat for a wildlife study, property damage and injuries for a disaster response, etc.). An event can have more than one form available; see [Form](../domain.md#form) and [Form Field](../domain.md#form-field) for more.

## Creating an Observation

1. Tap the **+** (pin) button on the map.
2. MAGE drops a marker at your current location — drag it to adjust, or edit the geometry directly.
3. Fill in the form. If the event has more than one form, use **Add Form** to attach additional ones.
4. Attach photos, video, or audio if needed.
5. Tap **Save**.

**Tip:** reorder multiple forms on one observation by dragging them.

## Setting an Observation's Shape

An observation isn't limited to a single point — tap the edit icon on the geometry preview to choose a shape:

- **Point** — search for a place or coordinates, or drag the marker on the map.
- **Line** — click the map to draw points, clicking the last point to finish. Drag a point to move it, drag a midpoint to add one, or right-click a point to remove it. Needs at least 2 points.
- **Polygon** — same click-to-draw interaction, closing the shape by clicking the first or last point. Needs at least 3 points, and the edges can't cross each other.

You can also paste coordinates, GeoJSON, WKT, or KML text directly instead of drawing — MAGE detects whether it's a Point, Line, or Polygon automatically.

## Editing an Observation

Click an observation on the map or in the Observations tab to open it, then choose **Edit** to change form values, geometry, or attachments.

## Flagging and Favoriting

- **Favorite** — marks an observation for yourself so you can filter down to just your favorites later.
- **Flag As Important** — marks it for the whole team, with a short description explaining why. It shows up on the observation's list entry as "Flagged By `<your name>`." Use **Update** to change the description, or **Remove** to clear the flag.

## Deleting an Observation

Click **Delete** and confirm. This removes the observation from the event's feed for everyone — it can't be undone from the app.

## Filtering

**Why:** Narrow down the Observations list to what's relevant — a time range, specific people/teams, or field values.

1. In the Observations tab, click the filter icon (top right).
2. Set a time range (including a custom start/end), filter by team or user, or toggle **Has Attachments**, **My Favorites**, or **Important**.
3. Use field filters to match specific form field values.
4. Click **Filter** to apply — active filters are shown as icons in the list header, and the keyword search box still works alongside them.

## Common Issues

**My line or polygon won't finish.** A Line needs at least 2 points and a Polygon needs at least 3 — click the last point again (or the first point, for a polygon) to close the shape. If a polygon's edges cross each other, MAGE flags it as invalid ("Edges cross. Move or remove a point to finish.") until you move or remove a point so the edges no longer overlap.

## Learn More

- [MAGE Domain Model](../domain.md) — Observation, Form, Form Field
- [Navigating MAGE](../Navigating_MAGE.md#getting-oriented) — the account menu and sidebar tabs available inside an event
