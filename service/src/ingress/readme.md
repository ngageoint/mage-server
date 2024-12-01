# Mage Ingress

Ingress is the process Mage users to enroll, authenticate, and admit users to establish sessions.

## Concepts

**User:** The person that requires access to the Mage service and resources

**Account:** The persistent record in Mage that represents and tracks a user

**Enrollment:** Creating a new Mage account a user will use to access Mage resources

**Authentication:** Authentication is the verification of a user's credentials to prove

**Identity Provider:** An identity provider is a service with the sole responsibility to authenticate users using a
specific protocol, from the perspective of Mage.  Examples include Google OAuth, Google OIDC, Meta, a corporate
enterprise LDAP server, etc.

**Ingress Protocol:** An ingress protocol defines the sequence of interactions between a user, an identity provider,
and the Mage service that delegates user authentication to the identity provider in order to allow access
to Mage resources.  A typical example is a service which allows a user to authenticate with a Google account through
a series of HTTP requests and redirects.

## Flow

1. User chooses the identity provider.
1. Web app requests sign-in to identity provider.
1. Server directs sign-in request to IDP.
1. IDP returns result to server.
1. Server maps IDP account to Mage user account, creating account if necessary, to enroll the user.
   1. If account inactive or disabled, skip JWT, return { user, token: null }
   1. If account is active and enabled, generate authenticated JWT, return { user, token }
1. Client sends JWT and device information to server to request API session token.
1. Server verifies JWT, applies device enrollment policy, creates a session, and returns the session token to the client.