import { Strategy } from '../admin-settings.model';
import { StrategyValidator } from './strategy-validator';

export class CreateValidator implements StrategyValidator {

    readonly requiredOAuthSettings = ['clientsecret', 'clientid', 'callbackurl'];
    invalidSettings: string[];

    isValid(strategy: Strategy): boolean {
        this.invalidSettings = [];
        let isValid = strategy.type.length > 0 && strategy.name.length > 0;

        switch (strategy.type) {
            case 'oauth':
                isValid = isValid && this.validateOAuthSettings(strategy);
                break;
            default:
                break;
        }

        return isValid;
    }

    private validateOAuthSettings(strategy: Strategy): boolean {
        let isValid = false;

        if (strategy.settings) {
            let requiredPropertiesFound = 0;
            this.requiredOAuthSettings.forEach(setting => {
                let found = false;
                Object.keys(strategy.settings).forEach(key => {
                    if (key.toLowerCase() === setting) {
                        if (strategy.settings[key]) {
                            found = true;
                        }
                    }
                });
                if (found) {
                    requiredPropertiesFound++;
                } else {
                    this.invalidSettings.push(setting);
                }
            });
            isValid = requiredPropertiesFound >= this.requiredOAuthSettings.length;
        }

        return isValid;
    }

    invalidKeys(): string[] {
        return this.invalidSettings;
    }
}