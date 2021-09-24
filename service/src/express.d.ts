import express from 'express'
import AuthenticationInitializer from './authentication'

declare const expressApp: {
  app: express.Application,
  auth: ReturnType<typeof AuthenticationInitializer['initialize']>
}

export = expressApp