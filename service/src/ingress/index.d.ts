import express from 'express'
import passport from 'passport'
import provision from '../provision'

declare namespace AuthenticationInitializer {
  export interface AuthenticationStrategy {

  }

  export interface AuthLayer {
    passport: passport.PassportStatic
  }
}

declare class AuthenticationInitializer {

  static app: express.Application
  static passport: passport.PassportStatic
  static provision: provision.ProvisionStatic

  static initialize(app: express.Application, passport: passport.PassportStatic, provision: provision.ProvisionStatic): AuthenticationInitializer.AuthLayer
}

export = AuthenticationInitializer
