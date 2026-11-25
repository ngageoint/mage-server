# Working with Events (Admin)

## What's an Event?

From the admin side, an Event is the container you configure before anyone can use it — who can access it (directly or through a Team), what Layers it shows, what Forms it collects, and whether it's currently open for use at all. See [Working with Events](../../user-guide/working-with-events.md) for what an event looks like from a field user's side.

## Note

Creating an event doesn't set its Active/Complete status — check the status badge on the event's detail page after creating one, and use **Activate**/**Complete** if it isn't in the state you expect.

## Creating an Event

1. On the Events dashboard, click **New Event**.
2. Fill in **Event Name** (required) and **Description** (optional).
3. Click **Create Event**.

The dashboard lets you filter by **All**/**Active**/**Complete** and search by name, since event lists can grow large over time.

## Activating or Completing an Event

Each event's detail page has an **Activate**/**Complete** toggle:
- **Active** — the event is selectable on clients; users can contribute observations and locations to it.
- **Complete** — the event is removed as a selectable option. It isn't destroyed, and can be switched back to active at any time.

## Team Members and Teams

An event's detail page has two separate lists that both grant access:
- **Team Members** — individual users added directly to this event.
- **Teams** — whole teams added to this event; every member of an added team can view the event and submit observations.

Both support search, and adding/removing is immediate (no confirmation step).

## Layers

The **Layers** card lists layers attached to this event, with **Add Layer**/remove controls and search. The same attachment can also be made from a layer's own detail page via its **Events** card. See [Working with Layers](working-with-layers.md) for layer-specific configuration.

Feeds aren't managed from the event detail page — they're attached to an event from a feed's own **Events** card in the **Feeds** admin section instead. See [Working with Feeds](working-with-feeds.md).

## Access (Event Roles)

The **Access** card is separate from Team Members/Teams — it controls who can manage the event itself, not just who can submit observations to it. Three roles:
- **Guest** — read-only access to the event.
- **Manager** — read and update access.
- **Owner** — read, update, and delete access.

Rules worth knowing:
- Only an existing Owner (or someone with the event role-management permission) can grant or change the Owner role for someone else — if you don't have that permission, Owner doesn't appear as an option you can assign.
- An event must always have at least one Owner — the last remaining Owner's role is locked and can't be changed or removed, shown with a lock icon.

## Forms

Each event has its own set of Forms, listed on the event detail page with drag-to-reorder:
- **Create Form** opens a field-by-field builder for a new form.
- **Upload Form** imports a previously-exported MAGE form archive (`.zip`) — its fields and icons come in automatically; you still set its Name, Description, and Color during upload.
- **Show/Hide Archived Forms** toggles whether archived forms appear in the list.
- Each form has a **Preview** action to see it as a field user would.

**Form Restrictions**, below the form list, sets two independent limits:
- **Total form entries** — the min/max number of forms allowed across a single observation.
- **Individual form entries** — the min/max number of times each specific form can appear in one observation.

## Deleting an Event

From the event detail page, **Delete** requires typing the event's exact name to confirm. This is permanent — it removes all event information, including observation and location data, and cannot be undone.

## Common Issues

**I made an event Active/Complete by mistake.** Neither is destructive — Complete just hides the event from client selection, and either state can be switched back at any time.

**I can't make someone an Owner.** Only an existing Owner (or someone with the role-management permission) can grant the Owner role. If you're a Manager, Owner won't show up as an assignable option.

**I can't remove the last Owner, or change their role.** An event must always have at least one Owner — this is enforced, not a bug.

**A team's members can't see the event, but I thought I added them.** Confirm it's the *Team* that was added under Teams, not just added as an individual Team Member — the two lists are independent, and adding one doesn't add the other.

## Learn More

- [Working with Events](../../user-guide/working-with-events.md) — the same event from a field user's side
- [Working with Teams](../identity-and-access/working-with-teams.md) — how team membership itself is managed
- [Working with Layers](working-with-layers.md)
- [Working with Feeds](working-with-feeds.md)
