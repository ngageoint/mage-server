import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { UserDashboardComponent } from './user-dashboard.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { UserPagingService } from 'admin/src/app/services/user-paging.service';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { LocalStorageService } from 'src/app/http/local-storage.service';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminToastService } from '../../services/admin-toast.service';

describe('UserDashboardComponent', () => {
  let component: UserDashboardComponent;
  let fixture: ComponentFixture<UserDashboardComponent>;

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

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    localStorageSpy = jasmine.createSpyObj('LocalStorageService', ['getToken']);
    localStorageSpy.getToken.and.returnValue('token123');

    toastSpy = jasmine.createSpyObj('AdminToastService', ['show']);

    myself$ = new BehaviorSubject<any>({
      role: { permissions: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER'] }
    });

    userServiceSpy = jasmine.createSpyObj<AdminUserService>(
      'AdminUserService',
      ['getRoles', 'createUser']
    ) as any;
    (userServiceSpy as any).myself$ = myself$.asObservable();

    userServiceSpy.getRoles.and.returnValue(
      of([{ id: '1', name: 'Admin', permissions: [] } as any])
    );
    userServiceSpy.createUser.and.returnValue(of({ id: 'created-id' } as any));

    pagingServiceSpy = jasmine.createSpyObj<UserPagingService>(
      'UserPagingService',
      ['constructDefault', 'refresh', 'users', 'search']
    );

    pagingServiceSpy.constructDefault.and.returnValue({
      all: {
        pageInfo: { totalCount: 2 },
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
    teamsServiceSpy.getTeams.and.returnValue(of({ items: [] } as any));
    teamsServiceSpy.addUserToTeam.and.returnValue(of({} as any));

    spyOn(window, 'addEventListener').and.stub();
    spyOn(window, 'removeEventListener').and.stub();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatOptionModule,
        MatTableModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatListModule
      ],
      declarations: [UserDashboardComponent],
      providers: [
        { provide: MatDialog, useValue: dialogSpy },
        { provide: Router, useValue: routerSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: AdminUserService, useValue: userServiceSpy },
        { provide: UserPagingService, useValue: pagingServiceSpy },
        { provide: AdminTeamsService, useValue: teamsServiceSpy },
        { provide: AdminToastService, useValue: toastSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and initialize token', () => {
    expect(component).toBeTruthy();
    expect(component.token).toBe('token123');
    expect(window.addEventListener).toHaveBeenCalled();
  });

  it('should initialize permissions from myself$', fakeAsync(() => {
    tick();
    expect(component.hasUserCreatePermission).toBeTrue();

    myself$.next({ role: { permissions: [] } });
    tick();
    expect(component.hasUserCreatePermission).toBeFalse();
  }));

  it('should load roles on init', fakeAsync(() => {
    tick();
    expect(userServiceSpy.getRoles).toHaveBeenCalled();
    expect(component.roles.length).toBe(1);
    expect(component.roles[0].name).toBe('Admin');
  }));

  it('should fetch teams on init', fakeAsync(() => {
    tick();
    expect(teamsServiceSpy.getTeams).toHaveBeenCalled();
    expect(component.teams).toEqual([]);
  }));

  it('should refresh users and update dataSource/totalUsers', fakeAsync(() => {
    component.refreshUsers();
    tick();

    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
    expect(component.dataSource.length).toBe(3);
    expect(component.totalUsers).toBe(2);
  }));

  it('should search and update user list', fakeAsync(() => {
    component.onSearchTermChanged('user');
    tick();

    expect(component.userSearch).toBe('user');
    expect(component.pageIndex).toBe(0);
    expect(pagingServiceSpy.search).toHaveBeenCalled();
    expect(component.dataSource.length).toBe(3);
  }));

  it('should set error message when search fails', fakeAsync(() => {
    pagingServiceSpy.search.and.returnValue(
      throwError(() => new Error('nope'))
    );

    component.onSearchTermChanged('x');
    tick();

    expect(component.error).toBe('Search failed.');
  }));

  it('should reset and refresh users', fakeAsync(() => {
    pagingServiceSpy.constructDefault.calls.reset();
    pagingServiceSpy.refresh.calls.reset();

    component.reset();
    tick();

    expect(component.userSearch).toBe('');
    expect(component.pageIndex).toBe(0);
    expect(pagingServiceSpy.constructDefault).toHaveBeenCalled();
    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
  }));

  it('should handle pagination event and refresh users', fakeAsync(() => {
    pagingServiceSpy.refresh.calls.reset();

    component.onPageChange({ pageIndex: 1, pageSize: 25 } as any);
    tick();

    expect(component.pageIndex).toBe(1);
    expect(component.pageSize).toBe(25);
    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
  }));

  it('should set userStatusFilter and refresh users when filter changes', fakeAsync(() => {
    const refreshSpy = spyOn(component, 'refreshUsers').and.callThrough();

    component.onStatusFilterChange('active');
    tick();

    expect(component.userStatusFilter).toBe('active');
    expect(component.pageIndex).toBe(0);
    expect(refreshSpy).toHaveBeenCalled();
  }));

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

  it('should open create user modal and call createUser when confirmed', fakeAsync(() => {
    const dialogRef = {
      afterClosed: () => of({ confirmed: true, user: { username: 'x' } })
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);

    const refreshSpy = spyOn(component, 'refreshUsers').and.callThrough();
    userServiceSpy.createUser.calls.reset();

    component.createUser();
    tick();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(userServiceSpy.createUser).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalled();
    expect(toastSpy.show).toHaveBeenCalled();
  }));

  it('should not call createUser when modal is not confirmed', fakeAsync(() => {
    const dialogRef = {
      afterClosed: () => of({ confirmed: false })
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);
    userServiceSpy.createUser.calls.reset();

    component.createUser();
    tick();

    expect(userServiceSpy.createUser).not.toHaveBeenCalled();
    expect(toastSpy.show).not.toHaveBeenCalled();
  }));

  it('should compute success and failure percent safely', () => {
    component.bulkProgress = { total: 0, completed: 0, failed: 0 };
    expect(component.getSuccessPercent()).toBe(0);
    expect(component.getFailurePercent()).toBe(0);

    component.bulkProgress = { total: 10, completed: 10, failed: 2 };
    expect(component.getSuccessPercent()).toBe(80);
    expect(component.getFailurePercent()).toBe(20);
  });

  it('should close bulk upload and reset related state', () => {
    component.isBulkUploading = true;
    component.bulkErrors = [{ user: { username: 'x' }, error: 'e' }];
    component.bulkProgress = { total: 2, completed: 2, failed: 1 };
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
