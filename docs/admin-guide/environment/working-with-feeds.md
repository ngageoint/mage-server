# Working with Feeds (Admin)

## What's a Feed?

A Feed is a supplemental data set attached to events — a TAK device roster, an NGA-MSI safety alert feed, anything an outside source supplies. See [Working with Feeds](../../user-guide/working-with-feeds.md) for what a feed looks like once it's attached to an event.

## Note

Feeds have two layers, and it's worth keeping them straight:
- A **Service** is the actual external connection — a TAK Server, an NGA-MSI endpoint — with its own host/credentials.
- A **Feed** is one configured topic pulled from a service (e.g. "TAK CoT Events") that's been given a title, display settings, and attached to one or more events.

One Service can produce several Feeds. The **Feeds** admin page has separate **Feeds** and **Services** tabs for managing each.

## Creating a Feed

Click **New Feed** to start a 4-step wizard. A live **Feed Item Preview** panel shows sample data as you go:

1. **Choose a Service and Topic** — pick an existing service and one of its topics, or create a new service inline first (pick a **Service Type**, then fill in that type's own connection fields — see [Working with TAK](../plugins/working-with-tak.md) for an example).
2. **Topic Configuration** — the topic's own fetch parameters (filters specific to that data source, like TAK's "Connected Devices Only").
3. **Configure Feed Item Properties** — set a display title for each raw property the topic returns.
4. **Describe the Feed** — Title, Summary, three checkboxes (items have a unique ID / items are geospatial / show on map by default), which property is **Primary** (main text), **Secondary** (ancillary text), and **Date/time** (used for sorting), a refresh interval hint, and separate icons for the feed list vs. the map. Anything left blank falls back to the topic's own defaults.

## Managing Services

The **Services** tab lists existing connections. A service's detail page shows its connection details and every Feed built from it.

## Attaching a Feed to an Event

On a feed's detail page, the **Events** card has its own **Add Event**/remove controls. Unlike Layers, this is one-directional — there's no equivalent "Feeds" card on the event detail page itself, so attaching a feed always starts from the feed's side.

## Deleting a Feed or Service

- **Delete Feed** — the feed itself is removed, but its parent **Service is not deleted** — the underlying connection and any other feeds built from it are unaffected.
- **Delete Service** — removes the connection *and cascades*: every feed built from that service is deleted with it. The confirmation dialog lists each feed that will go, by name, before you confirm.

## Common Issues

**A feed isn't showing up in an event.** Two separate steps, same as layers: the feed has to be attached to the event (from the feed's own Events card), *and* it has to be enabled from the **Layers** control on the map — attaching it alone doesn't turn it on for participants. See [Working with Feeds](../../user-guide/working-with-feeds.md#common-issues).

**I deleted a service and lost feeds I didn't expect to lose.** Deleting a Service cascades to every Feed built from it — this is called out explicitly in the confirmation dialog, so it's worth reading the feed list there before confirming.

**Where do I set up the connection itself (e.g. a TAK Server)?** Either the **Services** tab directly, or inline during step 1 of creating a feed — both end up in the same place.

## Learn More

- [Working with Feeds](../../user-guide/working-with-feeds.md) — the same feed from a field user's side
- [Working with Events (Admin)](working-with-events.md)
- [Working with Layers (Admin)](working-with-layers.md) — the bidirectional version of this same attach-to-event pattern
- [Working with TAK](../plugins/working-with-tak.md) — a real example of a feed Service type
