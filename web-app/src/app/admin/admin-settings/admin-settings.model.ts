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

export interface AdminChoice {
    title: string,
    description: string,
    value: boolean
}

export interface MaxLock {
    enabled: boolean
}