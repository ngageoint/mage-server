import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';

import { AdminUserService } from '../../services/admin-user.service';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { AdminEventsService } from '../../services/admin-events.service';

import { Team } from '../team';
import { User as CoreUser } from '@ngageoint/mage.web-core-lib/user';

import { Event } from '../../../../../../src/app/filter/filter.types';
import { DeleteTeamComponent } from '../delete-team/delete-team.component';
import { CardActionButton } from '../../../core/card-navbar/card-navbar.component';
import {
  SearchModalComponent,
  SearchModalData,
  SearchModalResult,
  SearchModalColumn
} from '../../../core/search-modal/search-modal.component';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';

@Component({
  selector: 'mage-team-details',
  templateUrl: './team-details.component.html',
  styleUrls: ['./team-details.component.scss']
})
export class TeamDetailsComponent implements OnInit {
  team: Team | null = null;
  teamId = '';

  hasUpdatePermission = false;
  hasDeletePermission = false;

  private myself: any | null = null;

  editingDetails = false;
  editingMembers = false;
  editingEvents = false;

  editForm = {
    name: '',
    description: ''
  };

  loadingMembers = true;
  membersPageIndex = 0;
  membersPageSize = 5;
  memberSearchTerm = '';
  membersDataSource = new MatTableDataSource<CoreUser>();
  membersDisplayedColumns = ['content'];
  totalMembers = 0;
  pageSizeOptions = [5, 10, 25];

  loadingEvents = true;
  teamEvents: Event[] = [];
  teamEventsPage = 0;
  eventsPerPage = 5;
  eventSearch = '';
  teamEventSearch = '';
  filteredEvents: Event[] = [];

  eventsDataSource = new MatTableDataSource<Event>();
  eventsDisplayedColumns = ['content'];
  totalEvents = 0;
  eventsPageSize = 5;

  actionButtons: CardActionButton[] = [];
  memberActionButtons: CardActionButton[] = [];
  eventActionButtons: CardActionButton[] = [];

  breadcrumbs: AdminBreadcrumb[] = [
    {
      title: 'Teams',
      iconClass: 'fa fa-users',
      route: ['../']
    }
  ];

