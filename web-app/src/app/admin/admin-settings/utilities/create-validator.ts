import { Strategy } from '../admin-settings.model';
import { StrategyValidator } from './strategy-validator';

export class CreateValidator implements StrategyValidator {

    isValid(strategy: Strategy): boolean {
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
        let isValid = true;

        if (strategy.settings) {
            const numberOfRequiredProperties = 1;
            let requiredPropertiesFound = 0;
            Object.keys(strategy.settings).forEach(key => {
                if (key.toLowerCase() === 'callbackurl') {
                    requiredPropertiesFound++;
                }
            });
            isValid = requiredPropertiesFound >= numberOfRequiredProperties;
        } else {
            isValid = false;
        }

        return isValid;
    }
}