# Working with Authentication

## What's Authentication (Admin)?

Authentication strategies control how users sign in. **Local** (MAGE-managed username/password) is built in and always present. An admin can add others — **OpenID Connect**, **OAuth2**, **LDAP**, or **SAML** — so users can sign in through an external identity provider instead.

## Note

This page covers the actual admin workflow. [`auth.md`](auth.md) in this same folder is a separate developer/testing reference — it walks through standing up local test identity providers with Docker Compose and hardcoded test credentials, for development only, not production configuration.

## Adding an Authentication Strategy

In **Security → Authentication**, click **New Authentication** and step through:

1. **Title** — a name for this strategy, e.g. "Company SSO".
2. **Type** — **OpenID Connect**, **OAuth2**, **LDAP**, or **SAML**. (Local isn't an option here — it's already present and can't be created or removed.)
3. **Settings** — fields specific to the chosen type (endpoints, client credentials, directory search settings, etc.). See `auth.md` for worked examples of LDAP and SAML settings.
4. **Login Button** — customize how this strategy's sign-in button appears.
5. **Summary** — review everything, then **Save**.

## Managing an Existing Strategy

Each configured strategy is its own expandable panel showing **Enabled**/**Disabled**, with its own **Enable Authentication** toggle. Every strategy, regardless of type, shares two settings:

- **New User Accounts Require Admin Approval** — if disabled, accounts created through this strategy skip the approval step entirely. When disabled, you also pick the default **Event(s)** and **Team(s)** new users are automatically added to.
- **New Devices Require Admin Approval** — same idea, for device registration.

### Local-Only Settings

The **Local** strategy has two additional sections not shown for other types:

**Password Policy** — minimum requirements for every password (letters, max consecutive letters, lowercase, uppercase, numbers, special characters — each independently toggled with its own minimum count), plus overall password policies (minimum length, how many previous passwords can't be reused), and an optional custom help message shown to a user when their password fails the policy.

**Account Lock** — lock an account after a configurable number of invalid login attempts, for a configurable interval. An optional **Max Lockout** tier goes further: after an account has been locked a set number of times, it's disabled outright and needs an admin to manually re-enable it (see [Working with Users](../identity-and-access/working-with-users.md)).

## Deleting a Strategy

Only non-Local strategies can be deleted — there's no delete option for Local at all. The confirmation dialog states exactly how many users will lose access as a result of deleting it; there's no name-typing confirmation step, just Cancel/Delete.

## Common Issues

**I don't see a Delete option for one of my strategies.** Expected if it's Local — it's permanent by design and can't be removed.

**A self-registered user isn't showing up as pending.** Check **New User Accounts Require Admin Approval** for the strategy they signed up through — if it's disabled, accounts are active immediately with no approval step at all.

**A user's account got disabled and they don't know why.** If Account Lock's **Max Lockout** tier is configured, repeated lockouts disable the account outright rather than just locking it temporarily — re-enable it the same way as any other disabled account.

## Learn More

- [Admin: Authentication Setup Reference](auth.md) — developer/testing walkthroughs for OAuth2, LDAP, and SAML with local test identity providers
- [Working with Users](../identity-and-access/working-with-users.md) — activating, disabling, and re-enabling accounts
- [Profile & Preferences](../../user-guide/profile-and-preferences.md) — the local-vs-SSO password distinction from a user's side
