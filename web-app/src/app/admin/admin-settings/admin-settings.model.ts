export interface AdminChoice {
    title: string,
    description: string,
    value: boolean
}

export interface Strategy {
    isDirty?: boolean,
    enabled: boolean, 
    name: string,
    type: string,
    settings: any
}