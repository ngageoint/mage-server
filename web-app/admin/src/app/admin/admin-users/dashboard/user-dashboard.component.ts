import { Component, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';

import { StateService } from '@uirouter/angular';
import {
  LocalStorageService,
  UserService,
  UserPagingService
} from 'admin/src/app/upgrade/ajs-upgraded-providers';
import { User } from 'core-lib-src/user';
import { CreateUserModalComponent } from '../create-user/create-user.component';
import { Role } from '../user';
import { BulkUserComponent } from '../bulk-user/bulk-user.component';
import { TeamsService } from '../../admin-teams/teams-service';
import { Team } from '../../admin-teams/team';
import pLimit from 'p-limit';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';

type UserFilter = {
  limit?: number;
  page?: number;
  enabled?: boolean;
  active?: boolean;
};

@Component({
  selector: 'admin-users',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit {
  dataSource: User[] = [];
  displayedColumns: string[] = ['user'];

  userSearch: string = '';

  totalUsers = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

  token: string;
  error: string | null = null;

  hasUserCreatePermission = false;

  stateAndData: any;

  roles: Role[] = [];
  teams: Team[] = [];

  isBulkUploading = false;
  bulkProgress = {
    total: 0,
    completed: 0,
    failed: 0
  };
  bulkErrors: { user: any; error: string }[] = [];
  showErrorTable = false;
  isFinalizing = false;
  isFinished = false;

  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Users',
      iconClass: 'fa fa-user'
    }
  ];

  userStatusFilter: 'all' | 'active' | 'inactive' | 'disabled' = 'all';

  /**
   * Constructs the UserDashboardComponent with necessary services.
   * @param dialog Angular Material dialog service
   * @param router Angular router for navigation
   * @param localStorageService Service to access local storage
   * @param stateService UI-Router state service
   * @param teamService Service for fetching team data
   * @param userService Service for user operations
   * @param userPagingService Service for paginated user data
   */
  constructor(
    private dialog: MatDialog,
    private router: Router,
    private localStorageService: LocalStorageService,
    private stateService: StateService,
    @Inject(TeamsService) private teamService: TeamsService,
    @Inject(UserService) private userService,
    @Inject(UserPagingService) private userPagingService
  ) {
    this.token = this.localStorageService.getToken();
    this.stateAndData = this.userPagingService.constructDefault();
  }

  /**
   * Initializes component data and permissions.
   */
  ngOnInit(): void {
    this.initPermissions();
    this.refreshUsers();
    this.loadRoles();
    this.fetchTeams();
    window.addEventListener('beforeunload', this.beforeUnloadListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadListener);
  }

  beforeUnloadListener = (event: BeforeUnloadEvent) => {
    if (this.isBulkUploading) {
      event.preventDefault();
      event.returnValue = '';
      return event.returnValue;
    }
    return;
  };

  /**
   * Initializes permission flags for the current user.
   */
  private initPermissions(): void {
    const permissions = this.userService.myself.role?.permissions || [];
    this.hasUserCreatePermission = permissions.includes('CREATE_USER');
  }

  /**
   * Loads available user roles from the server.
   */
  private loadRoles(): void {
    this.userService.getRoles().then((roles: any[]) => {
      this.roles = roles;
    });
  }

  /**
   * Fetches team data for use in bulk user import.
   */
  private fetchTeams(): void {
    this.teamService
      .getTeams({
        limit: 9999,
        sort: { name: 1 },
        omit_event_teams: true
      })
      .subscribe((results) => {
        if (results?.length > 0) {
          this.teams = results[0].items;
        }
      });
  }

  getFilter(): UserFilter {
    const filterObject: UserFilter = {};

    filterObject.limit = this.pageSize;
    filterObject.page = this.pageIndex;
    if (this.userStatusFilter === 'all') return filterObject;

    if (this.userStatusFilter === 'disabled') {
      filterObject.active = true;
      filterObject.enabled = false;
    } else if (this.userStatusFilter === 'active') {
      filterObject.active = true;
    } else {
      filterObject.active = false;
    }

    return filterObject;
  }

  /**
   * Refreshes the paginated list of users.
   */
  refreshUsers(): Promise<void> {
    const state = this.stateAndData['all'];

    state.pageSize = this.pageSize;
    state.pageIndex = this.pageIndex;

    state.userFilter = this.getFilter();

    return this.userPagingService.refresh(this.stateAndData).then(() => {
      const users = this.userPagingService.users(state);
      this.dataSource = users;
      this.totalUsers = state.pageInfo.totalCount || 0;
    });
  }

  /**
   * Handles search input change.
   * @param term The search term entered by the user
   */
  onSearchTermChanged(term: string): void {
    this.userSearch = term;
    this.pageIndex = 0;
    this.search();
  }

  /**
   * Clears the current search and refreshes the user list.
   */
  onSearchCleared(): void {
    this.userSearch = '';
    this.refreshUsers();
  }

  /**
   * Executes a search query on the user list.
   */
  search(): void {
    this.stateAndData['all'].userFilter.active = this.getFilter();

    this.userPagingService
      .search(this.stateAndData['all'], this.userSearch)
      .then((users) => {
        this.dataSource = users;
        this.totalUsers =
          this.stateAndData['all'].pageInfo.totalCount || users.length;
      });
  }

  /**
   * Resets the search and pagination state.
   */
  reset(): void {
    this.userSearch = '';
    this.stateAndData = this.userPagingService.constructDefault();
    this.pageIndex = 0;
    this.refreshUsers();
  }

  /**
   * Handles page change events from the paginator.
   * @param event The page event
   */
  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.refreshUsers();
  }

  /**
   * Navigates to the user creation page.
   */
  newUser(): void {
    this.router.navigate(['/admin/create-user']);
  }

  /**
   * Navigates to the bulk user import page.
   */
  bulkImport(): void {
    this.router.navigate(['/admin/bulk-user']);
  }

  /**
   * Navigates to a specific user's detail page.
   * @param user The user to navigate to
   */
  gotoUser(user: User): void {
    this.stateService.go('admin.user', { userId: user.id });
  }

  /**
   * Opens a modal to create a new user.
   */
  createUser(): void {
    const dialogRef = this.dialog.open(CreateUserModalComponent, {
      width: '80%',
      disableClose: true,
      data: { roles: this.roles }
    });

    dialogRef.afterClosed().subscribe((newUser) => {
      if (newUser?.confirmed) {
        new Promise((resolve, reject) => {
          this.userService.createUser(
            newUser.user,
            (user) => resolve(user),
            (err) => reject(err),
            null
          );
        })
          .catch((err) => {
            console.error(err);
          })
          .finally(() => {
            this.refreshUsers();
          });
      }
    });
  }

  /**
   * Opens a modal for bulk user import.
   */
  openImportModal(): void {
    const dialogRef = this.dialog.open(BulkUserComponent, {
      width: '80vw',
      data: {
        roles: this.roles,
        teams: this.teams
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.users?.length) {
        this.isBulkUploading = true;
        this.isFinalizing = false;
        this.bulkProgress = {
          total: result.users.length,
          completed: 0,
          failed: 0
        };

        this.bulkCreateUsers(result.users)
          .then(async (createdUsers) => {
            this.isFinalizing = true;

            if (result.selectedTeam) {
              await Promise.all(
                createdUsers.map((u) =>
                  this.teamService
                    .addUserToTeam(result.selectedTeam.id, u)
                    .toPromise()
                )
              );
            }
          })
          .finally(() => {
            this.refreshUsers().then(() => {
              this.isFinalizing = false;
              if (this.bulkErrors.length === 0) {
                this.isFinished = true;
              } else {
                this.showErrorTable = true;
              }
            });
          });
      }
    });
  }

  onStatusFilterChange(
    value: 'all' | 'active' | 'inactive' | 'disabled'
  ): void {
    this.userStatusFilter = value;
    this.pageIndex = 0;
    this.refreshUsers();
  }

  /**
   * Creates users in bulk via the user service.
   * @param users Array of user data to create
   * @returns A promise that resolves to the list of successfully created users
   */
  async bulkCreateUsers(users: any[]): Promise<User[]> {
    const usersAdded: User[] = [];
    this.bulkErrors = [];
    this.bulkProgress.total = users.length;
    this.bulkProgress.completed = 0;
    this.bulkProgress.failed = 0;

    const limit = pLimit(100);

    const tasks = users.map((userData) =>
      limit(
        () =>
          new Promise<void>((resolve) => {
            const success = (ret: any) => {
              usersAdded.push(ret);
              this.bulkProgress.completed++;
              resolve();
            };
            const error = (err: any) => {
              this.bulkProgress.failed++;
              this.bulkProgress.completed++;

              this.bulkErrors.push({
                user: userData,
                error: err?.responseText || 'Unknown error'
              });

              console.error(`Failed to create user ${userData.username}`, err);
              resolve();
            };

            this.userService.createUser(userData, success, error);
          })
      )
    );

    await Promise.allSettled(tasks);
    this.refreshUsers();
    return usersAdded;
  }

  getSuccessPercent(): number {
    const { completed, failed, total } = this.bulkProgress;
    if (total === 0) return 0;
    return ((completed - failed) / total) * 100;
  }

  getFailurePercent(): number {
    const { failed, total } = this.bulkProgress;
    if (total === 0) return 0;
    return (failed / total) * 100;
  }

  downloadErrorCSV(): void {
    const headers = ['Username', 'Email', 'Error'];
    const rows = this.bulkErrors.map((err) => [
      err.user.username || '',
      err.user.email || '',
      err.error
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', `bulk-upload-errors-${Date.now()}.csv`);
    link.click();
  }

  closeBulkUpload(): void {
    this.isBulkUploading = false;
    this.bulkErrors = [];
    this.bulkProgress = { total: 0, completed: 0, failed: 0 };
  }
}
