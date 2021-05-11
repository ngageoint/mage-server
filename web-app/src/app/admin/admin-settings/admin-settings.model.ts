export interface AdminChoice {
    title: string,
    description: string,
    value: boolean
}

export interface MaxLock {
    enabled: boolean
}

export interface Strategy {
    state?: StrategyState,
    enabled: boolean, 
    name: string,
    type: string,
    settings: any
}

export enum StrategyState {
    New,
    Removed
}