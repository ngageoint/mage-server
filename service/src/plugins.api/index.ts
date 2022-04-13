/**
 * `InjectionToken` is an interface that any value can implement.  A unique
 * symbol primitive is a good choice for a provider to use as an injection
 * token to ensure the token cannot be duplicated.  The unused generic
 * parameter serves only to denote the type that MAGE injects for the token.
 */
export interface InjectionToken<T> {
}

export type InjectedTypeOf<T> = T extends InjectionToken<infer S> ? S : never

export type InjectionRequest<Services> = {
  [key: string]: InjectionToken<Services>
}

export type Injection<Req extends InjectionRequest<any>> = {
  [key in keyof Req]: InjectedTypeOf<Req[key]>
}

/**
 * Export this structure from a plugin module to inject infrastructure
 * services from the core MAGE service.  This usually is to inject one or more
 * repositories to interact with the MAGE database.
 */
export type InitPluginHook<Req = undefined> =
  Req extends InjectionRequest<infer Services> ? {
    /**
     * Specify the services to inject with a dictionary of string keys to
     * {@link InjectionToken} values.
     */
    inject: InjectionRequest<Services>,
    /**
     * MAGE injects the {@link InitPluginHook.inject | requested services} in
     * the object argument to this method.  The keys of the object are the same
     * as those that {@link InitPluginHook.inject} define, and the values are
     * the services corresponding to the injection tokens associated with those
     * keys.
     *
     * This method can use the injected services to initialize more plugin hooks,
     * and return those hooks so MAGE can integrate them accordingly.
     */
    init(services: Injection<Req>): Promise<any>
  } : {
    inject?: undefined
    init(): Promise<any>
  }

import { EnsureJson } from '../entities/entities.json_types'

/**
 * `PluginStateRepository` is a basic repository that supports persistence of a
 * single JSON document that MAGE ties to a plugin ID.  Plugins can use this
 * repository to store and update configuration or whatever snapshot-oriented
 * state the plugin requires.
 */
export interface PluginStateRepository<State extends object> {
  put(state: EnsureJson<State>): Promise<EnsureJson<State>>
  patch(state: Partial<EnsureJson<State>>): Promise<EnsureJson<State>>
  get(): Promise<EnsureJson<State> | null>
}

export const PluginStateRepositoryToken: InjectionToken<PluginStateRepository<any>> = Symbol('InjectPluginStateRepository')