# Working with TAK

## What's the TAK Plugin?

The TAK plugin connects a MAGE event to a TAK Server in both directions. TAK Server data (live unit positions) can appear in MAGE as a feed, and MAGE observations and user locations can be pushed out to the TAK Server as CoT (Cursor-on-Target) events. It works with a real Gov TAK Server or an OpenTAKServer instance — both speak the same Marti API this plugin connects to.

## Note

Pulling TAK data in and pushing MAGE data out are independent — you can use either direction alone. Pushing specifically requires a **CoT Port** on the TAK Server connection; without it, the per-event sharing toggles can still be switched on, but nothing is actually sent.

## Connecting a TAK Server

1. In **Admin → Feeds**, add a new feed service and choose **TAK Server** as the type.
2. Fill in the connection fields: **Base URL** (required — the GovTAK or OpenTAK Server address), **Port**, **CoT Port** (only needed if you plan to push MAGE data out), **Username**, **Password**.
3. Add the **TAK CoT Events** topic to an event's feeds, the same way you'd add any other feed. It supports filtering by **Connected Devices Only**, **Unit ID or Callsign Contains**, and a start/end time range.

Since there's no single bulk endpoint for "every device's current position," the plugin discovers the connected device roster and fetches each device's position individually, merging them into one feed update. A device whose position fetch fails or can't be parsed is skipped rather than failing the whole feed.

## Pushing MAGE Data to TAK

In **Plugins → TAK**, select an event to see two independent toggles, both off by default:

- **Share observations to TAK** — while on, new or edited observations in that event are periodically sent to the TAK server as CoT markers. Editing an already-pushed observation updates the same marker instead of creating a duplicate.
- **Share user locations to TAK** — while on, a user's reported location in that event is sent to the TAK server as a live position report as soon as it's saved.

Below the toggles, a status panel shows the number of observations pushed, when the event last synced, and a short list of recently synced observations.

If you enable either toggle before the event's TAK feed has a CoT Port configured, a warning banner says so directly — sharing is "on" in the sense that MAGE will try, but nothing will actually reach the TAK server until that's fixed under **Admin → Feeds**.

## Common Issues

**Sharing is enabled but nothing is reaching the TAK server.** Check for the warning banner on the **Plugins → TAK** page — it means this event's TAK feed has no CoT Port configured. Add one under **Admin → Feeds**.

**The CoT Events feed shows no devices, or a device's position is missing.** The device needs to be visible to the TAK Server's connected-device roster for its position to be fetched at all. An individual device that fails to resolve is silently skipped rather than breaking the whole feed, so a partial-looking feed can still be working correctly for the other devices.

**Location sharing feels like a bigger privacy decision than observation sharing.** That's intentional — the two toggles are independent specifically because continuously sharing a user's live location is a larger footprint than sharing a deliberately-submitted observation. Enabling one does not enable the other.

**TAK Data does not appear on the MAGE Map** In the case where you can see TAK data points on the left-side tab on the MAGE map, ensure the TAK feed is selected from the layers list.  By default, this appears hidden until actively toggled on.  This can be changed when initially setting up the TAK feed.

## Learn More

- [Working with Plugins](working-with-plugins.md) — how plugin tabs work in general
- [Working with Feeds](../../user-guide/working-with-feeds.md) — what a feed looks like from a field user's side
- [Working with Feeds (Admin)](../environment/working-with-feeds.md) — connecting a Service and building a Feed in general
