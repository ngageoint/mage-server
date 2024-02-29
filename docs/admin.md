# Identity Providers

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