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
        this._settings['clientID'] = '540217092991-vg4kgpfrdgp2ggshngapvt9oi0nds136.apps.googleusercontent.com';
        this._settings['clientSecret'] = 'eeCKRejj_xjaWuY37jhUB_j2';
        this._settings['callbackURL'] = '/auth/google/callback';
    }
}