"use strict";

const log = require('winston');

exports.id = 'create-auth-config-setup';

exports.up = function (done) {
    const update = {
        $set: {
            'settings.google.clientID': '',
            'settings.google.clientSecret': '',
            'settings.google.callbackURL': '/auth/google/callback',
            'settings.google.textColor': '#FFFFFF',
            'settings.google.buttonColor': '#4285F4',
            'settings.geoaxis.clientID': '',
            'settings.geoaxis.clientSecret': '',
            'settings.geoaxis.callbackURL': 'https://magegeoaxis.geointservices.io/auth/geoaxis/callback',
            'settings.geoaxis.authorizationUrl': 'https://geoaxis.gxaws.com',
            'settings.geoaxis.callbackURL': 'https://gxisapi.gxaws.com',
            'settings.geoaxis.textColor': '#FFFFFF',
            'settings.geoaxis.buttonColor': '#163043',
            'settings.ldap.url': 'ldap://localhost:3389',
            'settings.ldap.bindDN': 'cn=mage_ldap,ou=Service Accounts,dc=mage,dc=io',
            'settings.ldap.bindCredentials': 'password',
            'settings.ldap.searchBase': 'ou=Users,dc=mage,dc=io',
            'settings.ldap.searchFilter': '(cn={{username}})',
            'settings.ldap.ldapUsernameField': 'cn',
            'settings.ldap.ldapDisplayNameField': 'givenname',
            'settings.ldap.ldapEmailField': 'mail',
            'settings.ldap.textColor': '#FFFFFF',
            'settings.ldap.buttonColor': '#5E35B1',
            'settings.saml.uidAttribute': 'uid',
            'settings.saml.displayNameAttribute': 'email',
            'settings.saml.emailAttribute': 'email',
            'settings.saml.options': {
                'issuer': 'https://magegeoaxis.geointservices.io',
                'entryPoint': 'https://magegeoaxis.geointservices.io:8443/simplesaml/saml2/idp/SSOService.php',
                'callbackPath': '/auth/saml/callback'
            },
            'settings.saml.textColor': '#000000',
            'settings.saml.buttonColor': '#EF6C00',
            'settings.oauth.clientID': '',
            'settings.oauth.clientSecret': '',
            'settings.oauth.callbackURL': ''
        }
    }

    this.db.collection('settings').findAndModify({ type: 'authconfigsetup' }, null, update, { upsert: true }, done);
}

exports.down = function (done) {
    done();
}