import { TestBed } from '@angular/core/testing'
import { SessionService } from './session.service'
import { LocalStorageService } from './local-storage.service'

class MockLocalStorageService {
  private store: Record<string, string | null> = {}

  getLocalItem = jasmine.createSpy('getLocalItem').and.callFake((key: string) => this.store[key] ?? null)
  setLocalItem = jasmine.createSpy('setLocalItem').and.callFake((key: string, value: string) => { this.store[key] = value })
  removeLocalItem = jasmine.createSpy('removeLocalItem').and.callFake((key: string) => { delete this.store[key] })
}

describe('SessionService', () => {
  let service: SessionService
  let localStorage: MockLocalStorageService

  beforeEach(() => {
    localStorage = new MockLocalStorageService()

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: LocalStorageService, useValue: localStorage }
      ]
    })

    service = TestBed.inject(SessionService)
  })

  describe('constructor', () => {
    it('initializes token from localStorage', () => {
      localStorage.getLocalItem.and.returnValue('saved-token')

      TestBed.resetTestingModule()
      TestBed.configureTestingModule({
        providers: [SessionService, { provide: LocalStorageService, useValue: localStorage }]
      })
      service = TestBed.inject(SessionService)

      expect(service.getToken()).toBe('saved-token')
    })

    it('initializes with null token when nothing saved', () => {
      expect(service.getToken()).toBeNull()
    })
  })

  describe('setToken', () => {
    it('persists token to localStorage', () => {
      service.setToken('abc123')
      expect(localStorage.setLocalItem).toHaveBeenCalledWith('token', 'abc123')
    })

    it('updates token$ observable', (done) => {
      service.token$.subscribe(token => {
        if (token === 'abc123') {
          done()
        }
      })
      service.setToken('abc123')
    })

    it('getToken returns the new value', () => {
      service.setToken('xyz')
      expect(service.getToken()).toBe('xyz')
    })
  })

  describe('setUser / user getter', () => {
    it('user returns null before setUser', () => {
      expect(service.user).toBeNull()
    })

    it('user returns the set value', () => {
      const user = { id: 1, role: { name: 'USER_ROLE', permissions: [] } }
      service.setUser(user)
      expect(service.user).toEqual(user)
    })

    it('user$ emits when setUser is called', (done) => {
      const user = { id: 2 }
      service.user$.subscribe(u => {
        if (u?.id === 2) done()
      })
      service.setUser(user)
    })
  })

  describe('amAdmin', () => {
    it('returns false when no user is set', () => {
      expect(service.amAdmin).toBeFalse()
    })

    it('returns true for ADMIN_ROLE', () => {
      service.setUser({ role: { name: 'ADMIN_ROLE' } })
      expect(service.amAdmin).toBeTrue()
    })

    it('returns true for EVENT_MANAGER_ROLE', () => {
      service.setUser({ role: { name: 'EVENT_MANAGER_ROLE' } })
      expect(service.amAdmin).toBeTrue()
    })

    it('returns false for USER_ROLE', () => {
      service.setUser({ role: { name: 'USER_ROLE' } })
      expect(service.amAdmin).toBeFalse()
    })
  })

  describe('hasPermission', () => {
    it('returns false when no user is set', () => {
      expect(service.hasPermission('READ_OBSERVATION')).toBeFalse()
    })

    it('returns true when user has the permission', () => {
      service.setUser({ role: { permissions: ['READ_OBSERVATION', 'CREATE_OBSERVATION'] } })
      expect(service.hasPermission('READ_OBSERVATION')).toBeTrue()
    })

    it('returns false when user lacks the permission', () => {
      service.setUser({ role: { permissions: ['READ_OBSERVATION'] } })
      expect(service.hasPermission('DELETE_OBSERVATION')).toBeFalse()
    })
  })

  describe('clearSession', () => {
    it('removes token from localStorage', () => {
      service.clearSession()
      expect(localStorage.removeLocalItem).toHaveBeenCalledWith('token')
    })

    it('clears token to null', () => {
      service.setToken('tok')
      service.clearSession()
      expect(service.getToken()).toBeNull()
    })

    it('clears user to null', () => {
      service.setUser({ id: 1 })
      service.clearSession()
      expect(service.user).toBeNull()
    })

    it('emits null on token$ and user$', (done) => {
      service.setToken('tok')
      service.setUser({ id: 1 })

      let tokenCleared = false
      let userCleared = false

      service.token$.subscribe(t => {
        if (t === null) { tokenCleared = true }
        if (tokenCleared && userCleared) done()
      })
      service.user$.subscribe(u => {
        if (u === null) { userCleared = true }
        if (tokenCleared && userCleared) done()
      })

      service.clearSession()
    })
  })
})
