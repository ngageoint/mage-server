import { BaseTemplate } from './base-template';

export interface SamlSettings {
    uidAttribute: string,
    displayNameAttribute: string
    emailAttribute: string,
    options: {
        issuer: string,
        entryPoint: string,
        callbackPath: string
    }
};

export class SamlTemplate extends BaseTemplate {
    constructor() {
        super();

        this.settings['uidAttribute'] = 'uid';
        this.settings['displayNameAttribute'] = 'email';
        this.settings['emailAttribute'] = 'email';
        this._settings['options'] = {};
        this._settings.options['issuer'] = 'https://magegeoaxis.geointservices.io';
        this._settings.options['entryPoint'] = 'https://magegeoaxis.geointservices.io:8443/simplesaml/saml2/idp/SSOService.php';
        this._settings.options['callbackPath'] = '/auth/saml/callback';
    }
}