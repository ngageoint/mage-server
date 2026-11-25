# Working with Teams

## What's a Team?

A team is a named group of users. Adding a team to an event is what actually grants its members access to that event — see [Working with Events](../../user-guide/working-with-events.md#common-issues). Each member also has a role within the team itself (**Guest**, **Manager**, or **Owner**, default Guest) that controls what they personally can do with that specific team, separate from their global MAGE role (User/Admin/Event Manager).

## Creating a Team

1. In **Identity and Access → Teams**, click **New Team**.
2. Fill in **Team Name** (required) and **Description** (optional).
3. Click **Create Team**.

## Editing a Team

Open a team's detail page and click **Edit Team** to change its name or description.

## Managing Team Members

- **Add Member** — click **Add Member**, search for a user by name, display name, or email, and select them.
- **Remove a member** — click remove on their row; they're removed immediately, with a 5-second **Undo** option in the confirmation message.
- **Change a member's team role** — use the role menu on their row to set Guest, Manager, or Owner.

## Managing Team Events

- **Add Event** — click **Add Event** and search for an event not already linked to this team.
- **Remove an event** — click remove on its row; removed immediately, with a 5-second **Undo** option.

## Deleting a Team

Click **Delete** and confirm — this permanently deletes the team and cannot be undone. There's also a **"Delete all users that are part of this team"** checkbox: checking it shows an additional "Are you absolutely sure?" warning, because it permanently deletes every member's user account entirely — not just their membership in this team — even if they also belong to other teams.

## Common Issues

**I deleted a team and lost users I didn't mean to delete.** This happens if "Delete all users that are part of this team" was checked — it deletes those user accounts outright, everywhere in MAGE, not just from this one team. Leave that checkbox unchecked if you only want to remove the team itself.

**I don't see Edit Team / Add Member / Delete on a team.** These require the corresponding permission (update/delete), either globally or granted specifically for that team through its own access list.

## Learn More

- [Working with Users](working-with-users.md) — user accounts, roles, and the delete-user behavior this page's "delete all users" option triggers
- [Working with Events](../../user-guide/working-with-events.md) — how team membership grants event access
