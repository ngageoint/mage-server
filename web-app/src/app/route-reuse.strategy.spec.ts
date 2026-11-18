import { ActivatedRouteSnapshot, Params, Route } from '@angular/router'
import { RouteReuse, RouteReuseByComponentStrategy } from './route-reuse.strategy'

class RecreatedComponent {
  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange
}

class ReusedComponent {
  static readonly routeReuse: RouteReuse = RouteReuse.Reuse
}

class DefaultComponent {}

describe('RouteReuseByComponentStrategy', () => {
  let strategy: RouteReuseByComponentStrategy

  const recreatedRoute: Route = { path: 'recreated/:id', component: RecreatedComponent }
  const reusedRoute: Route = { path: 'reused/:id', component: ReusedComponent }
  const defaultRoute: Route = { path: 'default/:id', component: DefaultComponent }

  const snapshot = (routeConfig: Route, params: Params): ActivatedRouteSnapshot =>
    ({ routeConfig, params } as unknown as ActivatedRouteSnapshot)

  beforeEach(() => {
    strategy = new RouteReuseByComponentStrategy()
  })

  it('should not reuse when the route config differs', () => {
    expect(strategy.shouldReuseRoute(
      snapshot(recreatedRoute, { id: '1' }),
      snapshot(defaultRoute, { id: '1' })
    )).toBeFalse()
  })

  describe('a component declaring RecreateOnParamChange', () => {
    it('should reuse when its params are unchanged', () => {
      expect(strategy.shouldReuseRoute(
        snapshot(recreatedRoute, { id: '1' }),
        snapshot(recreatedRoute, { id: '1' })
      )).toBeTrue()
    })

    it('should not reuse when a param changes', () => {
      expect(strategy.shouldReuseRoute(
        snapshot(recreatedRoute, { id: '2' }),
        snapshot(recreatedRoute, { id: '1' })
      )).toBeFalse()
    })

    it('should not reuse when a param is added', () => {
      expect(strategy.shouldReuseRoute(
        snapshot(recreatedRoute, { id: '1', childId: '2' }),
        snapshot(recreatedRoute, { id: '1' })
      )).toBeFalse()
    })
  })

  it('should reuse a component declaring reuse when a param changes', () => {
    expect(strategy.shouldReuseRoute(
      snapshot(reusedRoute, { id: '2' }),
      snapshot(reusedRoute, { id: '1' })
    )).toBeTrue()
  })

  it('should reuse a component without a declaration when a param changes', () => {
    expect(strategy.shouldReuseRoute(
      snapshot(defaultRoute, { id: '2' }),
      snapshot(defaultRoute, { id: '1' })
    )).toBeTrue()
  })
})
