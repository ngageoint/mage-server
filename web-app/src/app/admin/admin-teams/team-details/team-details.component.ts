import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource as MatTableDataSource } from '@angular/material/table';
import { User } from '@ngageoint/mage.web-core-lib/user'
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { Observable } from 'rxjs';
import { AdminEventsService } from '../../services/admin-events.service';
import { DeleteTeamComponent } from '../delete-team/delete-team.component';
import { CreateTeamDialogComponent } from '../create-team/create-team.component';
import {
  SearchModalComponent,
  SearchModalData,
  SearchModalResult,
  SearchModalColumn
} from '../../search-modal/search-modal.component';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { MageEvent } from 'mage-web-app/entities/event/entities.event'

@Component({
    selector: 'mage-team-details',
    templateUrl: './team-details.component.html',
    styleUrls: ['./team-details.component.scss'],
    standalone: false
})
export class TeamDetailsComponent implements OnInit, OnDestroy {
  team: Team | null = null;
  teamId = '';

  hasUpdatePermission = false;
  hasDeletePermission = false;

  private get myself(): any | null {
    return this.sessionService.user;
  }

  loadingMembers = true;
  membersPageIndex = 0;
  membersPageSize = 5;
  memberSearchTerm = '';
  membersDataSource = new MatTableDataSource<User>();
  membersDisplayedColumns = ['content'];
  totalMembers = 0;
  pageSizeOptions = [5, 10, 25];

  loadingEvents = true;
  teamEvents: MageEvent[] = [];
  teamEventsPage = 0;
  eventsPerPage = 5;
  eventSearch = '';
  teamEventSearch = '';
  filteredEvents: MageEvent[] = [];

  eventsDataSource = new MatTableDataSource<MageEvent>();
  eventsDisplayedColumns = ['content'];
  totalEvents = 0;
  eventsPageSize = 5;

