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
  icon: string
}

export interface Api {
  version: Version,
  initial: boolean,
  disclaimer: any,
  contanctInfo: any,
  localAuthenticationStrategy: AuthenticationStrategy,
  authenticationStrategies: { string: AuthenticationStrategy }
}
