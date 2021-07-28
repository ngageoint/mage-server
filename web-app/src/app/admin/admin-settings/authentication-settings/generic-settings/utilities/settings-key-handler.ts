export class SettingsKeyHandler {
    flattenAndSet(key: string, value: any, settings = {}): void {
        if (key.includes('.')) {
            const keys = key.split('.');
            if (!settings[keys[0]]) {
                settings[keys[0]] = {};
            }
            settings[keys[0]][keys[1]] = value;
        } else {
            settings[key] = value;
        }
    }

    exists(key: string, settings = {}): boolean {
        let duplicate = false;

        if (key.includes('.')) {
            const keys = key.split('.');
            if (settings[keys[0]] && settings[keys[0]][keys[1]]) {
                duplicate = true;
            }
        } else {
            if(settings[key]) {
                duplicate = true;
            }
        }

        return duplicate;
    }

    delete(key: string, settings = {}): void {
        if (key.includes('.')) {
            const keys = key.split('.');
            if (settings[keys[0]]) {
                delete settings[keys[0]][keys[1]];
                if(Object.keys(settings[keys[0]]).length == 0) {
                    delete settings[keys[0]];
                }
            }
        } else {
            delete settings[key];
        }
    }
}