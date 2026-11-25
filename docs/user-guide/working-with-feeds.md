# Working with Feeds

[← Back to Navigating MAGE](../Navigating_MAGE.md)

## What's a Feed?

A feed is a supplemental data set layered into your event — a TAK device roster, a maritime safety alert feed, anything an outside source can supply. See [Feeds](../domain.md#feeds) in the Domain Model for the full concept.

**Note:** your event's admin decides which feeds are available to the event — you can't add or remove one yourself. What you control is what you see.

## Browsing Feed Content

Each feed your admin has attached to the event gets its own tab in the left sidebar, alongside Observations and People. Click a feed's tab to see its items in a list, and click an item to open its full detail.

## Showing or Hiding a Feed on the Map

1. Open the **Layers** control on the map.
2. Under **Feeds**, check or uncheck a feed to show or hide its markers on the map.
3. Drag a feed up or down in the list to change which one draws on top of the others.

## Common Issues

**A feed isn't showing up in an event.** This takes two separate steps, and missing either one means the feed won't appear. First, a feed existing isn't enough — an admin has to attach it to that specific event, not just configure the feed itself. Second, it still has to be enabled from the **Layers** control on the MAGE homepage (see [Showing or Hiding a Feed on the Map](#showing-or-hiding-a-feed-on-the-map) above) — attaching it to the event alone doesn't turn it on for participants.

## Learn More

- [MAGE Domain Model](../domain.md) — Feeds concept
- [Working with Feeds (Admin)](../admin-guide/environment/working-with-feeds.md) — how an admin connects a service and attaches a feed
