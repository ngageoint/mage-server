import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of } from 'rxjs'

import { AdminNavComponent } from './admin-nav'
import { AdminUserService } from '../services/admin-user.service'

describe('AdminNavComponent', () => {
  let component: AdminNavComponent
  let fixture: ComponentFixture<AdminNavComponent>
  let mockUserService: jasmine.SpyObj<AdminUserService>
  let mockRouter: { url: string }

  beforeEach(() => {
    mockRouter = { url: '/dashboard' }

    mockUserService = jasmine.createSpyObj<AdminUserService>('AdminUserService', [
      'checkLoggedInUser',
      'hasPermission'
    ], {
      myself$: of({ role: { permissions: ['UPDATE_SETTINGS', 'VIEW_USERS'] } })
    } as any)

    mockUserService.checkLoggedInUser.and.returnValue(of(void 0))
    mockUserService.hasPermission.and.callFake((perm: string) => perm === 'UPDATE_SETTINGS')

    TestBed.configureTestingModule({
      declarations: [AdminNavComponent],
      providers: [
        { provide: AdminUserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter }
      ]
    })

    fixture = TestBed.createComponent(AdminNavComponent)
    component = fixture.componentInstance
  })

  it('should parse JSON string inputs safely', () => {
    const result = (component as any).parseInput('[1,2,3]')
    expect(result).toEqual([1, 2, 3])
  })

  it('should return [] on invalid JSON', () => {
    const result = (component as any).parseInput('notjson')
    expect(result).toEqual([])
  })

  it('should return object if not a string', () => {
    const arr = [1, 2, 3]
    const result = (component as any).parseInput(arr)
    expect(result).toBe(arr)
  })

  it('should return true if user has permission', () => {
    expect(component.hasPermission('UPDATE_SETTINGS')).toBeTrue()
  })

  it('should return false if user lacks permission', () => {
    expect(component.hasPermission('DELETE_USERS')).toBeFalse()
  })

  it('should update nav item counts correctly', () => {
    component.inactiveUsers = [{}, {}]
    component.unregisteredDevices = [{}]
    component.pluginTabs = []
    component.stateName = 'admin.dashboard'

    component.ngOnChanges({} as any)

    const dashboard = component.navItems.find(i => i.route === '/dashboard')
    const users = component.navItems.find(i => i.route === '/users')
    const devices = component.navItems.find(i => i.route === '/devices')

    expect(dashboard?.count).toBe(3)
    expect(users?.count).toBe(2)
    expect(devices?.count).toBe(1)
  })

  it('should return true if router url matches a plugin state', () => {
    component.pluginTabs = [{ id: '1', state: 'pluginA', title: 'Plugin A' }]
    mockRouter.url = '/plugins/1/pluginA'
    expect(component.pluginActive).toBeTrue()
  })

  it('should return false if router url does not match a plugin state', () => {
    component.pluginTabs = [{ id: '1', state: 'pluginA', title: 'Plugin A' }]
    mockRouter.url = '/dashboard'
    expect(component.pluginActive).toBeFalse()
  })

  it('should return correct breadcrumb when plugin active', () => {
    component.pluginTabs = [{
      id: '1',
      state: 'pluginA',
      title: 'Plugin A',
      icon: { className: 'fa fa-rocket' }
    }]
    mockRouter.url = '/plugins/1/pluginA'

    const crumbs = component.pluginBreadcrumbs
    expect(crumbs.length).toBe(1)
    expect(crumbs[0].title).toBe('Plugin A')
    expect(crumbs[0].iconClass).toBe('fa fa-rocket')
  })

  it('should return empty array when no active plugin', () => {
    component.pluginTabs = []
    mockRouter.url = '/dashboard'
    expect(component.pluginBreadcrumbs).toEqual([])
  })

  it('should emit pluginActiveChange correctly on changes', () => {
    spyOn(component.pluginActiveChange, 'emit')
    component.pluginTabs = [{ id: '1', state: 'pluginA', title: 'Plugin A' }]
    mockRouter.url = '/plugins/1/pluginA'

    component.ngOnChanges({} as any)
    expect(component.pluginActiveChange.emit).toHaveBeenCalledWith(true)
  })

  it('should toggle drawer open/closed', () => {
    expect(component.drawerOpen).toBeFalse()
    component.toggleDrawer()
    expect(component.drawerOpen).toBeTrue()
    component.toggleDrawer()
    expect(component.drawerOpen).toBeFalse()
  })

  it('should close drawer', () => {
    component.drawerOpen = true
    component.closeDrawer()
    expect(component.drawerOpen).toBeFalse()
  })

  it('should build plugin router link', () => {
    const link = component.pluginRouterLink({ id: '99', state: 'pluginX', title: 'Plugin X' })
    expect(link).toEqual(['/plugins', '99'])
  })
})
