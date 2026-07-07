import { TestBed } from '@angular/core/testing'
import { Router, UrlTree } from '@angular/router'
import { of, throwError } from 'rxjs'
import { HomeGuard } from './home-guard.service'
import { UserService } from '../user/user.service'

describe('HomeGuard', () => {
  let guard: HomeGuard
  let userService: { getMyself: jasmine.Spy }
  let router: { createUrlTree: jasmine.Spy }
  let urlTree: UrlTree

  beforeEach(() => {
    urlTree = {} as UrlTree
    userService = { getMyself: jasmine.createSpy('getMyself') }
    router = { createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(urlTree) }

    TestBed.configureTestingModule({
      providers: [
        HomeGuard,
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router }
      ]
    })

    guard = TestBed.inject(HomeGuard)
  })

  it('allows activation when a user is authenticated', (done) => {
    userService.getMyself.and.returnValue(of({ id: 'user-1' }))

    guard.canActivate(null as any, null as any).subscribe(result => {
      expect(result).toBeTrue()
      expect(router.createUrlTree).not.toHaveBeenCalled()
      done()
    })
  })

  it('suppresses the interceptor auth dialog on the probe request', (done) => {
    userService.getMyself.and.returnValue(of(null))

    guard.canActivate(null as any, null as any).subscribe(() => {
      expect(userService.getMyself).toHaveBeenCalledWith({ suppressAuthDialog: true })
      done()
    })
  })

  it('redirects to /landing when no user is authenticated', (done) => {
    userService.getMyself.and.returnValue(of(null))

    guard.canActivate(null as any, null as any).subscribe(result => {
      expect(result).toBe(urlTree)
      expect(router.createUrlTree).toHaveBeenCalledWith(['/landing'])
      done()
    })
  })

  it('redirects to /landing when getMyself errors', (done) => {
    userService.getMyself.and.returnValue(throwError(() => new Error('unauthorized')))

    guard.canActivate(null as any, null as any).subscribe(result => {
      expect(result).toBe(urlTree)
      expect(router.createUrlTree).toHaveBeenCalledWith(['/landing'])
      done()
    })
  })
})
