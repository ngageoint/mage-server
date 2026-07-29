import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core';
import { UserDashboardComponent } from './user-dashboard.component';
import { BulkUserComponent } from '../bulk-user/bulk-user.component';
import {
  MatDialog as MatDialog,
  MatDialogRef as MatDialogRef
} from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { UserPagingService } from '../../services/user-paging.service';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { of, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { MatTableModule as MatTableModule } from '@angular/material/table';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule as MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserService } from '../../../user/user.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { AdminToastService } from '../../services/admin-toast.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

@Component({
    selector: 'user-avatar',
    template: '',
    standalone: false
})
class MockUserAvatarComponent {
  @Input() user: any;
}

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
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let pagingServiceSpy: jasmine.SpyObj<UserPagingService>;
  let teamsServiceSpy: jasmine.SpyObj<AdminTeamsService>;
  let toastSpy: jasmine.SpyObj<AdminToastService>;
  let sessionServiceSpy: { hasPermission: jasmine.Spy };

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    toastSpy = jasmine.createSpyObj('AdminToastService', ['show']);

    sessionServiceSpy = {
      hasPermission: jasmine.createSpy('hasPermission').and.callFake(
        (permission: string) => ['CREATE_USER', 'UPDATE_USER', 'DELETE_USER'].includes(permission)
      )
    };

    userServiceSpy = jasmine.createSpyObj<UserService>(
      'UserService',
      ['getRoles', 'createUser']
    ) as any;

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
        RouterTestingModule,
        MatIconModule,
        MatOptionModule,
        MatTableModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatListModule,
        MatSelectModule,
        MatPaginatorModule,
        MatChipsModule,
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule
      ],
      declarations: [UserDashboardComponent, MockUserAvatarComponent],
      providers: [
        { provide: MatDialog, useValue: dialogSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: SessionService, useValue: sessionServiceSpy },
        { provide: UserPagingService, useValue: pagingServiceSpy },
        { provide: AdminTeamsService, useValue: teamsServiceSpy },
        { provide: AdminToastService, useValue: toastSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(UserDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize permissions based on session permissions', () => {
    expect(component.hasUserCreatePermission).toBeTrue();

    sessionServiceSpy.hasPermission.and.returnValue(false);
    expect(component.hasUserCreatePermission).toBeFalse();
  });

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
  
  it('should log error when search fails', fakeAsync(() => {
    const consoleSpy = spyOn(console, 'error').and.stub();

    pagingServiceSpy.search.and.returnValue(
      throwError(() => new Error('nope'))
    );

    component.onSearchTermChanged('x');
    tick();

    expect(consoleSpy).toHaveBeenCalled();
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

  it('should refresh users and toast when the create user modal returns a created user', fakeAsync(() => {
    const dialogRef = {
      afterClosed: () => of({ id: 'new-id', username: 'x' })
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);

    const refreshSpy = spyOn(component, 'refreshUsers').and.callThrough();

    component.createUser();
    tick();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalled();
    expect(toastSpy.show).toHaveBeenCalled();
  }));

  it('should not refresh or toast when the create user modal is cancelled', fakeAsync(() => {
    const dialogRef = {
      afterClosed: () => of(null)
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);

    const refreshSpy = spyOn(component, 'refreshUsers').and.callThrough();

    component.createUser();
    tick();

    expect(refreshSpy).not.toHaveBeenCalled();
    expect(toastSpy.show).not.toHaveBeenCalled();
  }));

  it('should open the bulk user import modal with roles and teams', fakeAsync(() => {
    const dialogRef = {
      afterClosed: () => of(undefined)
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);

    component.openImportModal();
    tick();

    expect(dialogSpy.open).toHaveBeenCalledWith(
      BulkUserComponent,
      jasmine.objectContaining({
        data: { roles: component.roles, teams: component.teams }
      })
    );
  }));

  it('should refresh users when the import modal reports an import', fakeAsync(() => {
    const dialogRef = {
      afterClosed: () => of({ imported: true })
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);
    const refreshSpy = spyOn(component, 'refreshUsers').and.callThrough();

    component.openImportModal();
    tick();

    expect(refreshSpy).toHaveBeenCalled();
  }));

  it('should not refresh users when the import modal is closed without importing', fakeAsync(() => {
    const dialogRef = {
      afterClosed: () => of(undefined)
    } as Partial<MatDialogRef<any>> as MatDialogRef<any>;

    dialogSpy.open.and.returnValue(dialogRef);
    const refreshSpy = spyOn(component, 'refreshUsers').and.callThrough();

    component.openImportModal();
    tick();

    expect(refreshSpy).not.toHaveBeenCalled();
  }));

  it('should complete destroy$ on destroy', () => {
    component.ngOnDestroy();
  });
});
