import { Component, OnInit, OnDestroy, Inject, ViewChild } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
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

// Extended Event interface with additional properties
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
  styleUrls: ['./event-details.component.scss'],
  animations: [
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY({{enterTransform}}px)' }),
          animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true }),
        query(':leave', [
          animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
            style({ opacity: 0, transform: 'translateY({{leaveTransform}}px)' }))
        ], { optional: true })
      ])
    ])
  ]
})
export class EventDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild('restrictions', { static: false }) restrictionsForm?: NgForm;

  event: ExtendedEvent | null = null;
  eventTeam: Team | null = null;

  // Breadcrumbs
  breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Events',
    iconClass: 'fa fa-calendar',
    state: { name: "admin.events" }
  }];

  // Permissions
  hasReadPermission = false;
  hasUpdatePermission = false;
  hasDeletePermission = false;

  // Editing state
  editingDetails = false;
  eventEditForm = {
    name: '',
    description: ''
  };

  // Forms
  showArchivedForms = false;
  formCreateOpen = false;
  previewForm: any = null;
  restrictionsError: any = null;
  animatingFormId: number | null = null;
  formsAnimationState = 0;

  // Members pagination
  loadingMembers = false;
  membersPageIndex = 0;
  membersPageSize = 5;
  membersPage: PagedResult<MageUser> = { items: [], totalCount: 0 };
  memberSearchTerm = '';
  editMembers = false;
  membersDataSource = new MatTableDataSource<MageUser>();
  membersDisplayedColumns = ['content'];
  pageSizeOptions = [5, 10, 25];

  // Non-members pagination
  loadingNonMembers = false;
  nonMembersPageIndex = 0;
  nonMembersPageSize = 5;
  nonMembersPage: PagedResult<MageUser> = { items: [], totalCount: 0 };
  nonMemberSearchTerm = '';

  // Teams pagination
  loadingTeams = false;
  teamsPageIndex = 0;
  teamsPageSize = 2;
  teamsPage: PagedResult<Team> = { items: [], totalCount: 0 };
  teamSearchTerm = '';
  editTeams = false;
  teamsDataSource = new MatTableDataSource<Team>();
  teamsDisplayedColumns = ['content'];

  // Non-teams pagination
  loadingNonTeams = false;
  nonTeamsPageIndex = 0;
  nonTeamsPageSize = 5;
  nonTeamsPage: PagedResult<Team> = { items: [], totalCount: 0 };
  nonTeamSearchTerm = '';

  // Layers
  editLayers = false;
  eventLayers: Layer[] = [];
  layersPage = 0;
  layersPerPage = 5;
  layerSearch = '';
  filteredLayers: Layer[] = [];
  layersDataSource = new MatTableDataSource<Layer>();
  layersDisplayedColumns = ['content'];

  // Action buttons for section cards
  memberActionButtons: CardActionButton[] = [];
  teamActionButtons: CardActionButton[] = [];
  layerActionButtons: CardActionButton[] = [];

  nonLayers: Layer[] = [];
  nonLayersPage = 0;
  nonLayersPerPage = 2;
  nonLayerSearch = '';
  filteredNonLayers: Layer[] = [];

  layers: Layer[] = [];
  teamsInEvent: Team[] = [];
  teamsNotInEvent: Team[] = [];

  constructor(
    @Inject('$stateParams') private $stateParams: any,
    @Inject('$state') private $state: any,
    @Inject(EventsService) private eventsService: EventsService,
    private teamsService: TeamsService,
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
      // Member action buttons
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

      // Team action buttons
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

      // Layer action buttons
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
    const eventId = this.$stateParams.eventId;

    // Load event and teams in parallel to find the event team
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

          // Find the event team (team with teamEventId matching this event)
          this.eventTeam = teams.items.find(team =>
            team.teamEventId === event.id
          ) || null;

          // Load teams, members, and layers data after event is loaded
          this.getMembersPage();
          this.getNonMembersPage();
          this.getTeamsPage();
          this.getNonTeamsPage();
          this.loadLayers();
        },
        error: (error) => {
          console.error('Error loading event:', error);
        }
      });

    // Set permissions (temporary - should come from user service)
    this.hasReadPermission = true;
    this.hasUpdatePermission = true;
    this.hasDeletePermission = true;

    // Initialize action buttons
    this.updateActionButtons();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Member methods
  getMembersPage(): void {
    if (!this.event?.id) {
      return;
    }

    this.loadingMembers = true;
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

  getNonMembersPage(): void {
    if (!this.event?.id) {
      return;
    }

    this.loadingNonMembers = true;
    this.eventsService.getNonMembers(String(this.event.id), {
      page: this.nonMembersPageIndex,
      page_size: this.nonMembersPageSize,
      term: this.nonMemberSearchTerm,
      total: true
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.loadingNonMembers = false;
          this.nonMembersPage = {
            items: page.items,
            totalCount: page.totalCount || 0,
            pageSize: page.pageSize,
            pageIndex: page.pageIndex
          };
        },
        error: (error) => {
          this.loadingNonMembers = false;
          console.error('Error loading non-members:', error);
        }
      });
  }

  addMember($event: MouseEvent, user: MageUser): void {
    $event.stopPropagation();
    // TODO: Implement add member logic
    console.log('Adding member:', user);
  }

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
          // Reload members after removal
          this.getMembersPage();
          this.getNonMembersPage();
        },
        error: (error) => {
          console.error('Error removing member:', error);
        }
      });
  }

  hasNextMember(): boolean {
    return (this.membersPageIndex + 1) * this.membersPageSize < (this.membersPage.totalCount || 0);
  }

  hasPreviousMember(): boolean {
    return this.membersPageIndex > 0 && (this.membersPage.totalCount || 0) > 0;
  }

  nextMemberPage(): void {
    if (this.hasNextMember()) {
      this.membersPageIndex++;
      this.getMembersPage();
    }
  }

  previousMemberPage(): void {
    if (this.hasPreviousMember()) {
      this.membersPageIndex--;
      this.getMembersPage();
    }
  }

  searchMembers(): void {
    this.membersPageIndex = 0;
    this.getMembersPage();
  }

  hasNextNonMember(): boolean {
    return (this.nonMembersPageIndex + 1) * this.nonMembersPageSize < (this.nonMembersPage.totalCount || 0);
  }

  hasPreviousNonMember(): boolean {
    return this.nonMembersPageIndex > 0 && (this.nonMembersPage.totalCount || 0) > 0;
  }

  nextNonMemberPage(): void {
    if (this.hasNextNonMember()) {
      this.nonMembersPageIndex++;
      this.getNonMembersPage();
    }
  }

  previousNonMemberPage(): void {
    if (this.hasPreviousNonMember()) {
      this.nonMembersPageIndex--;
      this.getNonMembersPage();
    }
  }

  searchNonMembers(): void {
    this.nonMembersPageIndex = 0;
    this.getNonMembersPage();
  }

  // Team methods
  getTeamsPage(): void {
    if (!this.event?.id) {
      return;
    }

    this.loadingTeams = true;
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

  getNonTeamsPage(): void {
    if (!this.event?.id) {
      return;
    }

    this.loadingNonTeams = true;
    this.eventsService.getTeamsNotInEvent(String(this.event.id), {
      page: this.nonTeamsPageIndex,
      page_size: this.nonTeamsPageSize,
      term: this.nonTeamSearchTerm,
      total: true,
      omit_event_teams: true
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.loadingNonTeams = false;
          this.nonTeamsPage = {
            items: page.items,
            totalCount: page.totalCount || 0,
            pageSize: page.pageSize,
            pageIndex: page.pageIndex
          };
        },
        error: (error) => {
          this.loadingNonTeams = false;
          console.error('Error loading non-teams:', error);
        }
      });
  }

  addTeam($event: MouseEvent, team: Team): void {
    $event.stopPropagation();
    // TODO: Implement add team logic
    console.log('Adding team:', team);
  }

  removeTeam($event: MouseEvent, team: Team): void {
    $event.stopPropagation();

    if (!this.event?.id) {
      return;
    }

    this.eventsService.removeEventFromTeam(String(this.event.id), String(team.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Reload teams after removal
          this.getTeamsPage();
          this.getNonTeamsPage();
        },
        error: (error) => {
          console.error('Error removing team:', error);
        }
      });
  }

  hasNextTeam(): boolean {
    return (this.teamsPageIndex + 1) * this.teamsPageSize < (this.teamsPage.totalCount || 0);
  }

  hasPreviousTeam(): boolean {
    return this.teamsPageIndex > 0 && (this.teamsPage.totalCount || 0) > 0;
  }

  nextTeamPage(): void {
    if (this.hasNextTeam()) {
      this.teamsPageIndex++;
      this.getTeamsPage();
    }
  }

  previousTeamPage(): void {
    if (this.hasPreviousTeam()) {
      this.teamsPageIndex--;
      this.getTeamsPage();
    }
  }

  searchTeams(): void {
    this.teamsPageIndex = 0;
    this.getTeamsPage();
  }

  hasNextNonTeam(): boolean {
    return (this.nonTeamsPageIndex + 1) * this.nonTeamsPageSize < (this.nonTeamsPage.totalCount || 0);
  }

  hasPreviousNonTeam(): boolean {
    return this.nonTeamsPageIndex > 0 && (this.nonTeamsPage.totalCount || 0) > 0;
  }

  nextNonTeamPage(): void {
    if (this.hasNextNonTeam()) {
      this.nonTeamsPageIndex++;
      this.getNonTeamsPage();
    }
  }

  previousNonTeamPage(): void {
    if (this.hasPreviousNonTeam()) {
      this.nonTeamsPageIndex--;
      this.getNonTeamsPage();
    }
  }

  searchNonTeams(): void {
    this.nonTeamsPageIndex = 0;
    this.getNonTeamsPage();
  }

  // Layer methods
  loadLayers(): void {
    if (!this.event?.id) {
      return;
    }

    // Load all layers and event layers in parallel
    forkJoin({
      allLayers: this.eventsService.getAllLayers(),
      eventLayers: this.eventsService.getLayersForEvent(String(this.event.id))
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ allLayers, eventLayers }) => {
          this.layers = allLayers;
          this.eventLayers = eventLayers;

          // Filter out layers that are already in the event
          const eventLayerIds = eventLayers.map(l => l.id);
          this.nonLayers = allLayers.filter(layer => !eventLayerIds.includes(layer.id));

          // Apply any active search filters
          this.filterLayers();
          this.filterNonLayers();
        },
        error: (error) => {
          console.error('Error loading layers:', error);
        }
      });
  }

  filterLayers(): void {
    if (this.layerSearch) {
      this.filteredLayers = this.eventLayers.filter(layer =>
        layer.name.toLowerCase().includes(this.layerSearch.toLowerCase())
      );
    } else {
      this.filteredLayers = [...this.eventLayers];
    }
    this.layersDataSource.data = this.filteredLayers;
  }

  filterNonLayers(): void {
    if (this.nonLayerSearch) {
      this.filteredNonLayers = this.nonLayers.filter(layer =>
        layer.name.toLowerCase().includes(this.nonLayerSearch.toLowerCase())
      );
    } else {
      this.filteredNonLayers = [...this.nonLayers];
    }
  }

  addLayer($event: MouseEvent, layer: Layer): void {
    $event.stopPropagation();

    if (!this.event?.id) {
      return;
    }

    this.eventsService.addLayerToEvent(String(this.event.id), { id: layer.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Reload layers after adding
          this.loadLayers();
        },
        error: (error) => {
          console.error('Error adding layer:', error);
        }
      });
  }

  removeLayer($event: MouseEvent, layer: Layer): void {
    $event.stopPropagation();

    if (!this.event?.id) {
      return;
    }

    this.eventsService.removeLayerFromEvent(String(this.event.id), layer.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Reload layers after removing
          this.loadLayers();
        },
        error: (error) => {
          console.error('Error removing layer:', error);
        }
      });
  }

  gotoLayer(layer: Layer): void {
    this.$state.go('admin.layer', { layerId: layer.id });
  }

  // Form methods
  get nonArchivedForms(): any[] {
    if (!this.event?.forms) {
      return [];
    }
    return this.event.forms.filter(form => !form.archived);
  }

  saveFormRestrictions(): void {
    if (!this.event?.id) {
      return;
    }

    this.restrictionsError = null;

    // Prepare the event update payload with form restrictions
    // We need to send the complete form objects, not just id/min/max,
    // because Mongoose validation runs on the entire forms array
    const eventUpdate: any = {
      minObservationForms: this.event.minObservationForms,
      maxObservationForms: this.event.maxObservationForms,
      forms: this.event.forms.map(form => ({
        ...form,
        // Ensure we're sending the updated min/max values
        min: form.min,
        max: form.max
      }))
    };

    this.eventsService.updateEvent(String(this.event.id), eventUpdate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedEvent: any) => {
          // Update the local event with the response
          if (this.event) {
            this.event.minObservationForms = updatedEvent.minObservationForms;
            this.event.maxObservationForms = updatedEvent.maxObservationForms;

            // Update form restrictions in the local forms
            updatedEvent.forms?.forEach((updatedForm: any) => {
              const localForm = this.event?.forms?.find(f => f.id === updatedForm.id);
              if (localForm) {
                localForm.min = updatedForm.min;
                localForm.max = updatedForm.max;
              }
            });
          }

          // Mark the form as pristine to disable the save button until new changes are made
          if (this.restrictionsForm) {
            this.restrictionsForm.form.markAsPristine();
          }

          console.log('Form restrictions saved successfully');
        },
        error: (error) => {
          console.error('Error saving form restrictions:', error);
          this.restrictionsError = error.error || {
            message: 'Failed to save form restrictions. Please try again.'
          };
        }
      });
  }

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
        // If the result has an id, it means the form was created with an archive file
        this.$state.go('admin.formEdit', { eventId: this.event?.id, formId: result.id });
      } else if (result) {
        // If result exists but no id, navigate to create fields for the new form
        this.$state.go('admin.fieldsCreate', { eventId: this.event?.id, form: result });
      }
    });
  }

  onFormCreateClose(form: any): void {
    // This method is kept for backward compatibility but is no longer used
    // The dialog handles the close event directly in createForm()
    this.formCreateOpen = false;
    if (form?.id) {
      this.$state.go('admin.formEdit', { eventId: this.event?.id, formId: form.id });
    } else if (form) {
      this.$state.go('admin.fieldsCreate', { eventId: this.event?.id, form: form });
    }
  }

  moveFormUp($event: MouseEvent, form: any): void {
    $event.stopPropagation();
    if (!this.event?.forms) return;

    const currentIndex = this.event.forms.indexOf(form);
    if (currentIndex > 0) {
      // Trigger animation highlight
      this.animatingFormId = form.id;

      const forms = [...this.event.forms];
      [forms[currentIndex - 1], forms[currentIndex]] = [forms[currentIndex], forms[currentIndex - 1]];
      this.updateFormsOrder(forms);

      // Remove highlight after animation completes
      setTimeout(() => {
        this.animatingFormId = null;
      }, 400);
    }
  }

  moveFormDown($event: MouseEvent, form: any): void {
    $event.stopPropagation();
    if (!this.event?.forms) return;

    const currentIndex = this.event.forms.indexOf(form);
    if (currentIndex < this.event.forms.length - 1) {
      // Trigger animation highlight
      this.animatingFormId = form.id;

      const forms = [...this.event.forms];
      [forms[currentIndex], forms[currentIndex + 1]] = [forms[currentIndex + 1], forms[currentIndex]];
      this.updateFormsOrder(forms);

      // Remove highlight after animation completes
      setTimeout(() => {
        this.animatingFormId = null;
      }, 400);
    }
  }

  onFormDrop(event: CdkDragDrop<any[]>): void {
    if (!this.event?.forms) return;

    const forms = [...this.event.forms];
    moveItemInArray(forms, event.previousIndex, event.currentIndex);
    this.updateFormsOrder(forms);
  }

  private updateFormsOrder(forms: any[]): void {
    if (!this.event?.id) return;

    // Update the local event object immediately for UI responsiveness
    this.event.forms = forms;

    // Trigger animation state change for Angular animations
    this.formsAnimationState++;

    // Update the forms order on the server
    this.eventsService.updateEvent(String(this.event.id), { forms })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedEvent) => {
          this.event = updatedEvent;
        },
        error: (error) => {
          console.error('Error updating forms order:', error);
          // Reload the event to get the correct state from server
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

  preview($event: MouseEvent, form: any): void {
    $event.stopPropagation();
    this.previewForm = form;
  }

  closePreview(): void {
    this.previewForm = null;
  }

  trackByFormId(index: number, form: any): any {
    return form.id;
  }

  get filteredForms(): any[] {
    if (!this.event?.forms) {
      return [];
    }
    if (this.showArchivedForms) {
      return this.event.forms;
    }
    return this.event.forms.filter(form => !form.archived);
  }

  // Member role management
  getUserRole(user: MageUser): string {
    if (!this.eventTeam?.acl) {
      return 'GUEST';
    }
    const userAcl = this.eventTeam.acl[user.id];
    return userAcl?.role || 'GUEST';
  }

  getRoleClass(user: MageUser): string {
    const role = this.getUserRole(user);
    return `user-role-badge role-${role.toLowerCase()}`;
  }

  updateUserRole(user: MageUser, event: any): void {
    if (!this.eventTeam?.id) {
      console.error('Event team not found');
      return;
    }

    const newRole = event.target.value;
    console.log(`Updating user ${user.displayName} role to ${newRole}`);

    this.teamsService.updateUserRole(String(this.eventTeam.id), String(user.id), newRole)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTeam: Team) => {
          this.eventTeam = updatedTeam;
          this.getMembersPage();
        },
        error: (error) => {
          console.error('Error updating user role:', error);
        }
      });
  }

  // Event details editing
  toggleEditDetails(): void {
    if (!this.editingDetails) {
      this.eventEditForm.name = this.event?.name || '';
      this.eventEditForm.description = this.event?.description || '';
    }
    this.editingDetails = !this.editingDetails;
  }

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

  cancelEditDetails(): void {
    this.editingDetails = false;
    this.eventEditForm.name = this.event?.name || '';
    this.eventEditForm.description = this.event?.description || '';
  }

  // Event actions
  editEvent(mageEvent: ExtendedEvent): void {
    this.$state.go('admin.eventEdit', { eventId: mageEvent.id });
  }

  editAccess(mageEvent: ExtendedEvent): void {
    this.$state.go('admin.eventAccess', { eventId: mageEvent.id });
  }

  editForm(mageEvent: ExtendedEvent, form: any): void {
    this.$state.go('admin.formEdit', { eventId: mageEvent.id, formId: form.id });
  }

  gotoMember(member: MageUser | Team): void {
    if ('username' in member) {
      this.$state.go('admin.user', { userId: member.id });
    } else {
      this.$state.go('admin.team', { teamId: member.id });
    }
  }

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
          console.log('Event marked as complete:', updated);
        },
        error: (error) => {
          console.error('Error completing event:', error);
        }
      });
  }

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

  deleteEvent(): void {
    if (!this.event) {
      return;
    }

    const dialogRef = this.dialog.open(DeleteEventComponent, {
      data: { event: this.event }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.$state.go('admin.events');
      }
    });
  }

  // New methods for Mat Table and Card Navbar integration
  onMemberSearchChange(searchTerm?: string): void {
    this.memberSearchTerm = searchTerm || '';
    this.membersPageIndex = 0;
    this.getMembersPage();
  }

  onMembersPageChange(event: PageEvent): void {
    this.membersPageIndex = event.pageIndex;
    this.membersPageSize = event.pageSize;
    this.getMembersPage();
  }

  onTeamSearchChange(searchTerm?: string): void {
    this.teamSearchTerm = searchTerm || '';
    this.teamsPageIndex = 0;
    this.getTeamsPage();
  }

  onTeamsPageChange(event: PageEvent): void {
    this.teamsPageIndex = event.pageIndex;
    this.teamsPageSize = event.pageSize;
    this.getTeamsPage();
  }

  onLayerSearchChange(searchTerm?: string): void {
    this.layerSearch = searchTerm || '';
    this.layersPage = 0;
    this.filterLayers();
  }

  onLayersPageChange(event: PageEvent): void {
    this.layersPage = event.pageIndex;
    this.layersPerPage = event.pageSize;
  }

  gotoTeam(team: Team): void {
    this.$state.go('admin.team', { teamId: team.id });
  }

  // Toggle edit modes
  toggleEditMembers(): void {
    this.editMembers = !this.editMembers;
    this.updateActionButtons();
  }

  toggleEditTeams(): void {
    this.editTeams = !this.editTeams;
    this.updateActionButtons();
  }

  toggleEditLayers(): void {
    this.editLayers = !this.editLayers;
    this.updateActionButtons();
  }

  // Add methods
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
            this.getNonMembersPage();
          },
          error: (error) => {
            console.error('Error adding member:', error);
          }
        });
      }
    });
  }

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
            this.getNonTeamsPage();
          },
          error: (error) => {
            console.error('Error adding team:', error);
          }
        });
      }
    });
  }

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
          // Since there's no paginated non-layers endpoint, we'll fetch all layers
          // and filter them client-side
          return new Observable(observer => {
            this.eventsService.getAllLayers().subscribe({
              next: (allLayers) => {
                this.eventsService.getLayersForEvent(String(this.event?.id)).subscribe({
                  next: (eventLayers) => {
                    const eventLayerIds = eventLayers.map(l => l.id);
                    let filteredLayers = allLayers.filter(layer => !eventLayerIds.includes(layer.id));

                    // Apply search filter
                    if (searchTerm) {
                      filteredLayers = filteredLayers.filter(layer =>
                        layer.name.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                    }

                    // Apply pagination
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
