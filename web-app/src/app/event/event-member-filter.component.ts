import { Component, ElementRef, ViewChild, computed, effect, input, output, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { COMMA, ENTER } from '@angular/cdk/keycodes'
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { MatChipsModule } from '@angular/material/chips'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { User } from '@ngageoint/mage.web-core-lib/user'
import { toSignal } from '@angular/core/rxjs-interop'
import { Subject, debounceTime, of, switchMap } from 'rxjs'
import { EventService } from './event.service'
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
  event = input<any>()
  teams = input<Team[]>([])
  filter = input<MemberFilterSelection | null>(null)

  memberFilterChanged = output<MemberFilterSelection>()

  @ViewChild('memberInput') memberInput: ElementRef<HTMLInputElement>

  readonly separatorKeysCodes: number[] = [ENTER, COMMA]

  inputControl = new FormControl('')
  private queryText = toSignal(this.inputControl.valueChanges, { initialValue: '' })

  private search$ = new Subject<{ event: any; teams: Team[]; term: string }>()
  private searchResults = toSignal(
    this.search$.pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      switchMap(({ event, teams, term }) => {
        if (!event || !teams.length) {
          return of([] as User[])
        }
        return this.eventService.searchMembers(event, term)
      })
    ),
    { initialValue: [] as User[] }
  )

  selected = signal<MemberOption[]>([])

  private teamOptions = computed<MemberOption[]>(() =>
    this.event() ? this.teams().map(t => this.teamToOption(t)) : []
  )

  private userOptions = computed<MemberOption[]>(() =>
    [...this.searchResults()]
      .map(u => this.userToOption(u))
      .sort((a, b) => a.display.localeCompare(b.display))
  )

  filteredGroups = computed<MemberOptionGroup[]>(() => this.buildGroups())

  constructor(private eventService: EventService) {
    effect(() => {
      const event = this.event()
      const teams = this.teams()
      const term = this.queryText() ?? ''
      this.search$.next({ event, teams, term: typeof term === 'string' ? term : '' })
    })

    effect((onCleanup) => {
      const event = this.event()
      const teams = this.teams()
      const filter = this.filter()
      this.selected.set([])

      if (!event || !teams.length || !filter) {
        return
      }

      const teamSelections = this.teamOptions().filter(o => filter.teamIds.includes(o.id))

      if (filter.userIds.length) {
        const subscription = this.eventService.getMembers(event).subscribe((users: User[]) => {
          const userSelections = users
            .filter(u => filter.userIds.includes(u.id))
            .map(u => this.userToOption(u))
          this.selected.set([...teamSelections, ...userSelections])
        })
        onCleanup(() => subscription.unsubscribe())
      } else {
        this.selected.set(teamSelections)
      }
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
