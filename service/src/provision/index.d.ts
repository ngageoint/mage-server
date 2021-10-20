import express from 'express'

type DeviceId = any
type CheckCallback = (err: Error | null, device?: any, info?: { message: string }) => any

declare namespace provision {
  export interface ProvisioningStrategy {
    readonly name: string
    readonly verify: (req: express.Request, uid: DeviceId, done: CheckCallback) => void
    check(req: express.Request, options: any, done: CheckCallback): void
  }

  export interface ProvisionStatic {
    use(name: string, strategy: ProvisioningStrategy): this
    use(strategy: ProvisioningStrategy): this
    check(authType: string, options: any, callback?: CheckCallback): express.RequestHandler
    check(authType: string, callback?: CheckCallback): express.RequestHandler
  }
}

declare const provision: provision.ProvisionStatic

export = provision