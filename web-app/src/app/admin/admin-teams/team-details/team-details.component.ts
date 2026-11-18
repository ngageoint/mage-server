import { Component, DestroyRef, OnDestroy, OnInit, TemplateRef, ViewChild, computed, effect, inject, linkedSignal, signal } from '@angular/core'
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDialog } from '@angular/material/dialog'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatListModule } from '@angular/material/list'
import { MatMenuModule } from '@angular/material/menu'
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSnackBar } from '@angular/material/snack-bar'
import { PageOf } from '@ngageoint/mage.web-core-lib/paging'
import { User } from '@ngageoint/mage.web-core-lib/user'
import { Team, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { Observable } from 'rxjs'
import { AdminEventsService } from '../../services/admin-events.service'
import { DeleteTeamComponent } from '../delete-team/delete-team.component'
import { CreateTeamDialogComponent } from '../create-team/create-team.component'
import {
  SearchModalComponent,
  SearchModalData,
  SearchModalResult
} from '../../search-modal/search-modal.component'
import { AdminBreadcrumb } from '../../admin-breadcrumb/admin-breadcrumb.model'
import { AdminBreadcrumbService } from '../../admin-breadcrumb/admin-breadcrumb.service'
import { SessionService } from 'mage-web-app/http/session.service'
import { MageEvent } from 'mage-web-app/entities/event/entities.event'
import { RouteReuse } from '../../../route-reuse.strategy'

const TEAMS_BREADCRUMB: AdminBreadcrumb = { title: 'Teams', icon: 'groups', route: ['/admin/teams'] }

const EMPTY_PAGE: PageOf<never> = { items: [], totalCount: 0, pageSize: 0, pageIndex: 0 }

@Component({
    selector: 'mage-team-details',
    templateUrl: './team-details.component.html',
    styleUrls: ['./team-details.component.scss'],
    imports: [
      FormsModule,
      RouterLink,
      MatButtonModule,
      MatCardModule,
      MatDividerModule,
      MatIconModule,
      MatInputModule,
      MatListModule,
      MatMenuModule,
      MatPaginatorModule,
      MatProgressSpinnerModule
    ]
})
export class TeamDetailsComponent implements OnInit, OnDestroy {

  static readonly routeReuse: RouteReuse = RouteReuse.RecreateOnParamChange

  private readonly route: ActivatedRoute = inject(ActivatedRoute)
  private readonly router: Router = inject(Router)
  private readonly dialog: MatDialog = inject(MatDialog)
  private readonly snackBar: MatSnackBar = inject(MatSnackBar)
  private readonly destroyRef: DestroyRef = inject(DestroyRef)
  private readonly sessionService: SessionService = inject(SessionService)
  private readonly teamService: TeamService = inject(TeamService)
  private readonly eventsService: AdminEventsService = inject(AdminEventsService)
  private readonly breadcrumbService: AdminBreadcrumbService = inject(AdminBreadcrumbService)

  private takeUntilDestroyed = <T>() => takeUntilDestroyed<T>(this.destroyRef)

  @ViewChild('breadcrumbActions', { static: true })
  breadcrumbActions!: TemplateRef<unknown>

  readonly teamId: string = this.route.snapshot.paramMap.get('teamId')

  private teamResource = rxResource({
    stream: () => this.teamService.getTeamById(this.teamId)
  })

  team = linkedSignal<Team | null>(() => this.teamResource.hasValue() ? this.teamResource.value() : null)
  teamLoadError = this.teamResource.error

  private myAclPermissions = computed(() => {
    const myId = this.sessionService.user?.id
    return (myId && this.team()?.acl?.[myId]?.permissions) || []
  })

  hasUpdatePermission = computed(() => this.team() !== null &&
    (this.sessionService.hasPermission('UPDATE_TEAM') || this.myAclPermissions().includes('update')))
  hasDeletePermission = computed(() => this.team() !== null &&
    (this.sessionService.hasPermission('DELETE_TEAM') || this.myAclPermissions().includes('delete')))

  breadcrumbs = computed<AdminBreadcrumb[]>(() => {
    const team = this.team()
    return team ? [TEAMS_BREADCRUMB, { title: team.name || 'Team' }] : [TEAMS_BREADCRUMB]
  })

  readonly pageSizeOptions = [5, 10, 25]

  membersPageIndex = signal(0)
  membersPageSize = signal(5)
  memberSearchTerm = signal('')

  members = rxResource({
    params: () => ({
      pageIndex: this.membersPageIndex(),
      pageSize: this.membersPageSize(),
      term: this.memberSearchTerm()
    }),
    stream: ({ params }) => this.teamService.getMembers({ teamId: this.teamId, ...params })
  })
  membersPage = computed<PageOf<User>>(() => this.members.hasValue() ? this.members.value() : EMPTY_PAGE)
  loadingMembers = this.members.isLoading

  eventsPageIndex = signal(0)
  eventsPageSize = signal(5)
  eventSearchTerm = signal('')

  events = rxResource({
    params: () => ({
      page: this.eventsPageIndex(),
      pageSize: this.eventsPageSize(),
      term: this.eventSearchTerm()
    }),
    stream: ({ params }) => this.eventsService.getEvents({
      teamId: this.teamId,
      term: params.term,
      page: params.page,
      page_size: params.pageSize
    })
  })
  eventsPage = computed<PageOf<MageEvent>>(() => this.events.hasValue() ? this.events.value() : EMPTY_PAGE)
  loadingEvents = this.events.isLoading

  constructor() {
    effect(() => this.breadcrumbService.setBreadcrumbs(this.breadcrumbs()))
  }

  ngOnInit(): void {
    this.breadcrumbService.setActions(this.breadcrumbActions)
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setActions(null)
    this.snackBar.dismiss()
  }

  reloadTeam(): void {
    this.teamResource.reload()
  }

  onMembersPageChange(event: PageEvent): void {
    this.membersPageSize.set(event.pageSize)
    this.membersPageIndex.set(event.pageIndex)
  }

  onMembersSearchChange(searchTerm?: string): void {
    this.membersPageIndex.set(0)
    this.memberSearchTerm.set(searchTerm || '')
  }

  editTeamDetails(): void {
    const team = this.team()
    if (!team) {
      return
    }

    const dialogRef = this.dialog.open(CreateTeamDialogComponent, {
      width: '40vw',
      maxWidth: '40vw',
      disableClose: true,
      data: { team }
    })

    dialogRef.afterClosed().subscribe((updatedTeam: Team) => {
      if (updatedTeam) {
        this.team.set(updatedTeam)
      }
    })
  }

  addMember(): void {
    const dialogRef = this.dialog.open<SearchModalComponent, SearchModalData, SearchModalResult>(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Members to Team',
        searchPlaceholder: 'Search for users to add...',
        icon: 'person',
        searchFunction: (
          term: string,
          pageIndex: number,
          pageSize: number
        ): Observable<PageOf<User>> => {
          return this.teamService.getNonMembers({ teamId: this.teamId, term, pageIndex, pageSize })
        },
        columns: [{
          key: 'name',
          label: 'Name',
          displayFunction: (user: User) => user.username || 'Unknown',
          width: '40%'
        },{
          key: 'displayName',
          label: 'Display Name',
          displayFunction: (user: User) => user.displayName || 'Unknown',
          width: '35%'
        },{
          key: 'email',
          label: 'Email',
          displayFunction: (user: User) => user.email || 'No email provided',
          width: '35%'
        }]
      }
    })

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.selectedItem) {
        this.teamService
          .addUserToTeam(this.teamId, result.selectedItem)
          .pipe(this.takeUntilDestroyed())
          .subscribe({
            next: () => this.members.reload(),
            error: (error) => console.error('Error adding member:', error)
          })
      }
    })
  }

  removeMember($event: MouseEvent, user: User): void {
    $event.stopPropagation()
    this.teamService
      .removeMember(this.teamId, user.id)
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.members.reload()

          const snackBarRef = this.snackBar.open(`Removed ${user.displayName} from team`, 'Undo', { duration: 5000 })
          snackBarRef.onAction().subscribe(() => {
            this.teamService.addUserToTeam(this.teamId, user).subscribe({
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

  getUserRole(user: User): string {
    return this.team()?.acl?.[user.id]?.role || 'GUEST'
  }

  updateUserRole(user: User, newRole: string): void {
    this.teamService
      .updateUserRole(this.teamId, user.id, newRole)
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: (updatedTeam: Team) => this.team.set(updatedTeam),
        error: (error) => console.error('Error updating member role:', error)
      })
  }

  addEventToTeam(): void {
    const team = this.team()
    if (!team) {
      return
    }
    const dialogRef = this.dialog.open<SearchModalComponent, SearchModalData, SearchModalResult>(SearchModalComponent, {
      width: '600px',
      panelClass: 'search-modal-dialog',
      data: {
        title: 'Add Events to Team',
        searchPlaceholder: 'Search for events to add...',
        searchFunction: (
          searchTerm: string,
          page: number,
          pageSize: number
        ): Observable<PageOf<MageEvent>> => {
          return this.eventsService.getEvents({
            term: searchTerm,
            page,
            page_size: pageSize,
            excludeTeamId: team.id
          })
        },
        columns: [{
          key: 'name',
          label: 'Event Name',
          displayFunction: (event: MageEvent) => event.name || 'Unnamed Event',
          width: '50%'
        },{
          key: 'description',
          label: 'Description',
          displayFunction: (event: MageEvent) => event.description || 'No description',
          width: '50%'
        }]
      }
    })

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.selectedItem) {
        this.eventsService
          .addTeamToEvent(String(result.selectedItem.id), team)
          .pipe(this.takeUntilDestroyed())
          .subscribe({
            next: () => this.events.reload(),
            error: (error) => console.error('Error adding event:', error)
          })
      }
    })
  }

  removeEventFromTeam($event: MouseEvent, event: MageEvent): void {
    $event.stopPropagation()
    const team = this.team()
    if (!team) {
      return
    }

    this.eventsService
      .removeEventFromTeam(String(event.id), team.id)
      .pipe(this.takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.events.reload()

          const snackBarRef = this.snackBar.open(`Removed ${event.name} from team`, 'Undo', { duration: 5000 })
          snackBarRef.onAction().subscribe(() => {
            this.eventsService.addTeamToEvent(String(event.id), team).subscribe({
              next: () => this.events.reload(),
              error: (error) => {
                console.error('Error restoring event:', error)
                this.snackBar.open('Error restoring event', 'Close', { duration: 5000 })
              }
            })
          })
        },
        error: (error) => console.error('Error removing event:', error)
      })
  }

  deleteTeam(): void {
    const team = this.team()
    if (!team) {
      return
    }

    const dialogRef = this.dialog.open(DeleteTeamComponent, {
      width: '600px',
      data: { team }
    })

    dialogRef.afterClosed().subscribe((deleted: boolean) => {
      if (deleted) {
        this.router.navigate(['../../teams'], { relativeTo: this.route })
      }
    })
  }

  onEventsPageChange(event: PageEvent): void {
    this.eventsPageSize.set(event.pageSize)
    this.eventsPageIndex.set(event.pageIndex)
  }

  onTeamEventSearchChange(searchTerm?: string): void {
    this.eventsPageIndex.set(0)
    this.eventSearchTerm.set(searchTerm || '')
  }
}
