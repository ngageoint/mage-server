export class SettingsKeyHandler {
    flattenAndSet(key: string, value: any, settings: any): void {
        if (key.includes('.')) {
            const keys = key.split('.');
            settings[keys[0]][keys[1]] = value;
        } else {
            settings[key] = value;
        }
    }

    exists(key: string, settings: any): boolean {
        let duplicate = false;
        
        if (key.includes('.')) {
            const keys = key.split('.');
            duplicate = settings[keys[0]][keys[1]];
        } else {
            duplicate = settings[key];
        }

        return duplicate;
    }

    delete(key: string, settings: any): void {
        if (key.includes('.')) {
            const keys = key.split('.');
            delete settings[keys[0]][keys[1]];
        } else {
            delete settings[key];
        }
    }
}