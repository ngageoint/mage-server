# Working with Plugins

## What's a Plugin?

A plugin extends MAGE without changing its core code — adding a new data feed or integration (ArcGIS, TAK), a file transfer target (SFTP), or an automatic safeguard like attachment virus scanning (ClamAV). A plugin can add backend behavior only, its own admin screen, or both, depending on what it does.

## Note

Which plugins are available on a MAGE server, and most of their settings (hosts, ports, credentials), are set in server configuration — not from the admin web page. Turning a plugin on or off, or changing its core connection settings, requires access to the server deployment itself (and usually a restart). The admin panel only reflects what's already enabled; it isn't a place to install or enable a plugin yourself.

## Finding a Plugin's Settings

1. If any plugin with its own admin screen is enabled, a **Plugins** group appears in the admin sidebar.
2. Each item under **Plugins** is one plugin's own configuration page, named and iconed however that plugin chooses — not a form MAGE built for it.
3. A plugin with no admin screen of its own (ClamAV, for example) doesn't appear under **Plugins** at all. Its work happens automatically in the background, with nothing to configure from the web app.

## Common Issues

**I don't see a plugin I was told should be there.** A plugin needs to be registered in server configuration to show up at all, and needs its own admin screen specifically to appear under **Plugins** — a backend-only plugin (like ClamAV) is working even though it's invisible here. Check with whoever manages the server deployment rather than looking for an enable/disable toggle in the admin panel.

**A plugin's tab won't load.** This is the plugin's own screen failing, not a general MAGE admin problem — the specific error shown is usually more useful than anything in this guide. Report it along with the plugin name.

## Learn More

- [Working with Authentication](../security/working-with-authentication.md) — a contrasting case: auth strategies are fully configured through an admin UI wizard, not server config files like plugins are
- [Working with ClamAV](working-with-clamav.md) — an example of a backend-only plugin with no admin screen
- [Working with SFTP](working-with-sftp.md) — an example of a plugin with a full admin configuration screen
- [Working with TAK](working-with-tak.md) — an example of a plugin that both feeds data in and pushes data out
- [Working with ArcGIS](working-with-arcgis.md) — an example of a plugin with an extensive, multi-tab admin screen
