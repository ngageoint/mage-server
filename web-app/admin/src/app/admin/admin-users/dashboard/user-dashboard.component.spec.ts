import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { UserDashboardComponent } from './user-dashboard.component';
import { UserPagingService } from 'admin/src/app/services/user-paging.service';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { LocalStorageService } from 'src/app/http/local-storage.service';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminToastService } from '../../services/admin-toast.service';

describe('UserDashboardComponent', () => {
  let component: UserDashboardComponent;

  const testUsers = [
    {
      id: '1',
      username: 'ranma77',
      displayName: 'Ranma Saotome',
      active: true,
      enabled: true,
      authentication: 'LOCAL',
      createdAt: new Date().toDateString(),
      lastUpdated: new Date().toDateString(),
      recentEventIds: [],
      role: 'martial artist',
      email: 'ranma@example.com',
      phones: []
    },
    {
      id: '2',
      username: 'yusuke23',
      displayName: 'Yusuke Urameshi',
      active: true,
      enabled: true,
      authentication: 'LOCAL',
      createdAt: new Date().toDateString(),
      lastUpdated: new Date().toDateString(),
      recentEventIds: [],
      role: 'spirit detective',
      email: 'yusuke@example.com',
      phones: []
    },
    {
      id: '3',
      username: 'goku_saiyan',
      displayName: 'Goku',
      active: true,
      enabled: true,
      authentication: 'LOCAL',
      createdAt: new Date().toDateString(),
      lastUpdated: new Date().toDateString(),
      recentEventIds: [],
      role: 'saiyan warrior',
      email: 'goku@example.com',
      phones: []
    }
  ] as any[];

  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let routerSpy: jasmine.SpyObj<Router>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let userServiceSpy: jasmine.SpyObj<AdminUserService>;
  let pagingServiceSpy: jasmine.SpyObj<UserPagingService>;
  let teamsServiceSpy: jasmine.SpyObj<AdminTeamsService>;
  let toastSpy: jasmine.SpyObj<AdminToastService>;
  let myself$: BehaviorSubject<any>;

  function setupSpies(): void {
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    routerSpy = jasmine.createSpyObj<Router>('Router', [
      'navigate',
      'navigateByUrl'
    ]);

    localStorageSpy = jasmine.createSpyObj<LocalStorageService>(
      'LocalStorageService',
      ['getToken']
    );
    localStorageSpy.getToken.and.returnValue('token123');

    toastSpy = jasmine.createSpyObj<AdminToastService>('AdminToastService', [
      'show'
    ]);

    myself$ = new BehaviorSubject<any>({
      role: {
        permissions: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER']
      }
    });

    userServiceSpy = jasmine.createSpyObj<AdminUserService>(
      'AdminUserService',
      ['getRoles', 'createUser']
    ) as any;

    Object.defineProperty(userServiceSpy, 'myself$', {
      get: () => myself$.asObservable()
    });

    userServiceSpy.getRoles.and.returnValue(
      of([
        {
          id: '1',
          name: 'Admin',
          permissions: []
        } as any
      ])
    );

    userServiceSpy.createUser.and.returnValue(
      of({
        id: 'created-id'
      } as any)
    );

    pagingServiceSpy = jasmine.createSpyObj<UserPagingService>(
      'UserPagingService',
      ['constructDefault', 'refresh', 'users', 'search']
    );

    pagingServiceSpy.constructDefault.and.returnValue({
      all: {
        pageInfo: {
          totalCount: 2
        },
        userFilter: {},
        pageSize: 10,
        pageIndex: 0
      }
    } as any);

    pagingServiceSpy.refresh.and.returnValue(of(undefined));
    pagingServiceSpy.users.and.callFake(() => testUsers as any);
    pagingServiceSpy.search.and.returnValue(of(testUsers as any));

    teamsServiceSpy = jasmine.createSpyObj<AdminTeamsService>(
      'AdminTeamsService',
      ['getTeams', 'addUserToTeam']
    );

    teamsServiceSpy.getTeams.and.returnValue(
      of({
        items: []
      } as any)
    );

    teamsServiceSpy.addUserToTeam.and.returnValue(of({} as any));

    spyOn(window, 'addEventListener').and.stub();
    spyOn(window, 'removeEventListener').and.stub();
  }

  function createComponent(runInit = true): void {
    component = new UserDashboardComponent(
      dialogSpy,
      routerSpy,
      localStorageSpy,
      teamsServiceSpy,
      userServiceSpy,
      pagingServiceSpy,
      toastSpy
    );

    if (runInit) {
      component.ngOnInit();
    }
  }

  beforeEach(() => {
    setupSpies();
    createComponent();
  });

  afterEach(() => {
    component.ngOnDestroy?.();
    myself$.complete();
  });

  it('should create component and initialize token', () => {
    expect(component).toBeTruthy();
    expect(component.token).toBe('token123');
    expect(window.addEventListener).toHaveBeenCalled();
  });

  it('should initialize permissions from myself$', () => {
    expect(component.hasUserCreatePermission).toBeTrue();

    myself$.next({
      role: {
        permissions: []
      }
    });

    expect(component.hasUserCreatePermission).toBeFalse();
  });

  it('should load roles on init', () => {
    expect(userServiceSpy.getRoles).toHaveBeenCalled();
    expect(component.roles.length).toBe(1);
    expect(component.roles[0].name).toBe('Admin');
  });

  it('should fetch teams on init', () => {
    expect(teamsServiceSpy.getTeams).toHaveBeenCalled();
    expect(component.teams).toEqual([]);
  });

  it('should refresh users and update dataSource/totalUsers', () => {
    component.refreshUsers();

    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
    expect(component.dataSource.length).toBe(3);
    expect(component.totalUsers).toBe(2);
  });

  it('should search and update user list', () => {
    component.onSearchTermChanged('user');

    expect(component.userSearch).toBe('user');
    expect(component.pageIndex).toBe(0);
    expect(pagingServiceSpy.search).toHaveBeenCalled();
    expect(component.dataSource.length).toBe(3);
  });

  it('should set error message when search fails', () => {
    spyOn(console, 'error').and.stub();

    pagingServiceSpy.search.and.returnValue(
      throwError(() => new Error('nope'))
    );

    component.onSearchTermChanged('x');

    expect(component.error).toBe('Search failed.');
  });

  it('should reset and refresh users', () => {
    pagingServiceSpy.constructDefault.calls.reset();
    pagingServiceSpy.refresh.calls.reset();

    component.reset();

    expect(component.userSearch).toBe('');
    expect(component.pageIndex).toBe(0);
    expect(pagingServiceSpy.constructDefault).toHaveBeenCalled();
    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
  });

  it('should handle pagination event and refresh users', () => {
    pagingServiceSpy.refresh.calls.reset();

    component.onPageChange({
      pageIndex: 1,
      pageSize: 25
    } as any);

    expect(component.pageIndex).toBe(1);
    expect(component.pageSize).toBe(25);
    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
  });

  it('should set userStatusFilter and refresh users when filter changes', () => {
    const refreshSpy = spyOn(component, 'refreshUsers').and.callThrough();

    component.onStatusFilterChange('active');

    expect(component.userStatusFilter).toBe('active');
    expect(component.pageIndex).toBe(0);
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should apply "active" filter', () => {
    component.userStatusFilter = 'active';

    const filter = component.getFilter();

    expect(filter.active).toBeTrue();
    expect(filter.enabled).toBeUndefined();
  });

  it('should apply "inactive" filter', () => {
    component.userStatusFilter = 'inactive';

    const filter = component.getFilter();

    expect(filter.active).toBeFalse();
    expect(filter.enabled).toBeUndefined();
  });

  it('should apply "disabled" filter', () => {
    component.userStatusFilter = 'disabled';

    const filter = component.getFilter();

    expect(filter.active).toBeTrue();
    expect(filter.enabled).toBeFalse();
  });

  it('should keep filter minimal for "all"', () => {
    component.userStatusFilter = 'all';

    const filter = component.getFilter();

    expect(filter.active).toBeUndefined();
    expect(filter.enabled).toBeUndefined();
  });

  it('should open create user modal and call createUser when confirmed', () => {
    const dialogRef = {
      afterClosed: () =>
        of({
          confirmed: true,
          user: {
            username: 'x'
          }
        })
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);

    const refreshSpy = spyOn(component, 'refreshUsers').and.callThrough();

    userServiceSpy.createUser.calls.reset();

    component.createUser();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(userServiceSpy.createUser).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalled();
    expect(toastSpy.show).toHaveBeenCalled();
  });

  it('should not call createUser when modal is not confirmed', () => {
    const dialogRef = {
      afterClosed: () =>
        of({
          confirmed: false
        })
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);

    userServiceSpy.createUser.calls.reset();
    toastSpy.show.calls.reset();

    component.createUser();

    expect(userServiceSpy.createUser).not.toHaveBeenCalled();
    expect(toastSpy.show).not.toHaveBeenCalled();
  });

  it('should compute success and failure percent safely', () => {
    component.bulkProgress = {
      total: 0,
      completed: 0,
      failed: 0
    };

    expect(component.getSuccessPercent()).toBe(0);
    expect(component.getFailurePercent()).toBe(0);

    component.bulkProgress = {
      total: 10,
      completed: 10,
      failed: 2
    };

    expect(component.getSuccessPercent()).toBe(80);
    expect(component.getFailurePercent()).toBe(20);
  });

  it('should close bulk upload and reset related state', () => {
    component.isBulkUploading = true;
    component.bulkErrors = [
      {
        user: {
          username: 'x'
        },
        error: 'e'
      }
    ];
    component.bulkProgress = {
      total: 2,
      completed: 2,
      failed: 1
    };
    component.showErrorTable = true;
    component.isFinalizing = true;
    component.isFinished = true;

    component.closeBulkUpload();

    expect(component.isBulkUploading).toBeFalse();
    expect(component.bulkErrors).toEqual([]);
    expect(component.bulkProgress).toEqual({
      total: 0,
      completed: 0,
      failed: 0
    });
    expect(component.showErrorTable).toBeFalse();
    expect(component.isFinalizing).toBeFalse();
    expect(component.isFinished).toBeFalse();
  });

  it('should remove window listener and complete destroy$ on destroy', () => {
    component.ngOnDestroy();

    expect(window.removeEventListener).toHaveBeenCalled();
  });
});
