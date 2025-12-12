import { Component, Inject, OnInit } from '@angular/core';
import { StateService } from '@uirouter/angular';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { UserService } from '../../../upgrade/ajs-upgraded-providers';
import { TeamsService } from '../teams-service';
import { EventsService } from '../../admin-event/events.service';
import { Team } from '../team';
import { User } from '@ngageoint/mage.web-core-lib/user';
import { Event } from 'src/app/filter/filter.types';
import { DeleteTeamComponent } from '../delete-team/delete-team.component';
import { CardActionButton } from '../../../core/card-navbar/card-navbar.component';
import { SearchModalComponent, SearchModalData, SearchModalResult, SearchModalColumn } from '../../../core/search-modal/search-modal.component';
import { Observable } from 'rxjs';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';

/**
 * Component for displaying and managing team details in the admin interface.
 * Provides functionality for viewing team information, managing team members,
 * associating events with teams, and editing team properties.
 */
@Component({
  selector: 'mage-team-details',
  templateUrl: './team-details.component.html',
  styleUrls: ['./team-details.component.scss']
})
export class TeamDetailsComponent implements OnInit {
  team: Team;
  teamId: string;
  hasUpdatePermission = false;
  hasDeletePermission = false;
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
  memberSearchTerm: string;
  membersDataSource = new MatTableDataSource<User>();
  membersDisplayedColumns = ['content'];
  totalMembers = 0;
  pageSizeOptions = [5, 10, 25];

  loadingEvents = true;
  teamEvents: Event[] = [];
  teamEventsPage = 0;
  eventsPerPage = 5;
  eventSearch: string;
  teamEventSearch: string;
  filteredEvents: Event[] = [];

  eventsDataSource = new MatTableDataSource<Event>();
  eventsDisplayedColumns = ['content'];
  totalEvents = 0;
  eventsPageSize = 5;

