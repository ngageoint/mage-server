import express from 'express'
import authentication from '../authentication'

/**
 * Add routes to the given MAGE Express Application instance.
 */
export interface MageRouteDefinitions {
  (app: express.Application, security: { authentication: authentication.AuthLayer }): void
}