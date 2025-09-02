import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { StateService } from '@uirouter/angular';
import { UserDetailsComponent } from './user-details.component';
import {
  UserService,
  LoginService,
  DevicePagingService,
  Team,
  LocalStorageService
} from '../../../upgrade/ajs-upgraded-providers';
import { TeamsService } from '../../admin-teams/teams-service';
import { EventsService } from '../../admin-event/events.service';

describe('UserDetailsComponent', () => {
  let component: UserDetailsComponent;
  let fixture: ComponentFixture<UserDetailsComponent>;

  const mockStateService = {
    params: { userId: 'test-user-id' },
    go: jasmine.createSpy('go')
  };

  const mockUser: any = {
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    active: true,
    enabled: true,
    phones: [{ number: '123-456-7890' }],
    role: { id: 'role-user', name: 'User' },
    authentication: { type: 'local' },
    iconUrl: '/api/icons/abc.png',
    lastUpdated: 123
  };

  const mockRoles = [
    { id: 'role-admin', name: 'Admin' },
    { id: 'role-user', name: 'User' }
  ];

  const mockUserService = {
    myself: { role: { permissions: ['UPDATE_USER', 'DELETE_USER', 'UPDATE_USER_ROLE'] } },
    getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ ...mockUser })),
    getRoles: jasmine.createSpy('getRoles').and.returnValue(Promise.resolve(mockRoles)),
    updateUser: jasmine.createSpy('updateUser').and.callFake((id: string, body: any, success?: Function, error?: Function) => {
      // Simulate success by returning updated user
      const updated = { ...mockUser, ...body };
      if (success) success(updated);
    }),
    deleteUser: jasmine.createSpy('deleteUser').and.returnValue(Promise.resolve()),
    updatePassword: jasmine.createSpy('updatePassword').and.callFake((_id: string, _auth: any) => Promise.resolve())
  };

  const mockLoginService = {
    query: jasmine.createSpy('query').and.callFake((opts: any) => {
      const page = {
        logins: opts && opts.url ? [{ id: 'log2', user: mockUser, timestamp: new Date().toISOString() }] : [{ id: 'log1', user: mockUser, timestamp: new Date().toISOString() }],
        prev: undefined,
        next: undefined
      };
      return Promise.resolve(page);
    })
  };

  const mockDevicePagingService = {
    constructDefault: jasmine.createSpy('constructDefault').and.returnValue({}),
    refresh: jasmine.createSpy('refresh').and.returnValue(Promise.resolve()),
    devices: jasmine.createSpy('devices').and.returnValue([]),
    search: jasmine.createSpy('search').and.returnValue(Promise.resolve([]))
  };

  const mockTeam = {
    addUser: jasmine.createSpy('addUser'),
    removeUser: jasmine.createSpy('removeUser')
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of({ confirmed: true })
    })
  };

  const mockTeamsService = {
    getTeams: jasmine.createSpy('getTeams').and.returnValue(of([{ items: [{ id: 't1', name: 'Team One' }], totalCount: 1 }]))
  } as unknown as TeamsService;

  const mockEventsService = {
    getEvents: jasmine.createSpy('getEvents').and.returnValue(of({ items: [{ id: 'e1', name: 'Event One' }], totalCount: 1 }))
  } as unknown as EventsService;

  const mockLocalStorageService = {
    getToken: jasmine.createSpy('getToken').and.returnValue('token-123')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [UserDetailsComponent],
      providers: [
        { provide: StateService, useValue: mockStateService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: UserService, useValue: mockUserService },
        { provide: LoginService, useValue: mockLoginService },
        { provide: DevicePagingService, useValue: mockDevicePagingService },
        { provide: Team, useValue: mockTeam },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: LocalStorageService, useValue: mockLocalStorageService }
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(UserDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and load user, roles, teams, events, devices, and logins', fakeAsync(() => {
    component.ngOnInit();
    tick();
    expect(mockUserService.getUser).toHaveBeenCalledWith('test-user-id');
    expect(mockUserService.getRoles).toHaveBeenCalled();
    expect(mockTeamsService.getTeams).toHaveBeenCalled();
    expect(mockEventsService.getEvents).toHaveBeenCalled();
    expect(mockLoginService.query).toHaveBeenCalled();
    expect(mockDevicePagingService.refresh).toHaveBeenCalled();
    // team/event data sources populated from mocks
    expect(component.userTeams.length).toBeGreaterThan(0);
    expect(component.userEvents.length).toBeGreaterThan(0);
    // first login set from initial query
    expect(component.firstLogin).toBeTruthy();
  }));

  it('should check user permissions', () => {
    component.ngOnInit();
    expect(component.hasUserEditPermission).toBe(true);
    expect(component.hasUserDeletePermission).toBe(true);
  });

  it('should compute icon class based on user agent/app version', () => {
    const base: any = { id: 'd1', uid: 'u', userAgent: '' };
    expect(component.iconClass({ ...base, appVersion: 'Web Client' } as any)).toContain('fa-desktop');
    expect(component.iconClass({ ...base, userAgent: 'Android 12' } as any)).toContain('fa-android');
    expect(component.iconClass({ ...base, userAgent: 'iOS 15' } as any)).toContain('fa-apple');
    expect(component.iconClass({ ...base, userAgent: 'Other' } as any)).toContain('fa-mobile');
  });

  it('should navigate to team and event', () => {
    component.gotoTeam({ id: 't1' });
    component.gotoEvent({ id: 'e1' });
    expect(mockStateService.go).toHaveBeenCalledWith('admin.team', { teamId: 't1' });
    expect(mockStateService.go).toHaveBeenCalledWith('admin.event', { eventId: 'e1' });
  });

  it('should toggle edit user state and update phone', () => {
    component.user = { ...mockUser };
    component.startEdit();
    expect(component.isEditingUser).toBeTrue();
    expect(component.editUser).toBeTruthy();
    component.updatePhoneNumber('999-999-9999');
    expect((component.editUser as any).phones[0].number).toBe('999-999-9999');
    component.cancelEdit();
    expect(component.isEditingUser).toBeFalse();
    expect(component.editUser).toBeNull();
  });

  it('should save user successfully and reset edit state', fakeAsync(() => {
    component.user = { ...mockUser };
    component.startEdit();
    (component.editUser as any).selectedRole = mockRoles[0];
    component.saveUser();
    tick();
    expect(mockUserService.updateUser).toHaveBeenCalled();
    expect(component.isEditingUser).toBeFalse();
    expect(component.editUser).toBeNull();
    expect(component.error).toBeNull();
  }));

  it('should handle save errors', fakeAsync(() => {
    const erring = {
      ...mockUserService,
      updateUser: jasmine.createSpy('updateUser').and.callFake((_id: string, _body: any, _s: Function, e: Function) => {
        e({ responseText: 'boom' });
      })
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [UserDetailsComponent],
      providers: [
        { provide: StateService, useValue: mockStateService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: UserService, useValue: erring },
        { provide: LoginService, useValue: mockLoginService },
        { provide: DevicePagingService, useValue: mockDevicePagingService },
        { provide: Team, useValue: mockTeam },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: LocalStorageService, useValue: mockLocalStorageService }
      ]
    }).compileComponents();
    const fix = TestBed.createComponent(UserDetailsComponent);
    const comp = fix.componentInstance;
    comp.user = { ...mockUser };
    comp.startEdit();
    comp.saveUser();
    tick();
    expect(comp.error).toBe('boom');
  }));

  it('should search logins and inject "No Results Found" when empty', fakeAsync(() => {
    component.searchLogins('something').then(results => {
      expect(results.length).toBe(1);
      expect(results[0].userAgent).toBe('No Results Found');
    });
    tick();
    expect(component.isSearchingDevices).toBeFalse();
  }));

  it('should page logins and update flags', fakeAsync(() => {
    component.ngOnInit();
    tick();
    component.pageLogin('/next');
    tick();
    expect(component.loginPage).toBeTruthy();
    expect(component.showNext).toBeTrue();
  }));

  it('should open confirm dialog and delete user on confirm', fakeAsync(() => {
    component.user = { ...mockUser };
    component.confirmDeleteUser(component.user as any);
    tick();
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockUserService.deleteUser).toHaveBeenCalledWith(component.user);
    expect(mockStateService.go).toHaveBeenCalledWith('admin.users');
  }));

  it('should compute authenticated user icon URL', fakeAsync(() => {
    component.user = { ...mockUser };
    const url = component.userIconImgUrl;
    expect(url).toContain('access_token=');
    expect(url).toContain('_dc=');
  }));
});
