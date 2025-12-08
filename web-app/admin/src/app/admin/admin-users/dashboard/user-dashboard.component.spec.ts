import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick
} from '@angular/core/testing';
import { UserDashboardComponent } from './user-dashboard.component';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  LocalStorageService,
  UserService,
  UserPagingService
} from 'admin/src/app/upgrade/ajs-upgraded-providers';
import { TeamsService } from '../../admin-teams/teams-service';
import { StateService } from '@uirouter/angular';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';

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
  ];

  let dialogSpy: any;
  let routerSpy: any;
  let localStorageSpy: any;
  let userServiceSpy: any;
  let pagingServiceSpy: any;
  let teamsServiceSpy: any;
  let stateServiceSpy: any;
  let injectorSpy: any;

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    localStorageSpy = jasmine.createSpyObj('LocalStorageService', ['getToken']);
    localStorageSpy.getToken.and.returnValue('token123');

    userServiceSpy = {
      myself: {
        role: { permissions: ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER'] }
      },
      getRoles: jasmine
        .createSpy()
        .and.returnValue(Promise.resolve([{ name: 'Admin' }])),
      createUser: jasmine.createSpy().and.returnValue(Promise.resolve()),
      deleteUser: jasmine.createSpy().and.returnValue(Promise.resolve()),
      updateUser: jasmine.createSpy().and.returnValue(Promise.resolve())
    };

    pagingServiceSpy = {
      constructDefault: jasmine
        .createSpy()
        .and.returnValue({ all: { pageInfo: { totalCount: 2 } } }),
      refresh: jasmine.createSpy().and.callFake(() => Promise.resolve()),
      users: jasmine.createSpy().and.returnValue(testUsers),
      search: jasmine.createSpy().and.returnValue(Promise.resolve(testUsers))
    };

    teamsServiceSpy = {
      getTeams: jasmine.createSpy().and.returnValue(of([{ items: [] }])),
      addUserToTeam: jasmine.createSpy().and.returnValue(of({}))
    };

    stateServiceSpy = jasmine.createSpyObj('StateService', ['go']);

    injectorSpy = {
      get: (token: any) => (token === '$state' ? stateServiceSpy : null)
    };

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
        { provide: UserService, useValue: userServiceSpy },
        { provide: UserPagingService, useValue: pagingServiceSpy },
        { provide: TeamsService, useValue: teamsServiceSpy },
        { provide: StateService, useValue: stateServiceSpy },
        { provide: '$injector', useValue: injectorSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component and initialize state', () => {
    expect(component).toBeTruthy();
    expect(component.token).toBe('token123');
  });

  it('should load permissions and roles on init', fakeAsync(() => {
    component.ngOnInit();
    tick();
    expect(userServiceSpy.getRoles).toHaveBeenCalled();
    expect(component.roles.length).toBeGreaterThan(0);
    flush();
  }));

  it('should refresh users and update table data', fakeAsync(() => {
    component.refreshUsers();
    tick();
    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
    expect(component.dataSource.length).toBe(3);
    expect(component.totalUsers).toBe(2);
    flush();
  }));

  it('should search and update user list', fakeAsync(() => {
    component.onSearchTermChanged('user');
    tick();
    expect(pagingServiceSpy.search).toHaveBeenCalledWith(
      component.stateAndData['all'],
      'user'
    );
    expect(component.dataSource.length).toBe(3);
    flush();
  }));

  it('should reset search and refresh users', fakeAsync(() => {
    component.reset();
    tick();
    expect(pagingServiceSpy.constructDefault).toHaveBeenCalled();
    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
    flush();
  }));

  it('should handle pagination event and refresh', fakeAsync(() => {
    component.onPageChange({ pageIndex: 1, pageSize: 25 } as any);
    tick();
    expect(component.pageIndex).toBe(1);
    expect(component.pageSize).toBe(25);
    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
    flush();
  }));

  it('should navigate to create user page', () => {
    component.newUser();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/create-user']);
  });

  it('should navigate to bulk import page', () => {
    component.bulkImport();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/bulk-user']);
  });

  it('should open create user modal and call service', fakeAsync(() => {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of({ confirmed: true, user: {} })
    });

    component.createUser();
    tick();
    expect(userServiceSpy.createUser).toHaveBeenCalled();
    flush();
  }));

  it('should navigate to user detail on click', () => {
    component.gotoUser(testUsers[0] as any);
    expect(stateServiceSpy.go).toHaveBeenCalledWith('admin.user', {
      userId: '1'
    });
  });

  it('should set userStatusFilter and refresh users when filter changes', fakeAsync(() => {
    spyOn(component, 'refreshUsers').and.callThrough();

    component.onStatusFilterChange('active');
    expect(component.userStatusFilter).toBe('active');
    expect(component.pageIndex).toBe(0);
    expect(component.refreshUsers).toHaveBeenCalled();
    flush();
  }));

  it('should apply "active" filter in refreshUsers()', fakeAsync(() => {
    component.userStatusFilter = 'active';
    component.refreshUsers();
    tick();

    const state = component.stateAndData['all'];
    expect(state.userFilter.active).toBeTrue();
    expect(pagingServiceSpy.refresh).toHaveBeenCalled();
    flush();
  }));

  it('should apply "inactive" filter in refreshUsers()', fakeAsync(() => {
    component.userStatusFilter = 'inactive';
    component.refreshUsers();
    tick();

    const state = component.stateAndData['all'];
    expect(state.userFilter.active).toBeFalse();
    flush();
  }));

  it('should apply "disabled" filter in refreshUsers()', fakeAsync(() => {
    component.userStatusFilter = 'disabled';
    component.refreshUsers();
    tick();

    const state = component.stateAndData['all'];
    expect(state.userFilter.enabled).toBeFalse();
    flush();
  }));

  it('should clear filters for "all" option in refreshUsers()', fakeAsync(() => {
    component.userStatusFilter = 'all';
    component.refreshUsers();
    tick();

    const state = component.stateAndData['all'];
    expect(state.userFilter.active).toBeUndefined();
    expect(state.userFilter.disabled).toBeUndefined();
    flush();
  }));
});
