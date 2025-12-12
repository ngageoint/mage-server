# MAGE Authentication and Identity Providers

To configure authentication settings and identity providers
1. Click the gear icon in the upper right of the MAGE web app to load the _Admin_ page.
1. Click, the _Settings_ tab in the tab strip on the left of the page.
1. Click the _Authentication_ tab near the top of the main content pane.  This tab should be selected by default.
1. Click any of the accordion headings to expand the section for the authentication you want to configure, or
   click the _New Authentication_ button to add a new authentication identity provider.

## Local

## OAuth 2.0

Here is an example of using Google's OAuth 2.0 [endpoints](https://developers.google.com/identity/gsi/web/guides/overview) to authenticate MAGE
users.  This setup is very similar to Google OpenID Connect authentication.

Obtain your _Client Identifier_ and _Client Secret_ from Google's [API Console](https://console.cloud.google.com/apis/credentials/oauthclient).
Additionally on that page, ensure you register the correct callback URL, e.g., `https://mage.example.com/auth/oauth/callback`

On the MAGE Admin page, click the  _Settings_ tab.

_Authorization URL_ - `https://accounts.google.com/o/oauth2/v2/auth`
_Token URL_ - `https://oauth2.googleapis.com/token`
_User Profile URL_ - `https://www.googleapis.com/oauth2/v3/userinfo`
_Scopes_ - `profile,email,openid`

Click the _Advanced_ section header to expand the advanced settings panel.
_Profile ID Property_ - `sub`
_Display Name Property_ - `name`

## LDAP

You can setup MAGE to authenticate users with an LDAP server.  For development
testing, the [`auth-idp`](../docker/auth-idp/docker-compose.yml) Compose file
uses the [osixia/openldap](https://github.com/osixia/docker-openldap) and
[osixia/phpLDAPAdmin](https://github.com/osixia/docker-phpLDAPAdmin) images
for LDAP services.  Start the `mage-idp-ldap` and `mage-idp-ldap-ui` LDAP
services with the following commands.
```bash
cd docker/auth-idp
docker compose up -d mage-idp-ldap mage-idp-ldap-ui
```
You can interact with the LDAP admin UI by browsing to https://localhost:6443.
You'll need to by-pass your browser's warning about a self-signed certificate.
Click the _Login_ link on the left pane.  The root user name and password for
the LDAP server are `cn=admin,dc=wgd,dc=com` and `i found something`,
respectively.

You can then use the phpLDAPAdmin UI to setup a simple group structure.
1. Click the _dc=wgd,dc=com_ root node in the tree view on the left of the page.
1. In the main pane, click _Create a child entry_.
1. Select the _Generic: Posix Group_ template.
1. Enter a name for the group in the _Group_ field, e.g., `Field Agents`.
1. Click the _Create Object_ button, then click the _Commit_ button on the next page.
1. Click the root node again in the tree view.
1. Click _Create a child entry_ in the main pane.
1. Select the _Generic: Organizational Unit_ template.
1. Enter a name in the _Organizational Unit_ field, e.g., `Field Agents`.
1. Click the _Create Object_ button, then click the _Commit_ button on the next page.
1. The main pane should now display the organization unit you just created.
1. Click _Create a child entry_ in the main pane.
1. Select the _Generic: User Account_ template.
1. Fill the form fields, e.g.,

    | | |
    | ---: | --- |
    | _First Name_ | `Bruce`|
    | _Last Name_ | `Wayne` |
    | _Common Name_ | `Batman` |
    | _User ID_ | `batman` |
    | _Password_ | `i heart alfred` |
    | _GID Number_ | `Field Agents` |

1. Click the _Create Object_ button, then click the _Commit_ button on the next page.
You now have a simple group structure and user account in your LDAP database.

Now that you have an LDAP database with a user account, you can configure LDAP
authentication in MAGE.  This assumes you're running a MAGE server on
http://localhost:4242.
1. Open the MAGE web app in your browser.
1. Click the gear icon in the top right to load the _Admin_ page.
1. Click the _Settings_ tab in the vertical tab strip on the left.
1. The _Authentication_ tab in the main pane should already be active.  Click
   the tab if not.
1. Click the _New Authentication_ button.
1. Enter a title for the authentication IDP, e.g. `Test LDAP`.
1. Click the _Next_ button.
1. Select `LDAP` from the _Choose a type_ drop-down.
1. Click the _Next_ button.
1. Fill the fields on the _Settings_ step as follows.
   | | |
   | ---: | ---|
   | **_Server_** |
   | _URL_ | `ldap://localhost:389` |
   | **_Authentication_** |
   | _Bind DN_ | `cn=admin,dc=wgd,dc=com` |
   | _Bind Credentials_ | `i found something` |
   | **_User Search_** |
   | _Search Base_ | `ou=Field Agents,dc=wgd,dc=com` |
   | _Search Filter_ | `(uid={{username}})` |
   | _Search Scope_ | `one` |
   | **_Advanced_** |
   | _Profile ID Property_ | `uid |
   | _Display Name Property_ | `cn` |
1. Click the _Next_ button.
1. Adjust the color settings to your preference.
1. Click the _Next_ button.
1. Review the settings and click the _Save_ button.
1. Open a new private browser tab or window and load your MAGE server web app.
1. The sign-in page should display a button labeled _SIGN IN WITH LOCAL LDAP_
   under two text fields.
1. In the _Local LDAP Username_ text field, enter `batman`.
1. In the _Local LDAP Password_ text field, enter `i heart alfred`.
1. Click the _SIGN IN WITH LOCAL LDAP_ button.
1. The page will most likely display a dialog that states the account needs
   admin approval.
1. In the browser tab with your MAGE admin page, click the _Users_ tab in the
   tab strip on the left.
1. Click the _Inactive_ search facet near the top left of the main pane.  The
   user list should contain the _Batman_ user with a green _Activate_ button.
1. Click the _Activate_ button next to the _Batman_ user.
1. Return to the private browser tab where you initially signed in with the
   LDAP account.
1. Ensure the LDAP username and password fields are still filled, then click
   the _SIGN IN WITH LOCAL LDAP_ button.
1. The app may prompt for a device UID if your settings dictate.  Enter the
   device UID.
1. You are now authenticated with your LDAP account.
