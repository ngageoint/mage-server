import { Component, OnInit, OnDestroy, TemplateRef, ViewChild, DestroyRef, inject, signal, computed, linkedSignal, effect } from '@angular/core'
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { KeyValuePipe } from '@angular/common'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatListModule } from '@angular/material/list'
import { MatMenuModule } from '@angular/material/menu'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatTooltipModule } from '@angular/material/tooltip'
import { PageOf } from '@ngageoint/mage.web-core-lib/paging'
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { forkJoin, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { FormsModule, NgForm } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop'

import { Layer, layerIconName } from 'mage-web-app/entities/layer/entities.layer'
import { Form, MageEvent } from 'mage-web-app/entities/event/entities.event'
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model'
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service'
import { AdminEventsService } from '../../services/admin-events.service'
import { User as MageUser } from '@ngageoint/mage.web-core-lib/user'
import {
  SearchModalComponent,
  SearchModalData,
  SearchModalResult,
  SearchModalColumn
} from '../../search-modal/search-modal.component'
import { DeleteEventComponent } from '../delete-event/delete-event.component'
import { CreateEventDialogComponent } from '../create-event/create-event.component'
import { UploadFormDialogComponent } from '../upload-form/upload-form.component'
import { AdminEventFormPreviewComponent } from '../admin-event-form/admin-event-form-preview/admin-event-form-preview.component'
import { RouteReuse } from '../../../route-reuse.strategy'

interface EventWithStatus extends MageEvent {
  complete?: boolean
}

interface RestrictionsError {
  message?: string
  errors?: Record<string, { message: string }>
}

const EVENTS_BREADCRUMB: AdminBreadcrumb = { title: 'Events', icon: 'event', route: ['/admin/events'] }

const EMPTY_PAGE: PageOf<never> = { items: [], totalCount: 0, pageSize: 0, pageIndex: 0 }

@Component({
    selector: 'mage-event-details',
    templateUrl: './event-details.component.html',
    styleUrls: ['./event-details.component.scss'],
    imports: [
        KeyValuePipe,
        FormsModule,
        RouterLink,
        DragDropModule,
        MatButtonModule,
        MatCardModule,
        MatDividerModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        AdminEventFormPreviewComponent
    ]
})
export class EventDetailsComponent implements OnInit, OnDestroy {

  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange

  @ViewChild('restrictions', { static: false }) restrictionsForm?: NgForm

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>

  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private dialog = inject(MatDialog)
  private snackBar = inject(MatSnackBar)
  private destroyRef = inject(DestroyRef)

  private teamService = inject(TeamService)
  private eventsService = inject(AdminEventsService)
  private breadcrumbService = inject(AdminBreadcrumbService)

  private takeUntilDestroyed = <T>() => takeUntilDestroyed<T>(this.destroyRef)

  readonly eventId: string = this.route.snapshot.paramMap.get('eventId')

  private eventResource = rxResource({
    stream: () => forkJoin({
      event: this.eventsService.getEventById(this.eventId),
      teams: this.eventsService.getTeamsInEvent(this.eventId, { page: 0, page_size: 100, total: false })
    }).pipe(
      map(({ event, teams }) => ({
        event: event as EventWithStatus,
        eventTeam: teams.items.find((team) => team.teamEventId === event.id) || null
      }))
    )
  })

  event = linkedSignal<EventWithStatus | null>(() =>
    this.eventResource.hasValue() ? this.eventResource.value().event : null)
  eventTeam = linkedSignal<Team | null>(() =>
    this.eventResource.hasValue() ? this.eventResource.value().eventTeam : null)
  eventLoadError = this.eventResource.error

  breadcrumbs = computed<AdminBreadcrumb[]>(() => {
    const event = this.event()
    return event ? [EVENTS_BREADCRUMB, { title: event.name || 'Event' }] : [EVENTS_BREADCRUMB]
  })

  readonly hasUpdatePermission = signal(true).asReadonly()
  readonly hasDeletePermission = signal(true).asReadonly()

  showArchivedForms = signal(false)
  previewForm = signal<Form | null>(null)
  restrictionsError = signal<RestrictionsError | null>(null)

  readonly pageSizeOptions = [5, 10, 25]

  membersPageIndex = signal(0)
  membersPageSize = signal(5)
  memberSearchTerm = signal('')

  members = rxResource({
    params: () => ({
      page: this.membersPageIndex(),
      pageSize: this.membersPageSize(),
      term: this.memberSearchTerm()
    }),
    stream: ({ params }) => this.eventsService.getMembers(this.eventId, {
      page: params.page,
      page_size: params.pageSize,
      term: params.term,
      total: true
    })
  })
  membersPage = computed<PageOf<MageUser>>(() => this.members.hasValue() ? this.members.value() : EMPTY_PAGE)
  loadingMembers = this.members.isLoading

  teamsPageIndex = signal(0)
  teamsPageSize = signal(5)
  teamSearchTerm = signal('')

  teams = rxResource({
    params: () => ({
      page: this.teamsPageIndex(),
      pageSize: this.teamsPageSize(),
      term: this.teamSearchTerm()
    }),
    stream: ({ params }) => this.eventsService.getTeamsInEvent(this.eventId, {
      page: params.page,
      page_size: params.pageSize,
      term: params.term,
      total: true,
      omit_event_teams: true
    })
  })
  teamsPage = computed<PageOf<Team>>(() => this.teams.hasValue() ? this.teams.value() : EMPTY_PAGE)
  loadingTeams = this.teams.isLoading

  layersPageIndex = signal(0)
  layersPageSize = signal(5)
  layerSearchTerm = signal('')

  layers = rxResource({
    stream: () => this.eventsService.getLayersForEvent(this.eventId)
  })
  loadingLayers = this.layers.isLoading

  layersPage = computed<PageOf<Layer>>(() => {
    const term = this.layerSearchTerm().toLowerCase()
    const allLayers = this.layers.hasValue() ? this.layers.value() : []
    const filteredLayers = term
      ? allLayers.filter((layer) => (layer.name || '').toLowerCase().includes(term))
      : allLayers

    const pageIndex = this.layersPageIndex()
    const pageSize = this.layersPageSize()
    const start = pageIndex * pageSize

    return {
      items: filteredLayers.slice(start, start + pageSize),
      totalCount: filteredLayers.length,
      pageSize,
      pageIndex
    }
  })

  readonly layerIcon = layerIconName

  nonArchivedForms = computed(() => (this.event()?.forms || []).filter((form) => !form.archived))
  filteredForms = computed(() => {
    const forms = this.event()?.forms || []
    return this.showArchivedForms() ? forms : forms.filter((form) => !form.archived)
  })

  constructor() {
    effect(() => this.breadcrumbService.setBreadcrumbs(this.breadcrumbs()))
  }

  ngOnInit(): void {
    this.breadcrumbService.setActions(this.breadcrumbActions)
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null)
  }

  reloadEvent(): void {
    this.eventResource.reload()
  }

  removeMember($event: MouseEvent, user: MageUser): void {
    $event.stopPropagation()

    const eventTeam = this.eventTeam()
    if (!eventTeam?.id) {
      console.error('Event team not found')
      return
    }

    const eventTeamId = String(eventTeam.id)

    this.teamService
      .removeMember(eventTeamId, String(user.id))
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.members.reload()

          const snackBarRef = this.snackBar.open(`Removed ${user.displayName} from team`, 'Undo', { duration: 5000 })
          snackBarRef.onAction().subscribe(() => {
            this.teamService.addUserToTeam(eventTeamId, user).subscribe({
              next: () => this.members.reload(),
              error: (error) => {
                console.error('Error restoring member:', error)
                this.snackBar.open('Error restoring member', 'Close', { duration: 5000 })
              }
            })
          })
        },
        error: (error) => console.error('Error removing member:', error)
      })
  }

  removeTeam($event: MouseEvent, team: Team): void {
    $event.stopPropagation()
    this.eventsService
      .removeEventFromTeam(this.eventId, String(team.id))
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.teams.reload()

          const snackBarRef = this.snackBar.open(`Removed ${team.name} from event`, 'Undo', { duration: 5000 })
          snackBarRef.onAction().subscribe(() => {
            this.eventsService.addTeamToEvent(this.eventId, team).subscribe({
              next: () => this.teams.reload(),
              error: (error) => {
                console.error('Error restoring team:', error)
                this.snackBar.open('Error restoring team', 'Close', { duration: 5000 })
              }
            })
          })
        },
        error: (error) => console.error('Error removing team:', error)
      })
  }

  removeLayer($event: MouseEvent, layer: Layer): void {
    $event.stopPropagation()
    this.eventsService
      .removeLayerFromEvent(this.eventId, layer.id)
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.layers.reload()

          const snackBarRef = this.snackBar.open(`Removed ${layer.name} from event`, 'Undo', { duration: 5000 })
          snackBarRef.onAction().subscribe(() => {
            this.eventsService.addLayerToEvent(this.eventId, { id: layer.id }).subscribe({
              next: () => this.layers.reload(),
              error: (error) => {
                console.error('Error restoring layer:', error)
                this.snackBar.open('Error restoring layer', 'Close', { duration: 5000 })
              }
            })
          })
        },
        error: (error) => console.error('Error removing layer:', error)
      })
  }

  saveFormRestrictions(): void {
    const event = this.event()
    this.restrictionsError.set(null)
    const eventUpdate: Partial<MageEvent> = {
      minObservationForms: event.minObservationForms,
      maxObservationForms: event.maxObservationForms,
      forms: event.forms
    }

    this.eventsService
      .updateEvent(this.eventId, eventUpdate)
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: (updated: EventWithStatus) => {
          this.event.update((event) => event && {
            ...event,
            minObservationForms: updated.minObservationForms,
            maxObservationForms: updated.maxObservationForms,
            forms: (event.forms || []).map((form) => {
              const savedForm = updated.forms?.find((saved) => saved.id === form.id)
              return savedForm ? { ...form, min: savedForm.min, max: savedForm.max } : form
            })
          })
          this.restrictionsForm?.form.markAsPristine()
        },
        error: (error) => {
          console.error('Error saving form restrictions:', error)
          this.restrictionsError.set(error?.error || {
            message: 'Failed to save form restrictions. Please try again.'
          })
        }
      })
  }

  uploadForm(): void {
    const dialogRef = this.dialog.open(UploadFormDialogComponent, {
      width: '600px',
      maxWidth: '50vw',
      data: { event: this.event() }
    })

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.id) {
        this.router.navigate(['../../events', this.eventId, 'forms', result.id], { relativeTo: this.route })
      }
    })
  }

  onFormsReordered(drop: CdkDragDrop<Form[]>): void {
    const forms = [...this.event().forms]
    moveItemInArray(forms, drop.previousIndex, drop.currentIndex)
    this.updateFormsOrder(forms)
  }

  private updateFormsOrder(forms: Form[]): void {
    const previousForms = this.event().forms
    this.event.update((event) => event && { ...event, forms })
    this.eventsService
      .updateEvent(this.eventId, { forms })
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        error: (error) => {
          console.error('Error updating forms order:', error)
          this.event.update((event) => event && { ...event, forms: previousForms })
          this.snackBar.open('Error saving the form order', 'Close', { duration: 5000 })
        }
      })
  }

  preview($event: MouseEvent, form: Form): void {
    $event.stopPropagation()
    this.previewForm.set(form)
  }

  closePreview(): void {
    this.previewForm.set(null)
  }

  editEventDetails(): void {
    const dialogRef = this.dialog.open(CreateEventDialogComponent, {
      width: '600px',
      data: { event: this.event() }
    })

    dialogRef.afterClosed().subscribe((updatedEvent: EventWithStatus | undefined) => {
      if (updatedEvent) {
        this.event.set(updatedEvent)
      }
    })
  }

  completeEvent(mageEvent: EventWithStatus): void {
    this.setEventComplete(mageEvent, true)
  }

  activateEvent(mageEvent: EventWithStatus): void {
    this.setEventComplete(mageEvent, false)
  }

  private setEventComplete(mageEvent: EventWithStatus, complete: boolean): void {
    const updatedEvent = { ...mageEvent, complete }
    this.eventsService
      .updateEvent(this.eventId, updatedEvent)
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: (saved: EventWithStatus) => this.event.update((event) => event && { ...event, complete: saved.complete }),
        error: (error) => console.error(`Error ${complete ? 'completing' : 'activating'} event:`, error)
      })
  }

  deleteEvent(): void {
    const dialogRef = this.dialog.open(DeleteEventComponent, {
      width: '600px',
      data: { event: this.event() }
    })

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.router.navigate(['../../events'], { relativeTo: this.route })
      }
    })
  }

  onMemberSearchChange(searchTerm?: string): void {
    this.memberSearchTerm.set(searchTerm || '')
    this.membersPageIndex.set(0)
  }

  onMembersPageChange(event: PageEvent): void {
    this.membersPageIndex.set(event.pageIndex)
    this.membersPageSize.set(event.pageSize)
  }

  onTeamSearchChange(searchTerm?: string): void {
    this.teamSearchTerm.set(searchTerm || '')
    this.teamsPageIndex.set(0)
  }

  onTeamsPageChange(event: PageEvent): void {
    this.teamsPageIndex.set(event.pageIndex)
    this.teamsPageSize.set(event.pageSize)
  }

  onLayerSearchChange(searchTerm?: string): void {
    this.layerSearchTerm.set(searchTerm || '')
    this.layersPageIndex.set(0)
  }

  onLayersPageChange(event: PageEvent): void {
    this.layersPageIndex.set(event.pageIndex)
    this.layersPageSize.set(event.pageSize)
  }

  getUserRole(user: MageUser): string {
    return this.eventTeam()?.acl?.[String(user.id)]?.role || 'GUEST'
  }

  updateUserRole(user: MageUser, newRole: string): void {
    const eventTeam = this.eventTeam()
    if (!eventTeam?.id) {
      return
    }
    this.teamService
      .updateUserRole(String(eventTeam.id), String(user.id), newRole)
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: (updatedTeam: Team) => this.eventTeam.set(updatedTeam),
        error: (error) => console.error('Error updating user role:', error)
      })
  }

  addMemberToEvent(): void {
    const eventTeam = this.eventTeam()
    if (!eventTeam?.id) {
      console.error('Event team not found')
      return
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
          return this.eventsService.getNonMembers(this.eventId, {
            term: searchTerm,
            page,
            page_size: pageSize,
            total: true
          })
        },
        columns: [{
          key: 'name',
          label: 'Name',
          displayFunction: (user: MageUser) => user.username || 'Unknown',
          width: '40%'
        },{
          key: 'displayName',
          label: 'Display Name',
          displayFunction: (user: MageUser) => user.displayName || 'Unknown',
          width: '35%'
        },{
          key: 'email',
          label: 'Email',
          displayFunction: (user: MageUser) => user.email || 'No email provided',
          width: '35%'
        }] as SearchModalColumn[]
      } as SearchModalData
    })

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem) {
        this.teamService.addUserToTeam(String(eventTeam.id), result.selectedItem).subscribe({
          next: () => this.members.reload(),
          error: (error) => console.error('Error adding member:', error)
        })
      }
    })
  }

  addTeamToEvent(): void {
    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Team to Event',
        searchPlaceholder: 'Search for teams to add...',
        type: 'teams',
        icon: 'groups',
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          return this.eventsService.getTeamsNotInEvent(this.eventId, {
            term: searchTerm,
            page,
            page_size: pageSize,
            total: true,
            omit_event_teams: true
          })
        },
        columns: [{
          key: 'name',
          label: 'Team Name',
          displayFunction: (team: Team) => team.name || 'Unnamed Team',
          width: '50%'
        },{
          key: 'description',
          label: 'Description',
          displayFunction: (team: Team) => team.description || 'No description',
          width: '50%'
        }] as SearchModalColumn[]
      } as SearchModalData
    })

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem) {
        this.eventsService.addTeamToEvent(this.eventId, result.selectedItem).subscribe({
          next: () => this.teams.reload(),
          error: (error) => console.error('Error adding team:', error)
        })
      }
    })
  }

  addLayerToEvent(): void {
    const dialogRef = this.dialog.open(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Layer to Event',
        searchPlaceholder: 'Search for layers to add...',
        type: 'layers',
        icon: layerIconName,
        searchFunction: (searchTerm: string, page: number, pageSize: number): Observable<any> => {
          // Search and page the layers that are not already in the event
          return forkJoin({
            allLayers: this.eventsService.getAllLayers(),
            eventLayers: this.eventsService.getLayersForEvent(this.eventId)
          }).pipe(
            map(({ allLayers, eventLayers }) => {
              const eventLayerIds = new Set((eventLayers || []).map((layer) => layer.id))
              const term = searchTerm?.toLowerCase()
              const layers = (allLayers || []).filter((layer) =>
                !eventLayerIds.has(layer.id) && (!term || (layer.name || '').toLowerCase().includes(term)))
              const start = page * pageSize
              return {
                items: layers.slice(start, start + pageSize),
                totalCount: layers.length,
                pageSize,
                pageIndex: page
              }
            })
          )
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
    })

    dialogRef.afterClosed().subscribe((result: SearchModalResult) => {
      if (result?.selectedItem) {
        this.eventsService
          .addLayerToEvent(this.eventId, { id: result.selectedItem.id })
          .subscribe({
            next: () => this.layers.reload(),
            error: (error) => console.error('Error adding layer:', error)
          })
      }
    })
  }
}
