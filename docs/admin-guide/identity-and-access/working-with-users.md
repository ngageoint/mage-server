# Working with Users

## What's a User?

A user is an individual MAGE account — the login a person uses to access MAGE, separate from any Team or Event they're added to. Belonging to a Team and having that Team added to an Event is what actually grants access to that Event's data; see [Working with Events](../../user-guide/working-with-events.md#common-issues).

## Creating a User

1. In **Identity and Access → Users**, click **Create New User**.
2. Fill in **Username**, **Display Name**, **Role**, **Password**, and **Confirm Password** (all required). **Email** and **Phone** are optional.
3. Click **Create User**.

Admin-created users are active immediately — there's no invite/approval step for accounts you create yourself.

**Importing many users at once:** use **Import Users** to upload a CSV instead. Username, Display Name, and Password columns are required (Email, Phone, Icon Initials, and Icon Color are optional); you must pick a Team and a Role before uploading, since every imported user is added to that team. Don't refresh or leave the page during an import — partial failures are reported in an error table you can download as CSV.

## Activating a User

Anyone can self-register for a MAGE account, but self-registered accounts start **inactive** and can't sign in until an admin activates them. Admin-created users don't go through this — they're active from the moment you create them.

To activate a pending user, open their user detail page and click **Activate User Account**, or use the **Inactive Users** panel on the admin dashboard for a one-click activate.

## Editing a User and Assigning Roles

Open a user's detail page and edit their Display Name, Email, Phone, avatar, or map icon. **Username** can only be changed for accounts using local (username/password) sign-in — not for SSO/externally-authenticated accounts.

Roles available: **USER_ROLE**, **ADMIN_ROLE**, **EVENT_MANAGER_ROLE**. Changing a user's role requires a separate permission from general user editing — if you don't have it, the Role field shows as read-only instead of a dropdown.

## Resetting a Password

If you have permission, you can set a new password for a user directly from their detail page, without needing to know their current one — useful if they're locked out. This is only available for accounts using local sign-in; SSO/externally-authenticated accounts don't have a MAGE-managed password to reset (see the same local-vs-SSO distinction in [Profile & Preferences](../../user-guide/profile-and-preferences.md)).

## Disabling or Deleting a User

- **Disable/Enable Account** — reversible. Disabling blocks sign-in but keeps the account's information intact; you can re-enable it later. No confirmation step.
- **Delete** — permanent. MAGE's confirmation dialog states that deleting a user also removes their location data, and that this cannot be undone.

## Viewing a User's Teams and Events

A user's detail page lists the Teams they belong to and the Events they can access — including events they only reach indirectly through a team ("Via teams: ..."), plus their login history.

## Common Issues

**Phone number doesn't save when creating a user.** This is a known quirk of the Create User dialog — the Phone field accepts input, but it isn't included when the account is created. Add the phone number afterward by editing the user instead.

**I can't change a user's role.** Role assignment requires a separate permission from general user editing. If you don't have it, the Role field on that user's detail page will be read-only.

**I don't see a password option for a user.** Password changes only apply to accounts using local sign-in. For SSO or other externally-authenticated accounts, password management happens with that identity provider, not in MAGE.

## Learn More

- [Working with Events](../../user-guide/working-with-events.md) — how Team membership and Event access relate
- [Profile & Preferences](../../user-guide/profile-and-preferences.md) — the same account/password screen from a user's own point of view
