export interface AdminChoice {
    title: string,
    description: string,
    value: boolean
}

export interface Strategy {
    _id?: string,
    isDirty?: boolean,
    enabled: boolean, 
    name: string,
    type: string,
    title?: string,
    textColor: string,
    buttonColor: string,
    icon?: any,
    settings: any
}