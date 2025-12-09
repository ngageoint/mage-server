import { Component, OnInit, OnDestroy, Inject, ViewChild } from '@angular/core';
import { StateService } from '@uirouter/angular';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSelectChange } from '@angular/material/select';
import { MatTableDataSource } from '@angular/material/table';
import { Subject, forkJoin, takeUntil, Observable } from 'rxjs';
import { NgForm } from '@angular/forms';
import { Event as MageEvent, Layer } from 'src/app/filter/filter.types';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { CardActionButton } from '../../../core/card-navbar/card-navbar.component';
import { EventsService } from '../../admin-event/events.service';
import { User as MageUser } from '@ngageoint/mage.web-core-lib/user';
import { Team } from '../../admin-teams/team';
import { TeamsService } from '../../admin-teams/teams-service';
import { SearchModalComponent, SearchModalData, SearchModalResult, SearchModalColumn } from '../../../core/search-modal/search-modal.component';
import { DeleteEventComponent } from '../delete-event/delete-event.component';
import { CreateFormDialogComponent } from '../create-form/create-form.component';

interface ExtendedEvent extends MageEvent {
  complete?: boolean;
  minObservationForms?: number;
  maxObservationForms?: number;
  teamIds?: string[];
  layerIds?: string[];
}

interface PagedResult<T> {
  items: T[];
  totalCount?: number;
  pageSize?: number;
  pageIndex?: number;
}

@Component({
  selector: 'mage-event-details',
  templateUrl: './event-details.component.html',
  styleUrls: ['./event-details.component.scss']
})
/**
 * Manages event details including members, teams, layers, and forms.
 */
