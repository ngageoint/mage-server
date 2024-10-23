import express from 'express'
import { IdentityProvider } from './ingress.entities'

/**
 * `IngressProtocolWebBinding` is the binding of an authentication protocol's HTTP requests to an identity provider.
 * The protocol uses the identity provider settings to determine the identity provider's endpoints and orchestrate the
 * flow of HTTP messages between the Mage client, Mage server, and the identity provider's endpoints.
 */
export interface IngressProtocolWebBinding {
  readonly idp: IdentityProvider
  handleRequest: express.RequestHandler
}