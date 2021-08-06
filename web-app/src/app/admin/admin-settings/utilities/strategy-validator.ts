import { Strategy } from '../admin-settings.model';

export interface StrategyValidator {
    isValid(strategy: Strategy): boolean;
}