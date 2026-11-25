# MAGE Documentation

This is the starting point for guides on **using** and **administering** MAGE. If you're looking for technical/contributor documentation (architecture, tech stack, project structure), see the [root README](../README.md) instead.

## Guides

- [Navigating MAGE](Navigating_MAGE.md) — how to use the MAGE web app: understanding the main tabs, selecting an event, creating observations, filtering, and reporting your location.
  - [Working with Events](user-guide/working-with-events.md)
  - [Working with Observations](user-guide/working-with-observations.md)
  - [Working with Feeds](user-guide/working-with-feeds.md)
  - [Working with Map Layers](user-guide/working-with-map-layers.md)
  - [Profile & Preferences](user-guide/profile-and-preferences.md)

- Admin Guide
  - Identity and Access
    - [Working with Users](admin-guide/identity-and-access/working-with-users.md)
    - [Working with Teams](admin-guide/identity-and-access/working-with-teams.md)
    - [Working with Devices](admin-guide/identity-and-access/working-with-devices.md)
  - Environment
    - [Working with Events (Admin)](admin-guide/environment/working-with-events.md)
    - [Working with Layers (Admin)](admin-guide/environment/working-with-layers.md)
    - [Working with Feeds (Admin)](admin-guide/environment/working-with-feeds.md)
  - Plugins
    - [Working with Plugins](admin-guide/plugins/working-with-plugins.md)
    - [Working with ClamAV](admin-guide/plugins/working-with-clamav.md)
    - [Working with SFTP](admin-guide/plugins/working-with-sftp.md)
    - [Working with TAK](admin-guide/plugins/working-with-tak.md)
    - [Working with ArcGIS](admin-guide/plugins/working-with-arcgis.md)
  - Security
    - [Working with Authentication](admin-guide/security/working-with-authentication.md)

More guides (Admin Control, deployment/operations) will be added here as they're written.

## Reference

- [MAGE Domain Model](domain.md) — core concepts (Events, Teams, Forms, Observations, Layers).
- [Use Cases](use_cases/) — deeper walkthroughs of specific workflows (feeds, tracking).
- [Admin: Authentication Setup Reference](admin-guide/security/auth.md) — developer/testing walkthroughs for OAuth2, LDAP, and SAML with local test identity providers (not the admin workflow — see [Working with Authentication](admin-guide/security/working-with-authentication.md) for that).
