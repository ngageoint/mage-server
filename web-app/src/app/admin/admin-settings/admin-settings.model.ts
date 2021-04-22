export interface Banner {
    headerTextColor: string,
    headerText: string
    headerBackgroundColor: string,
    footerTextColor: string,
    footerText: string,
    footerBackgroundColor: string,
    showHeader: boolean,
    showFooter: boolean
}

export interface Disclaimer {
    showDisclaimer: boolean,
    disclaimerTitle: string,
    disclaimerText: string
}

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