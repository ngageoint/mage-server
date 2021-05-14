import { BaseTemplate } from './base-template';

export interface LoginGovSettings{
    loa: string,
    url: string,
    client_id: string,
    acr_values: string,
    redirect_uri: string,
    keyFile: string
};

export class LoginGovTemplate extends BaseTemplate {
    constructor() {
        super();

        this._settings['loa'] = '1';
        this._settings['url'] = '';
        this._settings['client_id'] = '';
        this._settings['acr_values'] = '';
        this._settings['redirect_uri'] = '';
        this._settings['keyFile'] = '';
    }
}