import { Component, OnInit, OnDestroy, TemplateRef, ViewChild, DestroyRef, inject } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent as PageEvent } from '@angular/material/paginator';
import { MatTableDataSource as MatTableDataSource } from '@angular/material/table';
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { forkJoin, Observable } from 'rxjs';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { Event as MageEvent, Layer } from 'mage-web-app/filter/filter.types';
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model';
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service';
import { AdminEventsService } from '../../services/admin-events.service';
import { User as MageUser } from '@ngageoint/mage.web-core-lib/user';
import {
  SearchModalComponent,
  SearchModalData,
  SearchModalResult,
  SearchModalColumn
} from '../../search-modal/search-modal.component';
import { DeleteEventComponent } from '../delete-event/delete-event.component';
import { CreateEventDialogComponent } from '../create-event/create-event.component';
import { UploadFormDialogComponent } from '../upload-form/upload-form.component';
import { layerIconName } from '../../../entities/layer/layer';

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
    standalone: false
})
export class EventDetailsComponent implements OnInit, OnDestroy {

  @ViewChild('restrictions', { static: false }) restrictionsForm?: NgForm;

  event: ExtendedEvent | null = null;
  eventTeam: Team | null = null;

  #breadcrumbs: AdminBreadcrumb[] = [{
    title: 'Events',
    icon: 'event',
    route: ['/admin/events']
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

  hasReadPermission = false;
  hasUpdatePermission = false;
  hasDeletePermission = false;

  showArchivedForms = false;
  previewForm: any = null;
  restrictionsError: any = null;
  formsAnimationState = 0;

  loadingMembers = true;
  membersPageIndex = 0;
  membersPageSize = 5;
  membersPage: PagedResult<MageUser> = { items: [], totalCount: 0 };
  memberSearchTerm = '';
  membersDataSource = new MatTableDataSource<MageUser>();
  pageSizeOptions = [5, 10, 25];

  loadingTeams = true;
  teamsPageIndex = 0;
  teamsPageSize = 5;
  teamsPage: PagedResult<Team> = { items: [], totalCount: 0 };
  teamSearchTerm = '';
  teamsDataSource = new MatTableDataSource<Team>();

  loadingLayers = true;
  layersPageIndex = 0;
  layersPageSize = 5;
  layersPage: PagedResult<Layer> = { items: [], totalCount: 0 };
  layerSearchTerm = '';
  eventLayers: Layer[] = [];
  layersDataSource = new MatTableDataSource<Layer>();

  #destroyRef = inject(DestroyRef)
  #takeUntilDestroyed = <T>() => takeUntilDestroyed<T>(this.#destroyRef)

