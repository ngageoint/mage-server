import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminNavComponent } from './admin-nav';
import { UserService } from '../../upgrade/ajs-upgraded-providers';

describe('AdminNavComponent', () => {
  let component: AdminNavComponent;
  let fixture: ComponentFixture<AdminNavComponent>;
  let mockUserService: any;
  let mockState: any;

  beforeEach(() => {
    mockState = { go: jasmine.createSpy('go') };
    mockUserService = {
      myself: { role: { permissions: ['UPDATE_SETTINGS', 'VIEW_USERS'] } }
    };

    TestBed.configureTestingModule({
      declarations: [AdminNavComponent],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: '$injector', useValue: { get: () => mockState } }
      ]
    });

    fixture = TestBed.createComponent(AdminNavComponent);
    component = fixture.componentInstance;
  });

  it('should parse JSON string inputs safely', () => {
    const result = (component as any).parseInput('[1,2,3]', 'test');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should return [] on invalid JSON', () => {
    const result = (component as any).parseInput('notjson', 'test');
    expect(result).toEqual([]);
  });

  it('should return object if not a string', () => {
    const arr = [1, 2, 3];
    const result = (component as any).parseInput(arr, 'test');
    expect(result).toBe(arr);
  });

  it('should return true if user has permission', () => {
    expect(component.hasPermission('UPDATE_SETTINGS')).toBeTrue();
  });

  it('should return false if user lacks permission', () => {
    expect(component.hasPermission('DELETE_USERS')).toBeFalse();
  });

  it('should update nav item counts correctly', () => {
    component.inactiveUsers = [{}, {}];
    component.unregisteredDevices = [{}];
    component.pluginTabs = [];
    component.stateName = 'admin.dashboard';

    component.ngOnChanges({});

    const dashboard = component.navItems.find(i => i.state === 'admin.dashboard');
    const users = component.navItems.find(i => i.state === 'admin.users');
    const devices = component.navItems.find(i => i.state === 'admin.devices');

    expect(dashboard.count).toBe(3);
    expect(users.count).toBe(2);
    expect(devices.count).toBe(1);
  });

  it('should return true if state matches a plugin', () => {
    component.pluginTabs = [{ id: '1', state: 'admin.pluginA', title: 'Plugin A' }];
    component.stateName = 'admin.pluginA';
    expect(component.pluginActive).toBeTrue();
  });

  it('should return false if state not in plugin list', () => {
    component.pluginTabs = [{ id: '1', state: 'admin.pluginA', title: 'Plugin A' }];
    component.stateName = 'admin.dashboard';
    expect(component.pluginActive).toBeFalse();
  });

  it('should return correct breadcrumb when plugin active', () => {
    component.pluginTabs = [{
      id: '1',
      state: 'admin.pluginA',
      title: 'Plugin A',
      icon: { className: 'fa fa-rocket' }
    }];
    component.stateName = 'admin.pluginA';
    const crumbs = component.pluginBreadcrumbs;
    expect(crumbs.length).toBe(1);
    expect(crumbs[0].title).toBe('Plugin A');
    expect(crumbs[0].iconClass).toBe('fa fa-rocket');
  });

  it('should return empty array when no active plugin', () => {
    component.pluginTabs = [];
    expect(component.pluginBreadcrumbs).toEqual([]);
  });

  it('should emit pluginActiveChange correctly on state change', () => {
    spyOn(component.pluginActiveChange, 'emit');
    component.pluginTabs = [{ id: '1', state: 'admin.pluginA', title: 'Plugin A' }];
    component.stateName = 'admin.pluginA';

    component.ngOnChanges({});
    expect(component.pluginActiveChange.emit).toHaveBeenCalledWith(true);
  });

  it('should navigate when route is different', () => {
    component.stateName = 'admin.dashboard';
    component.onClick('admin.users');
    expect(mockState.go).toHaveBeenCalledWith('admin.users');
    expect(component.drawerOpen).toBeFalse();
  });

  it('should not navigate if already on route', () => {
    mockState.go.calls.reset();
    component.stateName = 'admin.users';
    component.onClick('admin.users');
    expect(mockState.go).not.toHaveBeenCalled();
  });
});