  actionButtons: CardActionButton[] = [];
  memberActionButtons: CardActionButton[] = [];
  eventActionButtons: CardActionButton[] = [];

  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Teams',
    iconClass: 'fa fa-users',
    state: {name: "admin.teams"}
  }]

  /**
   * Configures buttons for main team actions, member management, and event management.
   */
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

  /**
   * Component constructor. Injects required services for team management.
   */
  constructor(
    private stateService: StateService,
    private dialog: MatDialog,
    @Inject(UserService) private UserService,
    @Inject(TeamsService) private teamService: TeamsService,
    @Inject(EventsService) private eventsService: EventsService
  ) { }

  /**
   * Retrieves team ID from route parameters, loads team data,
   * sets up permissions, and initializes members and events data.
   */
  ngOnInit(): void {
    this.teamId = this.stateService.params.teamId;
    if (this.teamId) {
      this.teamService.getTeamById(this.teamId).subscribe((team: Team) => {
        this.team = team;

        const myAccess = this.team.acl[this.UserService.myself.id];
        const aclPermissions = myAccess ? myAccess.permissions : [];

        this.hasUpdatePermission = this.UserService.myself.role.permissions.includes('UPDATE_TEAM') || aclPermissions.includes('update');
        this.hasDeletePermission = this.UserService.myself.role.permissions.includes('DELETE_TEAM') || aclPermissions.includes('delete');

        this.updateActionButtons();
        this.getMembers();
        this.getTeamEvents();
        this.breadcrumbs.push({title: this.team.name})
      });
    }
  }

  /**
   * Fetches team members with pagination and search filtering.
   */
  getMembers(): void {
    if (!this.team?.id) {
      return;
    }

    this.teamService.getMembers({
      id: this.team.id,
      term: this.memberSearchTerm,
      page: this.membersPageIndex,
      page_size: this.membersPageSize
    }).subscribe({
      next: (results) => {
        this.loadingMembers = false;
        this.membersDataSource.data = results.items || [];
        this.totalMembers = results.totalCount || 0;
      },
      error: (error) => {
        this.loadingMembers = false;
        console.error('Error fetching members:', error);
        this.membersDataSource.data = [];
        this.totalMembers = 0;
      }
    });
  }

  /**
   * Fetches events associated with this team with pagination and search filtering.
   */
  getTeamEvents(): void {
    this.eventsService.getEvents({
      term: this.teamEventSearch,
      teamId: this.teamId,
      page: this.teamEventsPage,
      page_size: this.eventsPerPage
    }).subscribe((results) => {
      this.loadingEvents = false;
      this.teamEvents = results.items || [];
      this.eventsDataSource.data = results.items || [];
      this.totalEvents = results.totalCount || 0;
    });
  }

  /**
   * Handles pagination changes for the members table.
   * @param event - Material paginator event containing new page
   */
  onMembersPageChange(event: PageEvent): void {
    this.membersPageSize = event.pageSize;
    this.membersPageIndex = event.pageIndex;
    this.getMembers();
  }

  /**
   * Handles search term changes for members filtering.
   * @param searchTerm - The search term to filter members
   */
  onMembersSearchChange(searchTerm: string = ''): void {
    this.membersPageIndex = 0;
    this.memberSearchTerm = searchTerm;
    this.getMembers();
  }

  /**
   * Toggles the editing state for team details.
   */
  toggleEditDetails(): void {
    if (!this.editingDetails) {
      this.editForm.name = this.team.name;
      this.editForm.description = this.team.description;
    }
    this.editingDetails = !this.editingDetails;
    this.updateActionButtons();
  }

  /**
   * Saves the edited team details.
   */
  saveTeamDetails(): void {
    const name = this.editForm.name;
    const description = this.editForm.description;

    this.teamService.editTeam(this.team.id, {
      name: name,
      description: description
    }).subscribe((updatedTeam: Team) => {
      this.team = updatedTeam;
      this.editingDetails = false;
      this.updateActionButtons();
    });
  }

  /**
   * Cancels the editing of team details.
   */
  cancelEditDetails(): void {
    this.editingDetails = false;
    this.updateActionButtons();

    this.editForm.name = this.team?.name;
    this.editForm.description = this.team?.description;
  }

  /**
   * Navigates back to the teams list page.
   */
  goToTeams(): void {
    this.stateService.go('admin.teams');
  }

  /**
   * Opens a search modal to add new members to the team.
   */
  addMember(): void {
    const dialogRef = this.dialog.open(SearchModalComponent, {
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Members to Team',
        searchPlaceholder: 'Search for users to add...',
        type: 'members',
        teamId: this.team?.id,
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return this.teamService.getNonMembers({
            id: this.team?.id || '',
            term: searchTerm,
            page: page,
            page_size: pageSize
          });
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
      if (result && result.selectedItem) {
        console.log('Selected user to add:', result.selectedItem);
        this.teamService.addUserToTeam(this.team.id, result.selectedItem).subscribe({
          next: () => {
            this.getMembers();
            this.team.users.push(result.selectedItem);
          }
        });
      }
    });
  }

  /**
   * Removes a member from the team.
   * @param $event - The mouse event
   * @param user - The user to remove from the team
   */
  removeMember($event: MouseEvent, user: User): void {
    $event.stopPropagation();
    this.teamService.removeMember(this.team.id, user.id).subscribe({
      next: () => {
        this.getMembers();
        this.team.users = this.team.users.filter(u => u.id !== user.id);
      },
      error: (error) => {
        console.error('Error removing member:', error);
      }
    });
  }

  /**
   * Navigates to the user profile page for the specified user.
   * @param user - The user to view
   */
  goToUserProfile(user: User): void {
    this.stateService.go('admin.user', { userId: user.id });
  }

  /**
   * Navigates to the team access control page.
   */
  goToAccess(): void {
    this.stateService.go('admin.teamAccess', { teamId: this.team.id });
  }

  /**
   * Toggles the editing state for user roles.
   */
  toggleEditRoles(): void {
    this.editingMembers = !this.editingMembers;
    this.updateActionButtons();
  }

  /**
   * Toggles the editing state for events.
   */
  toggleEditEvents(): void {
    this.editingEvents = !this.editingEvents;
    this.updateActionButtons();
  }

  /**
   * Gets the role of a user in the current team.
   * @param user - The user to get the role for
   * @returns The user's role in the team or 'GUEST' as default
   */
  getUserRole(user: User): string {
    const userAcl = this.team?.acl[user.id];
    return userAcl?.role || 'GUEST';
  }

  /**
   * Gets the CSS class for a user's role badge.
   * @param user - The user to get the role class for
   * @returns The CSS class for the role badge
   */
  getRoleClass(user: User): string {
    const role = this.getUserRole(user);
    return `user-role-badge role-${role.toLowerCase()}`;
  }

  /**
   * Updates a user's role in the team.
   * @param user - The user whose role to update
   * @param event - The change event containing the new role
   */
  updateUserRole(user: User, event: any): void {
    const newRole = event.target.value;
    console.log(`Updating user ${user.displayName} role to ${newRole}`);

    this.teamService.updateUserRole(this.team.id, user.id, newRole).subscribe({
      next: (updatedTeam: Team) => {
        this.team = updatedTeam;
        this.getMembers();
      },
      error: (error) => {
        console.error('Error updating user role:', error);
      }
    });
  }

  /**
   * Opens a search modal to add an event to the team.
   */
  addEventToTeam(): void {
    const dialogRef = this.dialog.open(SearchModalComponent, {
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Events to Team',
        searchPlaceholder: 'Search for events to add...',
        type: 'events',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return this.eventsService.getEvents({
            term: searchTerm,
            page: page,
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
      if (result && result.selectedItem) {
        this.eventsService.addTeamToEvent(result.selectedItem.id.toString(), this.team).subscribe({
          next: () => {
            this.getTeamEvents();
          },
          error: (error) => {
            console.error('Error adding event to team:', error);
          }
        });
      }
    });
  }

  /**
   * Removes an event from the team.
   * @param $event - The mouse event
   * @param event - The event to remove from the team
   */
  removeEventFromTeam($event: MouseEvent, event: Event): void {
    $event.stopPropagation();
    this.eventsService.removeEventFromTeam(event.id.toString(), this.team.id.toString()).subscribe({
      next: () => {
        this.getTeamEvents();
      },
      error: (error) => {
        console.error('Error removing event:', error);
      }
    });
  }

  /**
   * Navigates to the event details page for the specified event.
   * @param event - The event whose details to view
   */
  goToEventPage(event: Event): void {
    this.stateService.go('admin.event', { eventId: event.id });
  }

  /**
   * Opens a confirmation dialog to delete the team.
   */
  deleteTeam(): void {
    const dialogRef = this.dialog.open(DeleteTeamComponent, {
      data: { team: this.team }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.stateService.go('admin.teams');
      }
    });
  }

  /**
   * Handles pagination changes for the events table.
   * @param event - Material paginator event containing new page
   */
  onEventsPageChange(event: PageEvent): void {
    this.eventsPageSize = event.pageSize;
    this.teamEventsPage = event.pageIndex;
    this.getTeamEvents();
  }

  /**
   * Handles search term changes for team events filtering.
   * @param searchTerm - The search term to filter events
   */
  onTeamEventSearchChange(searchTerm?: string): void {
    this.teamEventsPage = 0;
    this.teamEventSearch = searchTerm;
    this.getTeamEvents();
  }
}
