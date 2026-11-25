# Mage Authentication and Identity Providers

This is a developer/testing reference for configuring authentication strategies against local test identity providers. For the production admin workflow, see [Working with Authentication](working-with-authentication.md).

## Opening Authentication Settings

1. Click the gear icon in the upper right of the Mage web app to load the **Admin** page.
2. Click the **Settings** tab in the tab strip on the left of the page.
3. Click the **Authentication** tab near the top of the main content pane. This tab should be selected by default.
4. Click any of the accordion headings to expand the section for the authentication you want to configure, or click the **New Authentication** button to add a new authentication identity provider.

## OAuth 2.0

Here is an example of using Google's OAuth 2.0 [endpoints](https://developers.google.com/identity/gsi/web/guides/overview) to authenticate Mage users. This setup is very similar to Google OpenID Connect authentication.

Obtain your **Client Identifier** and **Client Secret** from Google's [API Console](https://console.cloud.google.com/apis/credentials/oauthclient). Additionally on that page, ensure you register the correct callback URL, e.g., `https://mage.example.com/auth/oauth/callback`.

On the Mage Admin page, click the **Settings** tab, then fill in the fields:

| Field | Value |
| --- | --- |
| Authorization URL | `https://accounts.google.com/o/oauth2/v2/auth` |
| Token URL | `https://oauth2.googleapis.com/token` |
| User Profile URL | `https://www.googleapis.com/oauth2/v3/userinfo` |
| Scopes | `profile,email,openid` |

Click the **Advanced** section header to expand the advanced settings panel:

| Field | Value |
| --- | --- |
| Profile ID Property | `sub` |
| Display Name Property | `name` |

## LDAP

