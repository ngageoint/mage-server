import { BaseTemplate } from './base-template';

export interface OAuthSettings {
    apiUrl?: string,
    clientID: string,
    clientSecret: string,
    callbackURL: string
};

export class OAuthTemplate extends BaseTemplate {
    constructor() {
        super();

        this._settings['apiUrl'] = '';
        this._settings['clientID'] = '';
        this._settings['clientSecret'] = '';
        this._settings['callbackURL'] = '/auth/google/callback';
    }
}