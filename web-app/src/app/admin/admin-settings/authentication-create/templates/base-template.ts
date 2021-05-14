export abstract class BaseTemplate {

    _settings: any = {};

    constructor() {
    }

    get settings() {
        return this._settings;
    }
}