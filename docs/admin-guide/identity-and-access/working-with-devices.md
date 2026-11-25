# Working with Devices

## What's a Device?

A device is a client (phone, tablet, etc.) authorized to connect to MAGE, identified by a unique **Device ID**. A device can optionally have a **Point of Contact** — a user associated with it for reference — but isn't required to have one.

## Creating a Device

1. In **Identity and Access → Devices**, click **New Device**.
2. Fill in **Device ID** (required, must be unique — e.g. `01:02:03:04:05:06:07`) and **Description** (optional).
3. Optionally search for and pick a **Point of Contact** user.
4. Click **Create Device**.

A device you create here still starts out **Inactive** — creating it doesn't activate it. See Activating a Device below.

## Editing a Device

Open a device's detail page and click **Edit Device** to change its Device ID, Description, or Point of Contact.

## Activating a Device

New devices are **Inactive** until an admin activates them — they can't access MAGE data until then. Open the device's detail page and click **Activate Device**. You can deactivate it again at any time with **Deactivate Device**; deactivating denies access but keeps all of the device's information.

## Deleting a Device

Click **Delete** and confirm. MAGE's confirmation dialog states that deleting a device also removes its associated location data, and that this cannot be undone.

## Common Issues

**A new device can't connect even though I just created it.** Creating a device doesn't activate it — it still starts Inactive. Open its detail page and click **Activate Device**.

**I don't see Edit Device / Activate / Delete on a device.** These require the corresponding permission (update, create, or delete) for devices.

## Learn More

- [Working with Users](working-with-users.md) — a device's optional Point of Contact user, and the similar active/inactive pattern for user accounts
