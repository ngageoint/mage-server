import { BaseTemplate } from './base-template';

export interface LdapSettings {
    url: string,
    bindDN: string,
    bindCredentials: string,
    searchBase: string,
    searchFilter: string,
    ldapUsernameField: string,
    ldapDisplayNameField: string,
    ldapEmailField: string
};

export class LdapTemplate extends BaseTemplate {
    constructor() {
        super();

        this._settings['url'] = 'ldap://localhost:3389';
        this._settings['bindDN'] = 'cn=mage_ldap,ou=Service Accounts,dc=mage,dc=io';
        this._settings['bindCredentials'] = 'password';
        this._settings['searchBase'] = 'ou=Users,dc=mage,dc=io';
        this._settings['searchFilter'] = '(cn={{username}})';
        this._settings['ldapUsernameField'] = 'cn';
        this._settings['ldapDisplayNameField'] = 'givenname';
        this._settings['ldapEmailField'] = 'mail';
    }
}