# Navigating MAGE

[← Back to Documentation Home](README.md)

## Quick Reference

- [What is MAGE?](#what-is-mage)
- [Getting Oriented](#getting-oriented)
- [Selecting an Event](#selecting-an-event)
- [Creating an Observation](#creating-an-observation)
- [Filtering](#filtering)
- [Reporting Your Location](#reporting-your-location)
- [Map Layers](#map-layers)

## What is MAGE?

MAGE (Mobile Awareness GEOINT Environment) is a shared situational awareness platform. It gives a team a common, real-time picture of what's happening in the field: anyone with access can report what they're seeing — a location, a note, a photo, a structured form — and it shows up on a map that everyone else on the team can see immediately. It's built for the kind of work where people are spread out and moving (search and rescue, field surveys, exercises) and need one shared source of truth instead of everyone keeping their own notes.

All of this activity is organized into **Events** — a specific operation or exercise that has its own map, its own team of participants, and its own set of data collection forms. You'll only see and contribute to the Events you've been given access to, so the first thing you'll do in MAGE is pick which Event you're working in. Everything else in this guide — the tabs, creating observations, filtering — happens inside that Event. (For a deeper look at how Events, Teams, and Observations relate to each other, see the [MAGE Domain Model](domain.md).)

## Getting Oriented

**Account menu** — top right of the MAGE home page:

- **Preferences** — update frequency, time format, time zone, coordinate system. See [Profile & Preferences](user-guide/profile-and-preferences.md).
- **Profile** — your display name, email, phone number, and password (username is read-only). See [Profile & Preferences](user-guide/profile-and-preferences.md).
- **Info** — MAGE version and mobile app download links.
- **Admin Page** — only visible with admin access; manages users, teams, events, forms, layers, and auth settings.

**The sidebar** — on the left, your event's content is organized into tabs:

- **Observations** — the event's observation feed. See [Working with Observations](user-guide/working-with-observations.md).
- **People** — who's active in the event.
- **One tab per Feed** your admin has attached to the event (if any). See [Working with Feeds](user-guide/working-with-feeds.md).
- **Export** — generate a data export of the event.

Clicking an item in any of these opens its detail alongside the list.

## Selecting an Event

**Why:** All data in MAGE — the map, observations, people, feeds — is scoped to an Event. Nothing shows up until you pick one.

**Steps:**
1. Click the event name at the top of the screen (it reads "Select Event" if none is active yet).
2. Use the search box to find an event by name, or scroll the list.
3. Click an event to switch to it — the map and tabs refresh to show that event's data.

See [Working with Events](user-guide/working-with-events.md) for more on what an event scopes and how it's assigned.

## Creating an Observation

An observation is how you log something you've seen in the field — a location plus whatever form data and media your event requires. Tap the **+** (pin) button on the map to drop one, fill in the form, and save.

See [Working with Observations](user-guide/working-with-observations.md) for the full walkthrough, including editing, flagging/favoriting, filtering, and deleting.

## Filtering

Narrow down the Observations list to what's relevant — a time range, specific people/teams, or field values. See [Working with Observations](user-guide/working-with-observations.md#filtering) for the full walkthrough.

## Reporting Your Location

**Why:** Sharing your position lets other event participants see where you are on the shared map in real time.

**Steps:**
1. On the map, use the location controls in the lower corner.
2. The **compass icon** centers the map on your location (visible only to you).
3. The **location icon** broadcasts your position to the event — other participants will see you on their map.

## Map Layers

**Why:** Layers add context to the map — base imagery, static features your admin uploaded, or an overlay drawn from a feed.

**Steps:**
1. Open the **Layers** control on the map.
2. Check or uncheck a layer to show or hide it, or drag it within its group to change draw order.
3. Expand a layer's row to adjust its opacity, zoom to it, or override its style, if supported.

See [Working with Map Layers](user-guide/working-with-map-layers.md) for the full walkthrough, including how layers are grouped and what each setting does.

## Related

- [Working with Events](user-guide/working-with-events.md) — what an event scopes, and how to select or switch between events.
- [Working with Observations](user-guide/working-with-observations.md) — creating, editing, flagging/favoriting, filtering, and deleting observations; what forms are.
- [Working with Feeds](user-guide/working-with-feeds.md) — browsing feed content and controlling what shows on the map.
- [Working with Map Layers](user-guide/working-with-map-layers.md) — showing/hiding layers, draw order, opacity, and style overrides.
- [Profile & Preferences](user-guide/profile-and-preferences.md) — updating your account details and password; setting update frequency, time format, time zone, and coordinate display.
- [MAGE Domain Model](domain.md) — deeper explanation of Events, Teams, Observations, Forms, Feeds.
