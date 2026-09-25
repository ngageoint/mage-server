import { Component, DestroyRef, ElementRef, ViewChild, computed, effect, inject, input, output, signal, untracked } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { COMMA, ENTER } from '@angular/cdk/keycodes'
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { MatChipsModule } from '@angular/material/chips'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { User } from '@ngageoint/mage.web-core-lib/user'
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop'
import { Subject, debounceTime, of, switchMap } from 'rxjs'
import { EventService } from './event.service'
import { EventId } from '../entities/event/entities.event'
import { Team } from '../entities/team/entities.team'

const SEARCH_DEBOUNCE_MS = 250

export interface MemberFilterSelection {
  teamIds: string[]
  userIds: string[]
}

type MemberOptionType = 'team' | 'user'

interface MemberOption {
  type: MemberOptionType
  id: string
  display: string
}

interface MemberOptionGroup {
  label: string
  options: MemberOption[]
}

@Component({
  selector: 'event-member-filter',
  templateUrl: './event-member-filter.component.html',
  styleUrls: ['./event-member-filter.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ]
})
export class EventMemberFilterComponent {
  eventId = input<EventId | null | undefined>()
  teams = input<Team[]>([])
  initialFilter = input<MemberFilterSelection | null>(null)

  memberFilterChanged = output<MemberFilterSelection>()

  @ViewChild('memberInput') memberInput: ElementRef<HTMLInputElement>

  readonly separatorKeysCodes: number[] = [ENTER, COMMA]

  inputControl = new FormControl('')
  private queryText = toSignal(this.inputControl.valueChanges, { initialValue: '' })

  private search$ = new Subject<{ eventId: EventId | null | undefined; teams: Team[]; term: string }>()
  private searchResults = toSignal(
    this.search$.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      switchMap(({ eventId, teams, term }) => {
        if (eventId == null || !teams.length) {
          return of([] as User[])
        }
        return this.eventService.searchMembers(eventId, term)
      })
    ),
    { initialValue: [] as User[] }
  )

  selected = signal<MemberOption[]>([])

  private destroyRef = inject(DestroyRef)
  private initialized = false
  private lastEventId: EventId | null | undefined

  private teamOptions = computed<MemberOption[]>(() =>
    this.eventId() != null ? this.teams().map(t => this.teamToOption(t)) : []
  )

  private userOptions = computed<MemberOption[]>(() =>
    [...this.searchResults()]
      .map(u => this.userToOption(u))
      .sort((a, b) => a.display.localeCompare(b.display))
  )

  filteredGroups = computed<MemberOptionGroup[]>(() => this.buildGroups())

  constructor(private eventService: EventService) {
    effect(() => {
      const eventId = this.eventId()
      const teams = this.teams()
      const term = this.queryText() ?? ''
      this.search$.next({ eventId, teams, term: typeof term === 'string' ? term : '' })
    })

    effect(() => {
      const eventId = this.eventId()
      const teams = this.teams()
      const initialFilter = this.initialFilter()
      if (this.initialized) return

      if (!initialFilter) {
        this.initialized = true
        return
      }
      if (eventId == null || !teams.length) return

      this.initialized = true
      untracked(() => this.select(eventId, initialFilter))
    })

    effect(() => {
      const eventId = this.eventId()
      untracked(() => {
        if (this.lastEventId !== undefined && eventId !== this.lastEventId) {
          this.selected.set([])
        }
        this.lastEventId = eventId
      })
    })
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const option: MemberOption = event.option.value
    if (!this.selected().find(s => s.type === option.type && s.id === option.id)) {
      this.selected.set([...this.selected(), option])
      this.emit()
    }
    this.inputControl.setValue('')
    this.memberInput.nativeElement.value = ''
    this.memberInput.nativeElement.focus()
  }

  remove(option: MemberOption): void {
    this.selected.set(this.selected().filter(s => !(s.type === option.type && s.id === option.id)))
    this.emit()
  }

  displayFn(): string {
    return ''
  }

  private select(eventId: EventId, filter: MemberFilterSelection): void {
    const teamSelections = this.teamOptions().filter(o => filter.teamIds.includes(o.id))

    if (!filter.userIds.length) {
      this.selected.set(teamSelections)
      return
    }

    this.eventService.getMembers(eventId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(users => {
      if (this.eventId() !== eventId) return

      const userSelections = users
        .filter(u => filter.userIds.includes(u.id))
        .map(u => this.userToOption(u))
      this.selected.set([...teamSelections, ...userSelections])
    })
  }

  private buildGroups(): MemberOptionGroup[] {
    const query = (this.queryText() || '').toLowerCase()
    const selectedIds = new Set(this.selected().map(s => `${s.type}:${s.id}`))

    const teams = this.teamOptions()
      .filter(o => !selectedIds.has(`team:${o.id}`))
      .filter(o => o.display.toLowerCase().includes(query))

    const users = this.userOptions()
      .filter(o => !selectedIds.has(`user:${o.id}`))

    const groups: MemberOptionGroup[] = []
    if (teams.length) groups.push({ label: 'Teams', options: teams })
    if (users.length) groups.push({ label: 'Members', options: users })
    return groups
  }

  private teamToOption(team: Team): MemberOption {
    return { type: 'team', id: String(team.id), display: team.name || '' }
  }

  private userToOption(user: User): MemberOption {
    return {
      type: 'user',
      id: user.id,
      display: user.displayName || user.username
    }
  }

  private emit(): void {
    this.memberFilterChanged.emit({
      teamIds: this.selected().filter(s => s.type === 'team').map(s => s.id),
      userIds: this.selected().filter(s => s.type === 'user').map(s => s.id)
    })
  }
}