  #breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Teams',
    icon: 'groups',
    route: ['/admin/teams']
  }];
  set breadcrumbs(value: AdminBreadcrumb[]) {
    this.#breadcrumbs = value;
    this.breadcrumbService.setBreadcrumbs(value);
  }
  get breadcrumbs(): AdminBreadcrumb[] {
    return this.#breadcrumbs;
  }

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>;

  private asId(value: any): string {
    if (!value) {
      return '';
    }
    return String(value);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private sessionService: SessionService,
    private teamService: TeamService,
    private eventsService: AdminEventsService,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    this.route.paramMap.subscribe((params) => {
      this.teamId = params.get('teamId') || '';
      if (!this.teamId) {
        return;
      }
      this.loadTeam();
    });
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
    this.snackBar.dismiss();
  }

  private loadTeam(): void {
    if (!this.teamId) {
      return;
    }

    this.teamService.getTeamById(this.teamId).subscribe((team: Team) => {
      this.team = team;
      const myId = this.myself?.id;
      const myAccess =
        myId && this.team?.acl ? this.team.acl[myId] ?? null : null;
      const aclPermissions: string[] = myAccess?.permissions || [];

      this.hasUpdatePermission =
        this.sessionService.hasPermission('UPDATE_TEAM') ||
        aclPermissions.includes('update');

      this.hasDeletePermission =
        this.sessionService.hasPermission('DELETE_TEAM') ||
        aclPermissions.includes('delete');

      this.getMembers();
      this.getTeamEvents();

      this.breadcrumbs = [{ title: 'Teams', icon: 'groups', route: ['/admin/teams'] }, { title: this.team?.name || 'Team' }];
    });
  }

  getMembers(): void {
    if (!this.team?.id) {
      return;
    }

    this.loadingMembers = true;
    this.teamService
      .getMembers({
        teamId: this.team.id,
        term: this.memberSearchTerm,
        pageIndex: this.membersPageIndex,
        pageSize: this.membersPageSize
      })
      .subscribe({
        next: (results) => {
          this.loadingMembers = false;
          this.membersDataSource.data = results.items || [];
          this.totalMembers = results.totalCount || 0;
        },
        error: (error) => {
          this.loadingMembers = false;
          this.membersDataSource.data = [];
          this.totalMembers = 0;
        }
      });
  }

  getTeamEvents(): void {
    if (!this.teamId) {
      return;
    }

    this.loadingEvents = true;
    this.eventsService
      .getEvents({
        term: this.teamEventSearch,
        teamId: this.teamId,
        page: this.teamEventsPage,
        page_size: this.eventsPerPage
      })
      .subscribe((results) => {
        this.loadingEvents = false;
        this.teamEvents = results.items || [];
        this.eventsDataSource.data = results.items || [];
        this.totalEvents = results.totalCount || 0;
      });
  }

  onMembersPageChange(event: PageEvent): void {
    this.membersPageSize = event.pageSize;
    this.membersPageIndex = event.pageIndex;
    this.getMembers();
  }

  onMembersSearchChange(searchTerm: string = ''): void {
    this.membersPageIndex = 0;
    this.memberSearchTerm = searchTerm || '';
    this.getMembers();
  }

  editTeamDetails(): void {
    if (!this.team) {
      return;
    }

    const dialogRef = this.dialog.open(CreateTeamDialogComponent, {
      width: '40vw',
      maxWidth: '40vw',
      disableClose: true,
      data: { team: this.team }
    });

    dialogRef.afterClosed().subscribe((updatedTeam: Team) => {
      if (!updatedTeam) {
        return;
      }
      this.team = updatedTeam;
      this.breadcrumbs = [{ title: 'Teams', icon: 'groups', route: ['/admin/teams'] }, { title: this.team?.name || 'Team' }];
    });
  }

  addMember(): void {
    const teamId = this.asId(this.team?.id);
    if (!teamId) {
      return;
    }
    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Members to Team',
        searchPlaceholder: 'Search for users to add...',
        type: 'members',
        icon: 'person',
        teamId,
        searchFunction: (
          term: string,
          pageIndex: number,
          pageSize: number
        ): Observable<any> => {
          return this.teamService.getNonMembers({ teamId, term, pageIndex, pageSize });
        },
        columns: [
          {
            key: 'name',
            label: 'Name',
            displayFunction: (user: User) => user.username || 'Unknown',
            width: '40%'
          },
          {
            key: 'displayName',
            label: 'Display Name',
            displayFunction: (user: User) => user.displayName || 'Unknown',
            width: '35%'
          },
          {
            key: 'email',
            label: 'Email',
            displayFunction: (user: User) => user.email || 'No email provided',
            width: '35%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem && this.team?.id) {
        this.teamService
          .addUserToTeam(this.asId(this.team.id), result.selectedItem)
          .subscribe({
            next: () => this.getMembers()
          });
      }
    });
  }

  removeMember($event: MouseEvent, user: User): void {
    $event.stopPropagation();
    if (!this.team?.id) {
      return;
    }

    const teamId = this.team.id;
    this.teamService.removeMember(teamId, user.id).subscribe({
      next: () => {
        this.getMembers();

        const snackBarRef = this.snackBar.open(`Removed ${user.displayName} from team`, 'Undo', { duration: 5000 });
        snackBarRef.onAction().subscribe(() => {
          this.teamService.addUserToTeam(teamId, user).subscribe({
            next: () => this.getMembers(),
            error: (error) => {
              console.error('Error restoring member:', error);
              this.snackBar.open('Error restoring member', 'Close', { duration: 5000 });
            }
          });
        });
      }
    });
  }

  getUserRole(user: User): string {
    const userAcl = this.team?.acl?.[user.id];
    return userAcl?.role || 'GUEST';
  }

  getRoleClass(user: User): string {
    const role = this.getUserRole(user);
    return `user-role-badge role-${role.toLowerCase()}`;
  }

  updateUserRole(user: User, newRole: string): void {
    if (!this.team?.id || !newRole) {
      return;
    }
    this.teamService
      .updateUserRole(this.asId(this.team.id), this.asId(user.id), newRole)
      .subscribe({
        next: (updatedTeam: Team) => {
          this.team = updatedTeam;
          this.getMembers();
        }
      });
  }

  addEventToTeam(): void {
    if (!this.team?.id) {
      return;
    }
    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Events to Team',
        searchPlaceholder: 'Search for events to add...',
        type: 'events',
        searchFunction: (
          searchTerm: string,
          page: number,
          pageSize: number
        ): Observable<any> => {
          return this.eventsService.getEvents({
            term: searchTerm,
            page,
            page_size: pageSize,
            excludeTeamId: this.team.id
          });
        },
        columns: [
          {
            key: 'name',
            label: 'Event Name',
            displayFunction: (event: any) => event.name || 'Unnamed Event',
            width: '50%'
          },
          {
            key: 'description',
            label: 'Description',
            displayFunction: (event: any) => event.description || 'No description',
            width: '50%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem && this.team?.id) {
        this.eventsService
          .addTeamToEvent(this.asId(result.selectedItem.id), this.team)
          .subscribe(() => this.getTeamEvents());
      }
    });
  }

  removeEventFromTeam($event: MouseEvent, event: MageEvent): void {
    $event.stopPropagation();
    if (!this.team?.id) {
      return;
    }

    const team = this.team;

    this.eventsService
      .removeEventFromTeam(this.asId(event.id), this.asId(team.id))
      .subscribe(() => {
        this.getTeamEvents();

        const snackBarRef = this.snackBar.open(`Removed ${event.name} from team`, 'Undo', { duration: 5000 });
        snackBarRef.onAction().subscribe(() => {
          this.eventsService.addTeamToEvent(this.asId(event.id), team).subscribe({
            next: () => this.getTeamEvents(),
            error: (error) => {
              console.error('Error restoring event:', error);
              this.snackBar.open('Error restoring event', 'Close', { duration: 5000 });
            }
          });
        });
      });
  }

  deleteTeam(): void {
    if (!this.team) {
      return;
    }

    const dialogRef = this.dialog.open(DeleteTeamComponent, {
      width: '600px',
      data: { team: this.team }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.router.navigate(['../../teams'], { relativeTo: this.route });
      }
    });
  }

  onEventsPageChange(event: PageEvent): void {
    this.eventsPerPage = event.pageSize;
    this.teamEventsPage = event.pageIndex;
    this.getTeamEvents();
  }

  onTeamEventSearchChange(searchTerm?: string): void {
    this.teamEventsPage = 0;
    this.teamEventSearch = searchTerm || '';
    this.getTeamEvents();
  }
}