  private updateActionButtons(): void {
    this.actionButtons = [];
    this.memberActionButtons = [];
    this.eventActionButtons = [];

    if (this.hasUpdatePermission) {
      this.actionButtons.push({
        label: this.editingDetails ? 'Cancel' : 'Edit',
        action: () => this.toggleEditDetails(),
        type: this.editingDetails ? 'btn-primary' : 'btn-secondary'
      });

      this.memberActionButtons.push({
        label: this.editingMembers ? 'Done' : 'Edit Members',
        action: () => this.toggleEditRoles(),
        type: this.editingMembers ? 'btn-primary' : 'btn-secondary'
      });

      this.memberActionButtons.push({
        label: 'Add Member',
        action: () => this.addMember(),
        type: 'btn-secondary'
      });

      this.eventActionButtons.push({
        label: this.editingEvents ? 'Done' : 'Edit Events',
        action: () => this.toggleEditEvents(),
        type: this.editingEvents ? 'btn-primary' : 'btn-secondary'
      });

      this.eventActionButtons.push({
        label: 'Add Event',
        action: () => this.addEventToTeam(),
        type: 'btn-secondary'
      });
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private adminUserService: AdminUserService,
    private teamService: AdminTeamsService,
    private eventsService: AdminEventsService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.teamId = params.get('teamId') || '';
      if (!this.teamId) return;

      this.adminUserService.getMyself().subscribe({
        next: (myself) => {
          this.myself = myself;
          this.loadTeam();
        },
        error: () => {
          this.myself = null;
          this.loadTeam();
        }
      });
    });
  }

  private loadTeam(): void {
    if (!this.teamId) return;

    this.teamService.getTeamById(this.teamId).subscribe((team: Team) => {
      this.team = team;

      const myId = this.myself?.id;
      const globalPerms: string[] = this.myself?.role?.permissions || [];

      const myAccess =
        myId && this.team?.acl ? (this.team.acl[myId] ?? null) : null;
      const aclPermissions: string[] = myAccess?.permissions || [];

      this.hasUpdatePermission =
        globalPerms.includes('UPDATE_TEAM') || aclPermissions.includes('update');

      this.hasDeletePermission =
        globalPerms.includes('DELETE_TEAM') || aclPermissions.includes('delete');

      this.updateActionButtons();
      this.getMembers();
      this.getTeamEvents();

      this.breadcrumbs = [
        { title: 'Teams', iconClass: 'fa fa-users', route: ['../'] },
        { title: this.team?.name || 'Team' }
      ];
    });
  }

  getMembers(): void {
    if (!this.team?.id) return;

    this.loadingMembers = true;

    this.teamService
      .getMembers({
        id: this.team.id,
        term: this.memberSearchTerm,
        page: this.membersPageIndex,
        page_size: this.membersPageSize
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
    if (!this.teamId) return;

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

  toggleEditDetails(): void {
    if (!this.team) return;

    if (!this.editingDetails) {
      this.editForm.name = this.team.name || '';
      this.editForm.description = this.team.description || '';
    }

    this.editingDetails = !this.editingDetails;
    this.updateActionButtons();
  }

  saveTeamDetails(): void {
    if (!this.team?.id) return;

    const name = this.editForm.name || '';
    const description = this.editForm.description || '';

    this.teamService
      .editTeam(this.team.id, { name, description })
      .subscribe((updatedTeam: Team) => {
        this.team = updatedTeam;
        this.editingDetails = false;
        this.updateActionButtons();
        this.breadcrumbs = [
          { title: 'Teams', iconClass: 'fa fa-users', route: ['../'] },
          { title: this.team?.name || 'Team' }
        ];
      });
  }

  cancelEditDetails(): void {
    this.editingDetails = false;
    this.updateActionButtons();

    this.editForm.name = this.team?.name || '';
    this.editForm.description = this.team?.description || '';
  }

  addMember(): void {
    const teamId = this.team?.id || '';
    if (!teamId) return;

    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Members to Team',
        searchPlaceholder: 'Search for users to add...',
        type: 'members',
        teamId,
        searchFunction: (
          searchTerm: string,
          page: number,
          pageSize: number
        ): Observable<any> => {
          return this.teamService.getNonMembers({
            id: teamId,
            term: searchTerm,
            page,
            page_size: pageSize
          });
        },
        columns: [
          {
            key: 'name',
            label: 'Name',
            displayFunction: (user: CoreUser) => user.username || 'Unknown',
            width: '40%'
          },
          {
            key: 'displayName',
            label: 'Display Name',
            displayFunction: (user: CoreUser) => user.displayName || 'Unknown',
            width: '35%'
          },
          {
            key: 'email',
            label: 'Email',
            displayFunction: (user: CoreUser) => user.email || 'No email provided',
            width: '35%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem && this.team?.id) {
        this.teamService.addUserToTeam(this.team.id, result.selectedItem).subscribe({
          next: () => this.getMembers()
        });
      }
    });
  }

  removeMember($event: MouseEvent, user: CoreUser): void {
    $event.stopPropagation();
    if (!this.team?.id) return;

    this.teamService.removeMember(this.team.id, user.id).subscribe({
      next: () => this.getMembers()
    });
  }

  toggleEditRoles(): void {
    this.editingMembers = !this.editingMembers;
    this.updateActionButtons();
  }

  toggleEditEvents(): void {
    this.editingEvents = !this.editingEvents;
    this.updateActionButtons();
  }

  getUserRole(user: CoreUser): string {
    const userAcl = this.team?.acl?.[user.id];
    return userAcl?.role || 'GUEST';
  }

  getRoleClass(user: CoreUser): string {
    const role = this.getUserRole(user);
    return `user-role-badge role-${role.toLowerCase()}`;
  }

  updateUserRole(user: CoreUser, event: any): void {
    const newRole = event?.target?.value;
    if (!this.team?.id || !newRole) return;

    this.teamService.updateUserRole(this.team.id, user.id, newRole).subscribe({
      next: (updatedTeam: Team) => {
        this.team = updatedTeam;
        this.getMembers();
      }
    });
  }

  addEventToTeam(): void {
    if (!this.team?.id) return;

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
            excludeTeamId: this.team!.id
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
            displayFunction: (event: any) =>
              event.description || 'No description',
            width: '50%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem && this.team?.id) {
        this.eventsService.addTeamToEvent(
          String(result.selectedItem.id),
          this.team
        ).subscribe(() => this.getTeamEvents());
      }
    });
  }

  removeEventFromTeam($event: MouseEvent, event: Event): void {
    $event.stopPropagation();
    if (!this.team?.id) return;

    this.eventsService
      .removeEventFromTeam(String(event.id), String(this.team.id))
      .subscribe(() => this.getTeamEvents());
  }

  deleteTeam(): void {
    if (!this.team) return;

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