export class EventDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('restrictions', { static: false }) restrictionsForm?: NgForm;

  event: ExtendedEvent | null = null;
  eventTeam: Team | null = null;

  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Events',
    iconClass: 'fa fa-calendar',
    state: { name: "admin.events" }
  }];

  hasReadPermission = false;
  hasUpdatePermission = false;
  hasDeletePermission = false;

  editingDetails = false;
  eventEditForm = {
    name: '',
    description: ''
  };

  showArchivedForms = false;
  formCreateOpen = false;
  previewForm: any = null;
  restrictionsError: any = null;
  formsAnimationState = 0;

  loadingMembers = true;
  membersPageIndex = 0;
  membersPageSize = 5;
  membersPage: PagedResult<MageUser> = { items: [], totalCount: 0 };
  memberSearchTerm = '';
  editMembers = false;
  membersDataSource = new MatTableDataSource<MageUser>();
  membersDisplayedColumns = ['content'];
  pageSizeOptions = [5, 10, 25];
  pendingRoleChanges = new Map<string, string>();

  loadingTeams = true;
  teamsPageIndex = 0;
  teamsPageSize = 5;
  teamsPage: PagedResult<Team> = { items: [], totalCount: 0 };
  teamSearchTerm = '';
  editTeams = false;
  teamsDataSource = new MatTableDataSource<Team>();
  teamsDisplayedColumns = ['content'];

  loadingLayers = true;
  layersPageIndex = 0;
  layersPageSize = 5;
  layersPage: PagedResult<Layer> = { items: [], totalCount: 0 };
  layerSearchTerm = '';
  editLayers = false;
  eventLayers: Layer[] = [];
  layersDataSource = new MatTableDataSource<Layer>();
  layersDisplayedColumns = ['content'];

  memberActionButtons: CardActionButton[] = [];
  teamActionButtons: CardActionButton[] = [];
  layerActionButtons: CardActionButton[] = [];

  layers: Layer[] = [];

  constructor(
    @Inject(EventsService) private eventsService: EventsService,
    private teamsService: TeamsService,
    private stateService: StateService,
    private dialog: MatDialog
  ) { }

  /**
   * Configures action buttons for members, teams, and layers sections.
   */
  private updateActionButtons(): void {
    this.memberActionButtons = [];
    this.teamActionButtons = [];
    this.layerActionButtons = [];

    if (this.hasUpdatePermission) {
      this.memberActionButtons.push({
        label: this.editMembers ? 'Done' : 'Edit Members',
        action: () => this.toggleEditMembers(),
        type: this.editMembers ? 'btn-primary' : 'btn-secondary'
      });

      this.memberActionButtons.push({
        label: 'Add Member',
        action: () => this.addMemberToEvent(),
        type: 'btn-secondary'
      });

      this.teamActionButtons.push({
        label: this.editTeams ? 'Done' : 'Edit Teams',
        action: () => this.toggleEditTeams(),
        type: this.editTeams ? 'btn-primary' : 'btn-secondary'
      });

      this.teamActionButtons.push({
        label: 'Add Team',
        action: () => this.addTeamToEvent(),
        type: 'btn-secondary'
      });

      this.layerActionButtons.push({
        label: this.editLayers ? 'Done' : 'Edit Layers',
        action: () => this.toggleEditLayers(),
        type: this.editLayers ? 'btn-primary' : 'btn-secondary'
      });

      this.layerActionButtons.push({
        label: 'Add Layer',
        action: () => this.addLayerToEvent(),
        type: 'btn-secondary'
      });
    }
  }

  ngOnInit(): void {
    const eventId = this.stateService.params.eventId;

    forkJoin({
      event: this.eventsService.getEventById(eventId),
      teams: this.eventsService.getTeamsInEvent(String(eventId), {
        page: 0,
        page_size: 100,
        total: false
      })
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ event, teams }) => {
          this.event = event;

          this.eventTeam = teams.items.find(team =>
            team.teamEventId === event.id
          ) || null;

          this.getMembersPage();
          this.getTeamsPage();
          this.loadLayers();
          this.breadcrumbs.push({ title: this.event.name })
        },
        error: (error) => {
          console.error('Error loading event:', error);
        }
      });

    this.hasReadPermission = true;
    this.hasUpdatePermission = true;
    this.hasDeletePermission = true;

    this.updateActionButtons();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads paginated members for the current event.
   */
  getMembersPage(): void {
    if (!this.event?.id) {
      return;
    }

    this.eventsService.getMembers(String(this.event.id), {
      page: this.membersPageIndex,
      page_size: this.membersPageSize,
      term: this.memberSearchTerm,
      total: true
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.loadingMembers = false;
          this.membersPage = {
            items: page.items,
            totalCount: page.totalCount || 0,
            pageSize: page.pageSize,
            pageIndex: page.pageIndex
          };
          this.membersDataSource.data = page.items;
        },
        error: (error) => {
          this.loadingMembers = false;
          console.error('Error loading members:', error);
        }
      });
  }

  /**
   * Removes a user from the event team.
   */
  removeMember($event: MouseEvent, user: MageUser): void {
    $event.stopPropagation();

    if (!this.eventTeam?.id) {
      console.error('Event team not found');
      return;
    }

    this.teamsService.removeMember(String(this.eventTeam.id), String(user.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.getMembersPage();
        },
        error: (error) => {
          console.error('Error removing member:', error);
        }
      });
  }

  /**
   * Searches members and resets to first page.
   */
  searchMembers(): void {
    this.membersPageIndex = 0;
    this.getMembersPage();
  }

  /**
   * Loads paginated teams for the current event.
   */
  getTeamsPage(): void {
    if (!this.event?.id) {
      return;
    }

    this.eventsService.getTeamsInEvent(String(this.event.id), {
      page: this.teamsPageIndex,
      page_size: this.teamsPageSize,
      term: this.teamSearchTerm,
      total: true,
      omit_event_teams: true
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.loadingTeams = false;
          this.teamsPage = {
            items: page.items,
            totalCount: page.totalCount || 0,
            pageSize: page.pageSize,
            pageIndex: page.pageIndex
          };
          this.teamsDataSource.data = page.items;
        },
        error: (error) => {
          this.loadingTeams = false;
          console.error('Error loading teams:', error);
        }
      });
  }

  /**
   * Removes a team from the event.
   */
  removeTeam($event: MouseEvent, team: Team): void {
    $event.stopPropagation();

    if (!this.event?.id) {
      return;
    }

    this.eventsService.removeEventFromTeam(String(this.event.id), String(team.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.getTeamsPage();
        },
        error: (error) => {
          console.error('Error removing team:', error);
        }
      });
  }

  /**
   * Searches teams and resets to first page.
   */
  searchTeams(): void {
    this.teamsPageIndex = 0;
    this.getTeamsPage();
  }

  /**
   * Loads all layers for the current event and applies client-side pagination.
   */
  loadLayers(): void {
    if (!this.event?.id) {
      return;
    }

    this.eventsService.getLayersForEvent(String(this.event.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (layers) => {
          this.loadingLayers = false;
          this.eventLayers = layers;
          this.filterAndPaginateLayers();
        },
        error: (error) => {
          this.loadingLayers = false;
          console.error('Error loading layers:', error);
        }
      });
  }

  /**
   * Filters and paginates layers on the client side.
   */
  filterAndPaginateLayers(): void {
    let filteredLayers = this.eventLayers;
    if (this.layerSearchTerm) {
      filteredLayers = this.eventLayers.filter(layer =>
        layer.name.toLowerCase().includes(this.layerSearchTerm.toLowerCase())
      );
    }

    const startIndex = this.layersPageIndex * this.layersPageSize;
    const endIndex = startIndex + this.layersPageSize;
    const paginatedLayers = filteredLayers.slice(startIndex, endIndex);

    this.layersPage = {
      items: paginatedLayers,
      totalCount: filteredLayers.length,
      pageSize: this.layersPageSize,
      pageIndex: this.layersPageIndex
    };
    this.layersDataSource.data = paginatedLayers;
  }

  /**
   * Searches layers and resets to first page.
   */
  searchLayers(): void {
    this.layersPageIndex = 0;
    this.filterAndPaginateLayers();
  }

  /**
   * Adds a layer to the event.
   */
  addLayer($event: MouseEvent, layer: Layer): void {
    $event.stopPropagation();

    if (!this.event?.id) {
      return;
    }

    this.eventsService.addLayerToEvent(String(this.event.id), { id: layer.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadLayers();
        },
        error: (error) => {
          console.error('Error adding layer:', error);
        }
      });
  }

  /**
   * Removes a layer from the event.
   */
  removeLayer($event: MouseEvent, layer: Layer): void {
    $event.stopPropagation();

    if (!this.event?.id) {
      return;
    }

    this.eventsService.removeLayerFromEvent(String(this.event.id), layer.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadLayers();
        },
        error: (error) => {
          console.error('Error removing layer:', error);
        }
      });
  }

  /**
   * Navigates to layer details page.
   */
  gotoLayer(layer: Layer): void {
    this.stateService.go('admin.layer', { layerId: layer.id });
  }

  /**
   * Returns non-archived forms for display.
   */
  get nonArchivedForms(): any[] {
    if (!this.event?.forms) {
      return [];
    }
    return this.event.forms.filter(form => !form.archived);
  }

  /**
   * Saves form restrictions (min/max) to the server.
   */
  saveFormRestrictions(): void {
    if (!this.event?.id) {
      return;
    }

    this.restrictionsError = null;
    const eventUpdate: any = {
      minObservationForms: this.event.minObservationForms,
      maxObservationForms: this.event.maxObservationForms,
      forms: this.event.forms.map(form => ({
        ...form,
        min: form.min,
        max: form.max
      }))
    };

    this.eventsService.updateEvent(String(this.event.id), eventUpdate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedEvent: any) => {
          if (this.event) {
            this.event.minObservationForms = updatedEvent.minObservationForms;
            this.event.maxObservationForms = updatedEvent.maxObservationForms;

            updatedEvent.forms?.forEach((updatedForm: any) => {
              const localForm = this.event?.forms?.find(f => f.id === updatedForm.id);
              if (localForm) {
                localForm.min = updatedForm.min;
                localForm.max = updatedForm.max;
              }
            });
          }

          if (this.restrictionsForm) {
            this.restrictionsForm.form.markAsPristine();
          }
        },
        error: (error) => {
          console.error('Error saving form restrictions:', error);
          this.restrictionsError = error.error || {
            message: 'Failed to save form restrictions. Please try again.'
          };
        }
      });
  }

  /**
   * Opens dialog to create a new form for the event.
   */
  createForm(): void {
    if (!this.event) {
      return;
    }

    const dialogRef = this.dialog.open(CreateFormDialogComponent, {
      width: '900px',
      height: '800px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: { event: this.event }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.id) {
        // Form was successfully created with fields, navigate to edit it
        this.stateService.go('admin.formEdit', { eventId: this.event?.id, formId: result.id });
      }
    });
  }

  /**
   * Handles reordered forms from the draggable list component.
   */
  onFormsReordered(reorderedForms: any[]): void {
    if (!this.event?.forms) return;

    // Update the full forms array to match the new order
    this.event.forms = reorderedForms;
    this.updateFormsOrder(reorderedForms);
  }

  /**
   * Updates form order on server and handles errors.
   */
  private updateFormsOrder(forms: any[]): void {
    if (!this.event?.id) return;

    this.event.forms = forms;
    this.formsAnimationState++;

    this.eventsService.updateEvent(String(this.event.id), { forms })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedEvent) => {
          this.event = updatedEvent;
        },
        error: (error) => {
          console.error('Error updating forms order:', error);
          this.eventsService.getEventById(String(this.event!.id))
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (event) => {
                this.event = event;
              }
            });
        }
      });
  }

  /**
   * Opens form preview dialog.
   */
  preview($event: MouseEvent, form: any): void {
    $event.stopPropagation();
    this.previewForm = form;
  }

  /**
   * Closes form preview dialog.
   */
  closePreview(): void {
    this.previewForm = null;
  }

  /**
   * TrackBy function for form list performance.
   */
  trackByFormId(index: number, form: any): any {
    return form.id;
  }

  /**
   * Returns filtered forms based on archived flag.
   */
  get filteredForms(): any[] {
    if (!this.event?.forms) {
      return [];
    }
    if (this.showArchivedForms) {
      return this.event.forms;
    }
    return this.event.forms.filter(form => !form.archived);
  }

  /**
   * Gets user's role in the event team.
   */
  getUserRole(user: MageUser): string {
    if (!this.eventTeam?.acl) return 'GUEST';

    const pendingRole = this.pendingRoleChanges.get(String(user.id));
    if (pendingRole) return pendingRole;

    return this.eventTeam.acl[user.id]?.role || 'GUEST';
  }

  /**
   * Returns CSS class for user role badge.
   */
  getRoleClass(user: MageUser): string {
    const role = this.getUserRole(user);
    return `user-role-badge role-${role.toLowerCase()}`;
  }

  /**
   * Updates a user's role in the event team.
   */
  updateUserRole(user: MageUser, event: MatSelectChange): void {
    this.pendingRoleChanges.set(String(user.id), event.value);
    this.membersDataSource.data = [...this.membersDataSource.data];
  }

  /**
   * Toggles event details edit mode.
   */
  toggleEditDetails(): void {
    if (!this.editingDetails) {
      this.eventEditForm.name = this.event?.name || '';
      this.eventEditForm.description = this.event?.description || '';
    }
    this.editingDetails = !this.editingDetails;
  }

  /**
   * Saves edited event details to server.
   */
  saveEventDetails(): void {
    if (!this.event?.id) {
      return;
    }

    const updatedEvent = {
      ...this.event,
      name: this.eventEditForm.name,
      description: this.eventEditForm.description
    };

    this.eventsService.updateEvent(String(this.event.id), updatedEvent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.event = updated;
          this.editingDetails = false;
        },
        error: (error) => {
          console.error('Error updating event:', error);
        }
      });
  }

  /**
   * Cancels event details editing and reverts changes.
   */
  cancelEditDetails(): void {
    this.editingDetails = false;
    this.eventEditForm.name = this.event?.name || '';
    this.eventEditForm.description = this.event?.description || '';
  }

  /**
   * Navigates to event edit page.
   */
  editEvent(mageEvent: ExtendedEvent): void {
    this.stateService.go('admin.eventEdit', { eventId: mageEvent.id });
  }

  /**
   * Navigates to event access page.
   */
  editAccess(mageEvent: ExtendedEvent): void {
    this.stateService.go('admin.eventAccess', { eventId: mageEvent.id });
  }

  /**
   * Navigates to form edit page.
   */
  editForm(mageEvent: ExtendedEvent, form: any): void {
    this.stateService.go('admin.formEdit', { eventId: mageEvent.id, formId: form.id });
  }

  /**
   * Navigates to member or team details page.
   */
  gotoMember(member: MageUser | Team): void {
    if ('username' in member) {
      this.stateService.go('admin.user', { userId: member.id });
    } else {
      this.stateService.go('admin.team', { teamId: member.id });
    }
  }

  /**
   * Marks event as complete.
   */
  completeEvent(mageEvent: ExtendedEvent): void {
    if (!mageEvent?.id) {
      return;
    }

    const updatedEvent = {
      ...mageEvent,
      complete: true
    };

    this.eventsService.updateEvent(String(mageEvent.id), updatedEvent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.event = updated;
        },
        error: (error) => {
          console.error('Error completing event:', error);
        }
      });
  }

  /**
   * Reactivates a completed event.
   */
  activateEvent(mageEvent: ExtendedEvent): void {
    if (!mageEvent?.id) {
      return;
    }

    const updatedEvent = {
      ...mageEvent,
      complete: false
    };

    this.eventsService.updateEvent(String(mageEvent.id), updatedEvent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.event = updated;
          console.log('Event marked as active:', updated);
        },
        error: (error) => {
          console.error('Error activating event:', error);
        }
      });
  }

  /**
   * Opens delete event confirmation dialog.
   */
  deleteEvent(): void {
    if (!this.event) {
      return;
    }

    const dialogRef = this.dialog.open(DeleteEventComponent, {
      data: { event: this.event }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.stateService.go('admin.events');
      }
    });
  }

  /**
   * Handles member search input changes.
   */
  onMemberSearchChange(searchTerm?: string): void {
    this.memberSearchTerm = searchTerm || '';
    this.membersPageIndex = 0;
    this.getMembersPage();
  }

  /**
   * Handles member pagination changes.
   */
  onMembersPageChange(event: PageEvent): void {
    this.membersPageIndex = event.pageIndex;
    this.membersPageSize = event.pageSize;
    this.getMembersPage();
  }

  /**
   * Handles team search input changes.
   */
  onTeamSearchChange(searchTerm?: string): void {
    this.teamSearchTerm = searchTerm || '';
    this.teamsPageIndex = 0;
    this.getTeamsPage();
  }

  /**
   * Handles team pagination changes.
   */
  onTeamsPageChange(event: PageEvent): void {
    this.teamsPageIndex = event.pageIndex;
    this.teamsPageSize = event.pageSize;
    this.getTeamsPage();
  }

  /**
   * Handles layer search input changes.
   */
  onLayerSearchChange(searchTerm?: string): void {
    this.layerSearchTerm = searchTerm || '';
    this.layersPageIndex = 0;
    this.filterAndPaginateLayers();
  }

  /**
   * Handles layer pagination changes.
   */
  onLayersPageChange(event: PageEvent): void {
    this.layersPageIndex = event.pageIndex;
    this.layersPageSize = event.pageSize;
    this.filterAndPaginateLayers();
  }

  /**
   * Navigates to team details page.
   */
  gotoTeam(team: Team): void {
    this.stateService.go('admin.team', { teamId: team.id });
  }

  /**
   * Toggles member edit mode and updates action buttons.
   */
  toggleEditMembers(): void {
    if (this.editMembers) {
      this.applyPendingRoleChanges();
    } else {
      this.pendingRoleChanges.clear();
    }
    this.editMembers = !this.editMembers;
    this.updateActionButtons();
  }

  /**
   * Applies all pending role changes to the backend.
   */
  private applyPendingRoleChanges(): void {
    if (!this.eventTeam?.id || this.pendingRoleChanges.size === 0) {
      this.pendingRoleChanges.clear();
      return;
    }

    const updateObservables: Observable<Team>[] = [];
    this.pendingRoleChanges.forEach((newRole, userId) => {
      updateObservables.push(
        this.teamsService.updateUserRole(String(this.eventTeam!.id), userId, newRole)
      );
    });

    forkJoin(updateObservables)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTeams: Team[]) => {
          if (updatedTeams.length > 0) {
            this.eventTeam = updatedTeams[updatedTeams.length - 1];
          }
          this.pendingRoleChanges.clear();
          this.getMembersPage();
        },
        error: (error) => {
          console.error('Error updating user roles:', error);
          this.pendingRoleChanges.clear();
          this.getMembersPage();
        }
      });
  }

  /**
   * Toggles team edit mode and updates action buttons.
   */
  toggleEditTeams(): void {
    this.editTeams = !this.editTeams;
    this.updateActionButtons();
  }

  /**
   * Toggles layer edit mode and updates action buttons.
   */
  toggleEditLayers(): void {
    this.editLayers = !this.editLayers;
    this.updateActionButtons();
  }

  /**
   * Opens search dialog to add members to event.
   */
  addMemberToEvent(): void {
    if (!this.eventTeam?.id) {
      console.error('Event team not found');
      return;
    }

    const dialogRef = this.dialog.open(SearchModalComponent, {
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Members to Event',
        searchPlaceholder: 'Search for users to add...',
        type: 'members',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return this.eventsService.getNonMembers(String(this.event?.id), {
            term: searchTerm,
            page: page,
            page_size: pageSize,
            total: true
          });
        },
        columns: [
          {
            key: 'name',
            label: 'Name',
            displayFunction: (user: MageUser) => user.username || 'Unknown',
            width: '40%'
          },
          {
            key: 'displayName',
            label: 'Display Name',
            displayFunction: (user: MageUser) => user.displayName || 'Unknown',
            width: '35%'
          },
          {
            key: 'email',
            label: 'Email',
            displayFunction: (user: MageUser) => user.email || 'No email provided',
            width: '35%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result && result.selectedItem && this.eventTeam?.id) {
        this.teamsService.addUserToTeam(String(this.eventTeam.id), result.selectedItem).subscribe({
          next: () => {
            this.getMembersPage();
          },
          error: (error) => {
            console.error('Error adding member:', error);
          }
        });
      }
    });
  }

  /**
   * Opens search dialog to add teams to event.
   */
  addTeamToEvent(): void {
    if (!this.event?.id) {
      return;
    }

    const dialogRef = this.dialog.open(SearchModalComponent, {
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Teams to Event',
        searchPlaceholder: 'Search for teams to add...',
        type: 'teams',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return this.eventsService.getTeamsNotInEvent(String(this.event?.id), {
            term: searchTerm,
            page: page,
            page_size: pageSize,
            total: true,
            omit_event_teams: true
          });
        },
        columns: [
          {
            key: 'name',
            label: 'Team Name',
            displayFunction: (team: Team) => team.name || 'Unnamed Team',
            width: '50%'
          },
          {
            key: 'description',
            label: 'Description',
            displayFunction: (team: Team) => team.description || 'No description',
            width: '50%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result && result.selectedItem && this.event?.id) {
        this.eventsService.addTeamToEvent(String(this.event.id), result.selectedItem).subscribe({
          next: () => {
            this.getTeamsPage();
          },
          error: (error) => {
            console.error('Error adding team:', error);
          }
        });
      }
    });
  }

  /**
   * Opens search dialog to add layers to event.
   */
  addLayerToEvent(): void {
    if (!this.event?.id) {
      return;
    }

    const dialogRef = this.dialog.open(SearchModalComponent, {
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Layers to Event',
        searchPlaceholder: 'Search for layers to add...',
        type: 'layers',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return new Observable(observer => {
            this.eventsService.getAllLayers().subscribe({
              next: (allLayers) => {
                this.eventsService.getLayersForEvent(String(this.event?.id)).subscribe({
                  next: (eventLayers) => {
                    const eventLayerIds = eventLayers.map(l => l.id);
                    let filteredLayers = allLayers.filter(layer => !eventLayerIds.includes(layer.id)); if (searchTerm) {
                      filteredLayers = filteredLayers.filter(layer =>
                        layer.name.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                    }

                    const start = page * pageSize;
                    const paginatedLayers = filteredLayers.slice(start, start + pageSize);

                    observer.next({
                      items: paginatedLayers,
                      totalCount: filteredLayers.length,
                      pageSize: pageSize,
                      pageIndex: page
                    });
                    observer.complete();
                  },
                  error: (error) => observer.error(error)
                });
              },
              error: (error) => observer.error(error)
            });
          });
        },
        columns: [
          {
            key: 'name',
            label: 'Layer Name',
            displayFunction: (layer: Layer) => layer.name || 'Unnamed Layer',
            width: '40%'
          },
          {
            key: 'type',
            label: 'Type',
            displayFunction: (layer: Layer) => layer.type || 'Unknown',
            width: '30%'
          },
          {
            key: 'state',
            label: 'State',
            displayFunction: (layer: Layer) => layer.state || 'Unknown',
            width: '30%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result && result.selectedItem && this.event?.id) {
        this.eventsService.addLayerToEvent(String(this.event.id), { id: result.selectedItem.id }).subscribe({
          next: () => {
            this.loadLayers();
          },
          error: (error) => {
            console.error('Error adding layer:', error);
          }
        });
      }
    });
  }
}
