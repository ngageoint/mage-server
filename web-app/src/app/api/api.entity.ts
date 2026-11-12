export interface Version {
  major: number,
  minor: number,
  micro: number
}

export interface AuthenticationStrategy {
  enabled: boolean,
  name: string,
  type: string,
  title: string,
  textColor: string,
  buttonColor: string,
  buttonText?: string,
  icon: string
}

export type Disclaimer = {
  show: boolean,
  title: string,
  text: string
}

export interface Api {
  version: Version,
  serverVersion: string,
  initial: boolean,
  disclaimer?: Disclaimer,
  contactInfo: any,
  localAuthenticationStrategy: AuthenticationStrategy,
  authenticationStrategies: { string: AuthenticationStrategy }
}

export function authenticationButtonText(title: string | undefined, buttonText?: string): string {
  const customText = buttonText?.trim()
  return customText ? customText : `Sign in with ${title ?? ''}`
}
