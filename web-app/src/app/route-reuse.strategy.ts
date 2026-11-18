import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, Params } from '@angular/router'

/**
 * The route reuse options a routed component can declare as
 * `static readonly routeReuse = RouteReuse.…`, read by {@link RouteReuseByComponentStrategy}.
 */
export const RouteReuse = {
  /** Angular's default, keep the component and update its params */
  Reuse: 'reuse',
  /** Create a new component instance when its params change, e.g. editing an id in the URL */
  RecreateOnParamChange: 'recreateOnParamChange'
} as const

export type RouteReuse = typeof RouteReuse[keyof typeof RouteReuse]

type RoutedComponent = { routeReuse?: RouteReuse }

@Injectable()
export class RouteReuseByComponentStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (!super.shouldReuseRoute(future, curr)) {
      return false
    }

    const component = future.routeConfig?.component as RoutedComponent | undefined
    if (component?.routeReuse !== RouteReuse.RecreateOnParamChange) {
      return true
    }

    return paramsEqual(future.params, curr.params)
  }
}

function paramsEqual(a: Params, b: Params): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key])
}