You can set up Mage to authenticate users with an LDAP server. For development testing, the [`auth-idp`](../../../docker/auth-idp/docker-compose.yml) Compose file uses the [osixia/openldap](https://github.com/osixia/docker-openldap) and [osixia/phpLDAPAdmin](https://github.com/osixia/docker-phpLDAPAdmin) images for LDAP services. Start the `mage-idp-ldap` and `mage-idp-ldap-ui` LDAP services with the following commands:

```bash
cd docker/auth-idp
docker compose up -d mage-idp-ldap mage-idp-ldap-ui
```

You can interact with the LDAP admin UI by browsing to https://localhost:6443. You'll need to bypass your browser's warning about a self-signed certificate. Click the **Login** link on the left pane. The root username and password for the LDAP server are `cn=admin,dc=wgd,dc=com` and `i found something`, respectively.

The `docker/docker-compose.yml` file starts up the `mage-idp-ldap` container with the `ldapseed.ldiff` file. This file seeds the LDAP server with a `batman` and `robin` user under the Field Agents org. Below are steps to do the same using the phpLDAPAdmin UI, should any more users need to be generated.

### Setting Up a Group Structure in phpLDAPAdmin

1. Click the `dc=wgd,dc=com` root node in the tree view on the left of the page.
2. In the main pane, click **Create a child entry**.
3. Select the **Generic: Posix Group** template.
4. Enter a name for the group in the **Group** field, e.g., `Field Agents`.
5. Click the **Create Object** button, then click the **Commit** button on the next page.
6. Click the root node again in the tree view.
7. Click **Create a child entry** in the main pane.
8. Select the **Generic: Organizational Unit** template.
9. Enter a name in the **Organizational Unit** field, e.g., `Field Agents`.
10. Click the **Create Object** button, then click the **Commit** button on the next page. The main pane should now display the organizational unit you just created.
11. Click **Create a child entry** in the main pane.
12. Select the **Generic: User Account** template.
13. Fill in the form fields, e.g.:

    | Field | Value |
    | --- | --- |
    | First Name | `Bruce` |
    | Last Name | `Wayne` |
    | Common Name | `Batman` |
    | User ID | `batman` |
    | Password | `i heart alfred` |
    | GID Number | `Field Agents` |

14. Click the **Create Object** button, then click the **Commit** button on the next page.

You now have a simple group structure and user account in your LDAP database.

### Configuring LDAP Authentication in Mage

Now that you have an LDAP database with a user account, you can configure LDAP authentication in Mage. This assumes you're running a Mage server on http://localhost:4242.

1. Open the Mage web app in your browser.
2. Click the gear icon in the top right to load the **Admin** page.
3. Click the **Security** tab in the vertical tab strip on the left.
4. Click the **New Authentication** button.
5. Enter a title for the authentication IDP, e.g. `Test LDAP`.
6. Click **Next**.
7. Select `LDAP` from the **Choose a type** drop-down.
8. Click **Next**.
9. Fill in the fields on the **Settings** step as follows:

   **Server**

   | Field | Value |
   | --- | --- |
   | URL | `ldap://localhost:389` |

   **Authentication**

   | Field | Value |
   | --- | --- |
   | Bind DN | `cn=admin,dc=wgd,dc=com` |
   | Bind Credentials | `i found something` |

   **User Search**

   | Field | Value |
   | --- | --- |
   | Search Base | `ou=Field Agents,dc=wgd,dc=com` |
   | Search Filter | `(uid={{username}})` |
   | Search Scope | `one` |

   **Advanced**

   | Field | Value |
   | --- | --- |
   | Profile ID Property | `uid` |
   | Display Name Property | `cn` |

10. Click **Next**.
11. Adjust the color settings to your preference.
12. Click **Next**.
13. Review the settings and click **Save**.
14. Open a new private browser tab or window and load your Mage server web app.
15. The sign-in page should display a button labeled **SIGN IN WITH LOCAL LDAP** under two text fields.
16. In the **Local LDAP Username** text field, enter `batman`.
17. In the **Local LDAP Password** text field, enter `i heart alfred`.
18. Click the **SIGN IN WITH LOCAL LDAP** button.
19. The page will most likely display a dialog that states the account needs admin approval.
20. In the browser tab with your Mage admin page, click the **Users** tab in the tab strip on the left.
21. Click the **Inactive** search facet near the top left of the main pane. The user list should contain the Batman user with a green **Activate** button.
22. Click the **Activate** button next to the Batman user.
23. Return to the private browser tab where you initially signed in with the LDAP account.
24. Ensure the LDAP username and password fields are still filled, then click the **SIGN IN WITH LOCAL LDAP** button.
25. The app may prompt for a device UID if your settings dictate. Enter the device UID.
26. You are now authenticated with your LDAP account.

## SAML

You can set up Mage to authenticate users with a SAML server. For development testing, the [`auth-idp`](../../../docker/auth-idp/docker-compose.yml) Compose file uses the [kristophjunge/test-saml-idp](https://github.com/kristophjunge/docker-test-saml-idp) image. Start the `mage-idp-saml` service with the following commands:

```bash
cd docker/auth-idp
docker compose up -d mage-idp-saml
```

The Docker Compose file is set to seed a few users with the `.saml/authsources.php` file. This file is mounted under volumes in the Docker Compose. Once it's spun up, you're ready to configure your SAML authentication provider.

1. Open the Mage web app in your browser.
2. Click the gear icon in the top right to load the **Admin** page.
3. Click the **Security** tab in the vertical tab strip on the left.
4. Click the **New Authentication** button.
5. Enter a title for the authentication IDP, e.g. `Test SAML`.
6. Click **Next**.
7. Fill in the **Settings** fields as follows:

   **Identity Provider (idP)**

   | Field | Value |
   | --- | --- |
   | Entry Point | `http://localhost:8080/simplesaml/saml2/idp/SSOService.php` |
   | Issuer | `http://localhost:4242` |
   | Redirect Host | `http://localhost:4242/auth/saml/callback` |

   **Security**

   | Field | Value |
   | --- | --- |
   | idP Public Signing Certificate | Navigate to `http://localhost:8080/simplesaml/saml2/idp/metadata.php`, look for the `<ds:X509Certificate>` tag, and copy everything inside it. |

   **Validation**

   | Field | Value |
   | --- | --- |
   | idP Issuer | `http://localhost:8080/simplesaml/saml2/idp/metadata.php` |

   **Logout**

   | Field | Value |
   | --- | --- |
   | Logout URL | `http://localhost:8080/simplesaml/saml2/idp/SingleLogoutService.php` |

8. Click **Next**.
9. Adjust the color settings to your preference.
10. Click **Next**.
11. Review the settings and click **Save**.
12. Open a new private browser tab or window and load your Mage server web app.
13. The sign-in page should display a button labeled **Continue with SAML**.
14. Clicking this button will take you to a simple login page where the SAML server is running.
15. For Username, enter `saml.user1`.
16. For Password, enter `user2pass`.
17. Depending on how the login was configured, you will either be redirected through to the application, or a user will have been created which will require approval from an admin.
