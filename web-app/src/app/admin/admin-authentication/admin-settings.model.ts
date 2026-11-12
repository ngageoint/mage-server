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
    buttonText?: string,
    icon?: any,
    settings: any
}

export const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function loginButtonError(strategy: Strategy): string | undefined {
    if (!strategy.buttonText?.trim()) {
        return 'Button text is required'
    }

    const invalidColor = (color?: string) => Boolean(color) && !HEX_COLOR.test(color)
    if (invalidColor(strategy.textColor) || invalidColor(strategy.buttonColor)) {
        return 'Button colors must be hex colors like #005CBB'
    }
    
    return undefined
}