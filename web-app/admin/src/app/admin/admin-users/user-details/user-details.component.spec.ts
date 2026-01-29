import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { UserDetailsComponent } from './user-details.component';
import { TeamService } from '../../../../app/services/team.service';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { AdminEventsService } from '../../services/admin-events.service';
import { AdminUserService } from '../../services/admin-user.service';
import { LocalStorageService } from '../../../../../../../web-app/src/app/http/local-storage.service';
import { LoginService } from '../../../services/login.service';
import { DevicePagingService } from '../../../services/device-paging.service';

describe('UserDetailsComponent', () => {
  let component: UserDetailsComponent;
  let fixture: ComponentFixture<UserDetailsComponent>;

  const mockUser: any = {
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    active: true,
    enabled: true,
    phones: [{ number: '123-456-7890' }],
    role: { id: 'role-user', name: 'User' },
    iconUrl: '/api/icons/abc.png',
    avatarUrl: '/api/avatars/def.png',
    lastUpdated: 123
  };

  const mockRoles = [
    { id: 'role-admin', name: 'Admin' },
    { id: 'role-user', name: 'User' }
  ];

  const myself$ = new BehaviorSubject<any>({
    id: 'me',
    role: { permissions: ['UPDATE_USER', 'DELETE_USER', 'UPDATE_USER_ROLE'] }
  });

  const mockUserService: Partial<AdminUserService> = {
    myself$,
    getMyself: jasmine
      .createSpy('getMyself')
      .and.returnValue(of(myself$.value)),
    getUser: jasmine.createSpy('getUser').and.returnValue(of({ ...mockUser })),
    getRoles: jasmine.createSpy('getRoles').and.returnValue(of(mockRoles)),
    updateUser: jasmine
      .createSpy('updateUser')
      .and.callFake((_id: string, body: any) => {
        const updated = { ...mockUser, ...body };
        return of(updated);
      }),
    deleteUser: jasmine.createSpy('deleteUser').and.returnValue(of(null)),
    updatePassword: jasmine
      .createSpy('updatePassword')
      .and.returnValue(of(null))
  };

  const mockLoginService: Partial<LoginService> = {
    query: jasmine.createSpy('query').and.callFake((opts: any) => {
      const page = {
        logins: opts?.url
          ? [
              {
                id: 'log2',
                user: mockUser,
                timestamp: new Date().toISOString()
              }
            ]
          : [
              {
                id: 'log1',
                user: mockUser,
                timestamp: new Date().toISOString()
              }
            ],
        prev: undefined,
        next: undefined
      };
      return Promise.resolve(page as any);
    })
  };

  const mockDevicePagingService: Partial<DevicePagingService> = {
    constructDefault: jasmine
      .createSpy('constructDefault')
      .and.returnValue({ all: {}, registered: {}, unregistered: {} }),
    refresh: jasmine.createSpy('refresh').and.returnValue(of(null)),
    devices: jasmine.createSpy('devices').and.returnValue([]),
    search: jasmine.createSpy('search').and.returnValue(of([]))
  };

  const mockTeamService: Partial<TeamService> = {
    addUser: jasmine
      .createSpy('addUser')
      .and.returnValue(of({ id: 't1', name: 'Team One' })),
    removeUser: jasmine.createSpy('removeUser').and.returnValue(of(null))
  };

  const mockTeamsService: Partial<AdminTeamsService> = {
    getTeams: jasmine
      .createSpy('getTeams')
      .and.returnValue(
        of([{ items: [{ id: 't1', name: 'Team One' }], totalCount: 1 }])
      )
  };

  const mockEventsService: Partial<AdminEventsService> = {
    getEvents: jasmine
      .createSpy('getEvents')
      .and.returnValue(
        of({ items: [{ id: 'e1', name: 'Event One' }], totalCount: 1 })
      )
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of({ confirmed: true })
    })
  };

  const mockLocalStorageService: Partial<LocalStorageService> = {
    getToken: jasmine.createSpy('getToken').and.returnValue('token-123')
  };

  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [UserDetailsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ userId: 'test-user-id' }))
          }
        },
        { provide: Router, useValue: routerSpy },
        { provide: MatDialog, useValue: mockDialog },
        { provide: AdminUserService, useValue: mockUserService },
        { provide: LoginService, useValue: mockLoginService },
        { provide: DevicePagingService, useValue: mockDevicePagingService },
        { provide: TeamService, useValue: mockTeamService },
        { provide: AdminTeamsService, useValue: mockTeamsService },
        { provide: AdminEventsService, useValue: mockEventsService },
        { provide: LocalStorageService, useValue: mockLocalStorageService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and load user/roles/teams/events/devices/logins', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(mockUserService.getRoles as jasmine.Spy).toHaveBeenCalled();
    expect(mockUserService.getUser as jasmine.Spy).toHaveBeenCalledWith(
      'test-user-id'
    );
    expect(mockTeamsService.getTeams as jasmine.Spy).toHaveBeenCalled();
    expect(mockEventsService.getEvents as jasmine.Spy).toHaveBeenCalled();
    expect(mockDevicePagingService.refresh as jasmine.Spy).toHaveBeenCalled();

    tick();

    expect(component.user).toBeTruthy();
    expect(component.userTeams.length).toBeGreaterThan(0);
    expect(component.userEvents.length).toBeGreaterThan(0);
    expect(component.firstLogin).toBeTruthy();
  }));

  it('should set permissions from myself$', fakeAsync(() => {
    component.ngOnInit();
    tick();

    expect(component.hasUserEditPermission).toBeTrue();
    expect(component.hasUserDeletePermission).toBeTrue();
    expect(component.canEditRole).toBeTrue();
    expect(component.canUpdatePassword).toBeTrue();
  }));

  it('should compute icon class based on user agent/app version', () => {
    const base: any = { id: 'd1', userAgent: '' };

    expect(
      component.iconClass({ ...base, appVersion: 'Web Client' } as any)
    ).toContain('fa-desktop');
    expect(
      component.iconClass({ ...base, userAgent: 'Android 12' } as any)
    ).toContain('fa-android');
    expect(
      component.iconClass({ ...base, userAgent: 'iOS 15' } as any)
    ).toContain('fa-apple');
    expect(
      component.iconClass({ ...base, userAgent: 'Other' } as any)
    ).toContain('fa-mobile');
  });

  it('should toggle edit user state and update phone', fakeAsync(() => {
    component.user = { ...mockUser };
    component.roles = [...mockRoles];
    component.canEditRole = true;

    component.startEdit();
    tick();

    expect(component.isEditingUser).toBeTrue();
    expect(component.editUser).toBeTruthy();

    component.updatePhoneNumber('999-999-9999');
    expect((component.editUser as any).phones[0].number).toBe('999-999-9999');

    component.cancelEdit();
    expect(component.isEditingUser).toBeFalse();
    expect(component.editUser).toBeNull();
  }));

  it('should save user successfully and reset edit state', fakeAsync(() => {
    component.user = { ...mockUser };
    component.roles = [...mockRoles];
    component.canEditRole = true;

    component.startEdit();
    (component.editUser as any).selectedRole = mockRoles[0];

    component.saveUser();
    tick();

    expect(mockUserService.updateUser as jasmine.Spy).toHaveBeenCalled();
    expect(component.isEditingUser).toBeFalse();
    expect(component.editUser).toBeNull();
    expect(component.error).toBeNull();
  }));

  it('should handle save errors', fakeAsync(() => {
    (mockUserService.updateUser as jasmine.Spy).and.returnValue(
      throwError(() => ({ error: 'boom' }))
    );

    component.user = { ...mockUser };
    component.startEdit();

    component.saveUser();
    tick();

    expect(component.error).toBe('boom');
    expect(component.saving).toBeFalse();
  }));

  it('should search logins and inject "No Results Found" when empty', fakeAsync(() => {
    (mockDevicePagingService.search as jasmine.Spy).and.returnValue(of([]));

    let got: any[] = [];
    component.searchLogins('something').subscribe((results) => (got = results));
    tick();

    expect(got.length).toBe(1);
    expect(got[0].userAgent).toBe('No Results Found');
    expect(component.isSearchingDevices).toBeFalse();
  }));

  it('should page logins and update paging flags', fakeAsync(() => {
    component.ngOnInit();
    tick();
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
    expect(mockUserService.deleteUser as jasmine.Spy).toHaveBeenCalledWith(
      'test-user-id'
    );

    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['../../users'],
      jasmine.objectContaining({
        relativeTo: jasmine.any(Object)
      })
    );
  }));

  it('should compute authenticated user icon/avatar URLs', () => {
    component.user = { ...mockUser };

    const iconUrl = component.userIconImgUrl as string;
    const avatarUrl = component.userAvatarImgUrl as string;

    expect(iconUrl).toContain('access_token=token-123');
    expect(iconUrl).toContain('_dc=123');

    expect(avatarUrl).toContain('access_token=token-123');
    expect(avatarUrl).toContain('_dc=123');
  });

  it('should clean up destroy$ on destroy', () => {
    const nextSpy = spyOn((component as any).destroy$, 'next');
    const completeSpy = spyOn((component as any).destroy$, 'complete');

    component.ngOnDestroy();

    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