  constructor(
    private eventsService: AdminEventsService,
    private teamService: TeamService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private breadcrumbService: AdminBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
    this.breadcrumbService.setActions(this.breadcrumbActions);

    const eventId = this.route.snapshot.paramMap.get('eventId') || this.route.snapshot.paramMap.get('id');

    if (!eventId) {
      console.error('Missing eventId route param');
      this.router.navigate(['../../events'], { relativeTo: this.route });
      return;
    }

    forkJoin({
      event: this.eventsService.getEventById(eventId),
      teams: this.eventsService.getTeamsInEvent(String(eventId), {
        page: 0,
        page_size: 100,
        total: false
      })
    })
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: ({ event, teams }) => {
          this.event = event;

          this.eventTeam =
            teams.items.find((team) => team.teamEventId === event.id) || null;

          this.getMembersPage();
          this.getTeamsPage();
          this.loadLayers();

          this.breadcrumbs.push({ title: this.event?.name || 'Event' });
          this.breadcrumbService.setBreadcrumbs(this.breadcrumbs);
        },
        error: (error) => {
          console.error('Error loading event:', error);
        }
      });

    this.hasReadPermission = true;
    this.hasUpdatePermission = true;
    this.hasDeletePermission = true;
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null);
  }

  getMembersPage(): void {
    if (!this.event?.id) {
      return;
    }
    this.eventsService
      .getMembers(String(this.event.id), {
        page: this.membersPageIndex,
        page_size: this.membersPageSize,
        term: this.memberSearchTerm,
        total: true
      })
      .pipe(this.#takeUntilDestroyed())
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

  removeMember($event: MouseEvent, user: MageUser): void {
    $event.stopPropagation();

    if (!this.eventTeam?.id) {
      console.error('Event team not found');
      return;
    }

    const eventTeamId = String(this.eventTeam.id);

    this.teamService
      .removeMember(eventTeamId, String(user.id))
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.getMembersPage();

          const snackBarRef = this.snackBar.open(`Removed ${user.displayName} from team`, 'Undo', { duration: 5000 });
          snackBarRef.onAction().subscribe(() => {
            this.teamService.addUserToTeam(eventTeamId, user).subscribe({
              next: () => this.getMembersPage(),
              error: (error) => {
                console.error('Error restoring member:', error);
                this.snackBar.open('Error restoring member', 'Close', { duration: 5000 });
              }
            });
          });
        },
        error: (error) => console.error('Error removing member:', error)
      });
  }

  searchMembers(): void {
    this.membersPageIndex = 0;
    this.getMembersPage();
  }

  getTeamsPage(): void {
    if (!this.event?.id) {
      return;
    }
    this.eventsService
      .getTeamsInEvent(String(this.event.id), {
        page: this.teamsPageIndex,
        page_size: this.teamsPageSize,
        term: this.teamSearchTerm,
        total: true,
        omit_event_teams: true
      })
      .pipe(this.#takeUntilDestroyed())
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

  removeTeam($event: MouseEvent, team: Team): void {
    $event.stopPropagation();

    if (!this.event?.id) {
      return;
    }

    const eventId = String(this.event.id);

    this.eventsService
      .removeEventFromTeam(eventId, String(team.id))
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.getTeamsPage();

          const snackBarRef = this.snackBar.open(`Removed ${team.name} from event`, 'Undo', { duration: 5000 });
          snackBarRef.onAction().subscribe(() => {
            this.eventsService.addTeamToEvent(eventId, team).subscribe({
              next: () => this.getTeamsPage(),
              error: (error) => {
                console.error('Error restoring team:', error);
                this.snackBar.open('Error restoring team', 'Close', { duration: 5000 });
              }
            });
          });
        },
        error: (error) => console.error('Error removing team:', error)
      });
  }

  searchTeams(): void {
    this.teamsPageIndex = 0;
    this.getTeamsPage();
  }

  loadLayers(): void {
    if (!this.event?.id) {
      return;
    }
    this.eventsService
      .getLayersForEvent(String(this.event.id))
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: (layers) => {
          this.loadingLayers = false;
          this.eventLayers = layers || [];
          this.filterAndPaginateLayers();
        },
        error: (error) => {
          this.loadingLayers = false;
          console.error('Error loading layers:', error);
        }
      });
  }

  filterAndPaginateLayers(): void {
    let filteredLayers = this.eventLayers || [];

    if (this.layerSearchTerm) {
      const term = this.layerSearchTerm.toLowerCase();
      filteredLayers = filteredLayers.filter((layer) =>
        (layer.name || '').toLowerCase().includes(term)
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

  searchLayers(): void {
    this.layersPageIndex = 0;
    this.filterAndPaginateLayers();
  }

  layerIcon(layer: Layer): string {
    return layerIconName(layer);
  }

  addLayer($event: MouseEvent, layer: Layer): void {
    $event.stopPropagation();
    if (!this.event?.id) {
      return;
    }
    this.eventsService
      .addLayerToEvent(String(this.event.id), { id: layer.id })
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: () => this.loadLayers(),
        error: (error) => console.error('Error adding layer:', error)
      });
  }

  removeLayer($event: MouseEvent, layer: Layer): void {
    $event.stopPropagation();

    if (!this.event?.id) {
      return;
    }

    const eventId = String(this.event.id);

    this.eventsService
      .removeLayerFromEvent(eventId, layer.id)
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.loadLayers();

          const snackBarRef = this.snackBar.open(`Removed ${layer.name} from event`, 'Undo', { duration: 5000 });
          snackBarRef.onAction().subscribe(() => {
            this.eventsService.addLayerToEvent(eventId, { id: layer.id }).subscribe({
              next: () => this.loadLayers(),
              error: (error) => {
                console.error('Error restoring layer:', error);
                this.snackBar.open('Error restoring layer', 'Close', { duration: 5000 });
              }
            });
          });
        },
        error: (error) => console.error('Error removing layer:', error)
      });
  }

  get nonArchivedForms(): any[] {
    return this.event?.forms ? this.event.forms.filter((f: any) => !f.archived) : [];
  }

  saveFormRestrictions(): void {
    if (!this.event?.id) {
      return;
    }
    this.restrictionsError = null;
    const forms = Array.isArray(this.event.forms) ? this.event.forms : [];
    const eventUpdate: any = {
      minObservationForms: this.event.minObservationForms,
      maxObservationForms: this.event.maxObservationForms,
      forms: forms.map((form: any) => ({
        ...form,
        min: form.min,
        max: form.max
      }))
    };

    this.eventsService
      .updateEvent(String(this.event.id), eventUpdate)
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: (updatedEvent: any) => {
          if (!this.event) {
            return;
          }
          this.event.minObservationForms = updatedEvent.minObservationForms;
          this.event.maxObservationForms = updatedEvent.maxObservationForms;
          updatedEvent.forms?.forEach((updatedForm: any) => {
            const localForm = this.event?.forms?.find((f: any) => f.id === updatedForm.id);
            if (localForm) {
              localForm.min = updatedForm.min;
              localForm.max = updatedForm.max;
            }
          });
          this.restrictionsForm?.form.markAsPristine();
        },
        error: (error) => {
          console.error('Error saving form restrictions:', error);
          this.restrictionsError = error?.error || {
            message: 'Failed to save form restrictions. Please try again.'
          };
        }
      });
  }

  uploadForm(): void {
    if (!this.event) {
      return;
    }
    const dialogRef = this.dialog.open(UploadFormDialogComponent, {
      width: '600px',
      maxWidth: '50vw',
      data: { event: this.event }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.id && this.event?.id) {
        this.router.navigate(['../../events', this.event.id, 'forms', result.id], { relativeTo: this.route });
      }
    });
  }

  onFormsReordered(event: CdkDragDrop<any[]>): void {
    if (!this.event?.forms) {
      return;
    }
    const forms = [...this.event.forms];
    moveItemInArray(forms, event.previousIndex, event.currentIndex);
    this.updateFormsOrder(forms);
  }

  private updateFormsOrder(forms: any[]): void {
    if (!this.event?.id) {
      return;
    }
    this.event.forms = forms;
    this.formsAnimationState++;
    this.eventsService
      .updateEvent(String(this.event.id), { forms })
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: (updatedEvent) => {
          this.event = updatedEvent as any;
        },
        error: (error) => {
          console.error('Error updating forms order:', error);
          this.eventsService
            .getEventById(String(this.event.id))
            .pipe(this.#takeUntilDestroyed())
            .subscribe({
              next: (event) => {
                this.event = event as any;
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

  trackByFormId(_: number, form: any): any {
    return form?.id ?? form;
  }

  get filteredForms(): any[] {
    const forms = this.event?.forms || [];
    return this.showArchivedForms ? forms : forms.filter((f: any) => !f.archived);
  }

  getUserRole(user: MageUser): string {
    if (!this.eventTeam?.acl) {
      return 'GUEST';
    }
    const key = String(user.id);
    return this.eventTeam.acl[key]?.role || 'GUEST';
  }

  getRoleClass(user: MageUser): string {
    const role = this.getUserRole(user);
    return `user-role-badge role-${role.toLowerCase()}`;
  }

  updateUserRole(user: MageUser, newRole: string): void {
    if (!this.eventTeam?.id || !newRole) {
      return;
    }
    this.teamService
      .updateUserRole(String(this.eventTeam.id), String(user.id), newRole)
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: (updatedTeam: Team) => {
          this.eventTeam = updatedTeam;
          this.membersDataSource.data = [...this.membersDataSource.data];
        },
        error: (error) => console.error('Error updating user role:', error)
      });
  }

  editEventDetails(): void {
    if (!this.event) {
      return;
    }
    const dialogRef = this.dialog.open(CreateEventDialogComponent, {
      width: '600px',
      data: { event: this.event }
    });

    dialogRef.afterClosed().subscribe((updatedEvent: ExtendedEvent | undefined) => {
      if (!updatedEvent) {
        return;
      }
      this.event = updatedEvent;
      this.breadcrumbs = [{ title: 'Events', icon: 'event', route: ['/admin/events'] }, { title: this.event?.name || 'Event' }];
    });
  }

  completeEvent(mageEvent: ExtendedEvent): void {
    if (!mageEvent?.id) {
      return;
    }
    const updatedEvent = { ...mageEvent, complete: true };
    this.eventsService
      .updateEvent(String(mageEvent.id), updatedEvent)
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: (updated) => (this.event = updated as any),
        error: (error) => console.error('Error completing event:', error)
      });
  }

  activateEvent(mageEvent: ExtendedEvent): void {
    if (!mageEvent?.id) {
      return;
    }
    const updatedEvent = { ...mageEvent, complete: false };
    this.eventsService
      .updateEvent(String(mageEvent.id), updatedEvent)
      .pipe(this.#takeUntilDestroyed())
      .subscribe({
        next: (updated) => (this.event = updated as any),
        error: (error) => console.error('Error activating event:', error)
      });
  }

  deleteEvent(): void {
    if (!this.event) {
      return;
    }
    const dialogRef = this.dialog.open(DeleteEventComponent, {
      width: '600px',
      data: { event: this.event }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.router.navigate(['../../events'], { relativeTo: this.route });
      }
    });
  }

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
    this.layerSearchTerm = searchTerm || '';
    this.layersPageIndex = 0;
    this.filterAndPaginateLayers();
  }

  onLayersPageChange(event: PageEvent): void {
    this.layersPageIndex = event.pageIndex;
    this.layersPageSize = event.pageSize;
    this.filterAndPaginateLayers();
  }

  addMemberToEvent(): void {
    if (!this.eventTeam?.id) {
      console.error('Event team not found');
      return;
    }

    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Member to Event',
        searchPlaceholder: 'Search for users to add...',
        type: 'members',
        icon: 'person',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return this.eventsService.getNonMembers(String(this.event?.id), {
            term: searchTerm,
            page,
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
            displayFunction: (user: MageUser) => (user as any).email || 'No email provided',
            width: '35%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem && this.eventTeam?.id) {
        this.teamService.addUserToTeam(String(this.eventTeam.id), result.selectedItem).subscribe({
          next: () => this.getMembersPage(),
          error: (error) => console.error('Error adding member:', error)
        });
      }
    });
  }

  addTeamToEvent(): void {
    if (!this.event?.id) {
      return;
    }
    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Team to Event',
        searchPlaceholder: 'Search for teams to add...',
        type: 'teams',
        icon: 'groups',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return this.eventsService.getTeamsNotInEvent(String(this.event?.id), {
            term: searchTerm,
            page,
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
      if (result?.selectedItem && this.event?.id) {
        this.eventsService.addTeamToEvent(String(this.event.id), result.selectedItem).subscribe({
          next: () => this.getTeamsPage(),
          error: (error) => console.error('Error adding team:', error)
        });
      }
    });
  }

  addLayerToEvent(): void {
    if (!this.event?.id) {
      return;
    }
    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Layer to Event',
        searchPlaceholder: 'Search for layers to add...',
        type: 'layers',
        icon: (layer: Layer) => this.layerIcon(layer),
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return new Observable((observer) => {
            this.eventsService.getAllLayers().subscribe({
              next: (allLayers) => {
                this.eventsService.getLayersForEvent(String(this.event?.id)).subscribe({
                  next: (eventLayers) => {
                    const eventLayerIds = (eventLayers || []).map((l) => l.id);
                    let filteredLayers = (allLayers || []).filter(
                      (layer) => !eventLayerIds.includes(layer.id)
                    );

                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      filteredLayers = filteredLayers.filter((layer) =>
                        (layer.name || '').toLowerCase().includes(term)
                      );
                    }

                    const start = page * pageSize;
                    const paginatedLayers = filteredLayers.slice(start, start + pageSize);

                    observer.next({
                      items: paginatedLayers,
                      totalCount: filteredLayers.length,
                      pageSize,
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
            displayFunction: (layer: Layer) => (layer as any).type || 'Unknown',
            width: '30%'
          },
          {
            key: 'state',
            label: 'State',
            displayFunction: (layer: Layer) => (layer as any).state || 'Unknown',
            width: '30%'
          }
        ] as SearchModalColumn[]
      } as SearchModalData
    });

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem && this.event?.id) {
        this.eventsService
          .addLayerToEvent(String(this.event.id), { id: result.selectedItem.id })
          .subscribe({
            next: () => this.loadLayers(),
            error: (error) => console.error('Error adding layer:', error)
          });
      }
    });
  }
}
