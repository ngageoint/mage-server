import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { Subject, of } from 'rxjs'
import { EventService } from './event.service'
import { EventMemberFilterComponent, MemberFilterSelection } from './event-member-filter.component'

const SEARCH_DEBOUNCE_MS = 250

const team1 = { id: 'team1', name: 'Alpha Team' }
const team2 = { id: 'team2', name: 'Bravo Team' }

const eventMembers = [
  { id: 'u1', displayName: 'Alice Smith', username: 'asmith' },
  { id: 'u2', displayName: 'Bob Jones', username: 'bjones' },
  { id: 'u3', displayName: 'Carol White', username: 'cwhite' }
]

function createEventServiceSpy(): jasmine.SpyObj<EventService> {
  const spy = jasmine.createSpyObj<EventService>('EventService', ['getMembers', 'searchMembers'])
  spy.getMembers.and.returnValue(of(eventMembers as any))
  spy.searchMembers.and.callFake((_eventId: any, term: string) => {
    const q = (term || '').toLowerCase()
    return of(eventMembers.filter(u => u.displayName.toLowerCase().includes(q)) as any)
  })
  return spy
}

describe('EventMemberFilterComponent', () => {
  let component: EventMemberFilterComponent
  let fixture: ComponentFixture<EventMemberFilterComponent>
  let eventService: jasmine.SpyObj<EventService>

  beforeEach(async () => {
    eventService = createEventServiceSpy()

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        EventMemberFilterComponent
      ],
      providers: [
        { provide: EventService, useValue: eventService }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(EventMemberFilterComponent)
    component = fixture.componentInstance
  })

  function setEventAndTeams(eventId: number | null, teams: any[]): void {
    fixture.componentRef.setInput('eventId', eventId)
    fixture.componentRef.setInput('teams', teams)
    fixture.detectChanges()
  }

  function setEventTeamsAndFilter(eventId: number | null, teams: any[], initialFilter: MemberFilterSelection): void {
    fixture.componentRef.setInput('initialFilter', initialFilter)
    fixture.componentRef.setInput('eventId', eventId)
    fixture.componentRef.setInput('teams', teams)
    fixture.detectChanges()
  }

  function selectTeam(id: string, display: string): void {
    component.onOptionSelected({ option: { value: { type: 'team' as const, id, display } } } as any)
  }

  it('should create', () => {
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('loads teams from input and searches members from the event service on input change', fakeAsync(() => {
    setEventAndTeams(1, [team1, team2])
    tick(SEARCH_DEBOUNCE_MS)

    const groups = component.filteredGroups()
    const teamGroup = groups.find(g => g.label === 'Teams')
    const memberGroup = groups.find(g => g.label === 'Members')

    expect(teamGroup?.options.length).toBe(2)
    expect(teamGroup?.options.map(o => o.display)).toEqual(jasmine.arrayContaining(['Alpha Team', 'Bravo Team']))
    expect(memberGroup?.options.length).toBe(3)
    expect(eventService.searchMembers).toHaveBeenCalledWith(1, '')
  }))

  it('shows no groups when teams input is empty', fakeAsync(() => {
    setEventAndTeams(1, [])
    tick(SEARCH_DEBOUNCE_MS)

    expect(component.filteredGroups().length).toBe(0)
    expect(eventService.searchMembers).not.toHaveBeenCalled()
  }))

  it('shows no groups when event id input is not set', fakeAsync(() => {
    setEventAndTeams(null, [team1])
    tick(SEARCH_DEBOUNCE_MS)

    expect(component.filteredGroups().length).toBe(0)
    expect(eventService.searchMembers).not.toHaveBeenCalled()
  }))

  it('searches the server for members as the query changes, debounced', fakeAsync(() => {
    setEventAndTeams(1, [team1, team2])
    tick(SEARCH_DEBOUNCE_MS)
    eventService.searchMembers.calls.reset()

    component.inputControl.setValue('ali')
    fixture.detectChanges()
    tick(SEARCH_DEBOUNCE_MS)

    expect(eventService.searchMembers).toHaveBeenCalledWith(1, 'ali')
    const groups = component.filteredGroups()
    const memberGroup = groups.find(g => g.label === 'Members')
    expect(memberGroup?.options.length).toBe(1)
    expect(memberGroup?.options[0].display).toBe('Alice Smith')
  }))

  it('filters team groups locally by the search query', fakeAsync(() => {
    setEventAndTeams(1, [team1, team2])
    tick(SEARCH_DEBOUNCE_MS)
    component.inputControl.setValue('alpha')
    tick(SEARCH_DEBOUNCE_MS)

    const groups = component.filteredGroups()
    const teamGroup = groups.find(g => g.label === 'Teams')
    expect(teamGroup?.options.length).toBe(1)
    expect(teamGroup?.options[0].display).toBe('Alpha Team')
  }))

  it('emits teamIds and userIds when a team is selected', fakeAsync(() => {
    setEventAndTeams(1, [team1, team2])
    tick(SEARCH_DEBOUNCE_MS)

    const emitted: MemberFilterSelection[] = []
    component.memberFilterChanged.subscribe(s => emitted.push(s))

    component.onOptionSelected({ option: { value: { type: 'team', id: 'team1', display: 'Alpha Team', raw: team1 } } } as any)

    expect(emitted.length).toBe(1)
    expect(emitted[0].teamIds).toEqual(['team1'])
    expect(emitted[0].userIds).toEqual([])
  }))

  it('emits teamIds and userIds when a user is selected', fakeAsync(() => {
    setEventAndTeams(1, [team1])
    tick(SEARCH_DEBOUNCE_MS)

    const emitted: MemberFilterSelection[] = []
    component.memberFilterChanged.subscribe(s => emitted.push(s))

    const userOption = { type: 'user' as const, id: 'u1', display: 'Alice Smith', raw: eventMembers[0] }
    component.onOptionSelected({ option: { value: userOption } } as any)

    expect(emitted.length).toBe(1)
    expect(emitted[0].teamIds).toEqual([])
    expect(emitted[0].userIds).toEqual(['u1'])
  }))

  it('does not add duplicate selections', fakeAsync(() => {
    setEventAndTeams(1, [team1])
    tick(SEARCH_DEBOUNCE_MS)

    const teamOption = { type: 'team' as const, id: 'team1', display: 'Alpha Team', raw: team1 }
    component.onOptionSelected({ option: { value: teamOption } } as any)
    component.onOptionSelected({ option: { value: teamOption } } as any)

    expect(component.selected().length).toBe(1)
  }))

  it('removes a selection and emits', fakeAsync(() => {
    setEventAndTeams(1, [team1])
    tick(SEARCH_DEBOUNCE_MS)

    const emitted: MemberFilterSelection[] = []
    component.memberFilterChanged.subscribe(s => emitted.push(s))

    const teamOption = { type: 'team' as const, id: 'team1', display: 'Alpha Team', raw: team1 }
    component.onOptionSelected({ option: { value: teamOption } } as any)
    component.remove(teamOption)

    expect(component.selected().length).toBe(0)
    expect(emitted[emitted.length - 1].teamIds).toEqual([])
  }))

  describe('when the event changes', () => {
    it('clears the selection', fakeAsync(() => {
      setEventAndTeams(1, [team1])
      tick(SEARCH_DEBOUNCE_MS)
      selectTeam('team1', 'Alpha Team')
      expect(component.selected().length).toBe(1)

      setEventAndTeams(2, [team2])
      tick(SEARCH_DEBOUNCE_MS)

      expect(component.selected().length).toBe(0)
    }))

    it('keeps the selection when only the teams change for the same event', fakeAsync(() => {
      setEventAndTeams(1, [team1])
      tick(SEARCH_DEBOUNCE_MS)
      selectTeam('team1', 'Alpha Team')

      setEventAndTeams(1, [team1, team2])
      tick(SEARCH_DEBOUNCE_MS)

      expect(component.selected().map(s => s.id)).toEqual(['team1'])
    }))

    it('does not select the members that finish loading for the previous event', fakeAsync(() => {
      const members$ = new Subject<any>()
      eventService.getMembers.and.returnValue(members$)
      setEventTeamsAndFilter(1, [team1], { teamIds: [], userIds: ['u1'] })
      tick(SEARCH_DEBOUNCE_MS)

      setEventAndTeams(2, [team2])
      members$.next(eventMembers)
      tick(SEARCH_DEBOUNCE_MS)

      expect(component.selected().length).toBe(0)
    }))
  })

  describe('initial filter', () => {
    it('is read once, so a later change from the parent does not touch the selection', fakeAsync(() => {
      setEventTeamsAndFilter(1, [team1, team2], { teamIds: ['team1'], userIds: [] })
      tick(SEARCH_DEBOUNCE_MS)

      fixture.componentRef.setInput('initialFilter', { teamIds: ['team2'], userIds: [] })
      fixture.detectChanges()
      tick(SEARCH_DEBOUNCE_MS)

      expect(component.selected().map(s => s.id)).toEqual(['team1'])
    }))

    it('is ignored when it arrives after the component was created without one', fakeAsync(() => {
      setEventAndTeams(1, [team1, team2])
      tick(SEARCH_DEBOUNCE_MS)
      selectTeam('team1', 'Alpha Team')

      fixture.componentRef.setInput('initialFilter', { teamIds: ['team2'], userIds: [] })
      fixture.detectChanges()
      tick(SEARCH_DEBOUNCE_MS)

      expect(component.selected().map(s => s.id)).toEqual(['team1'])
    }))

    it('pre-selects teams from saved filter', fakeAsync(() => {
      setEventTeamsAndFilter(1, [team1, team2], { teamIds: ['team1'], userIds: [] })
      tick(SEARCH_DEBOUNCE_MS)
      expect(component.selected().length).toBe(1)
      expect(component.selected()[0].id).toBe('team1')
      expect(component.selected()[0].type).toBe('team')
      expect(eventService.getMembers).not.toHaveBeenCalled()
    }))

    it('pre-selects users from saved filter using a bulk lookup', fakeAsync(() => {
      setEventTeamsAndFilter(1, [team1], { teamIds: [], userIds: ['u1'] })
      tick(SEARCH_DEBOUNCE_MS)
      expect(component.selected().length).toBe(1)
      expect(component.selected()[0].id).toBe('u1')
      expect(component.selected()[0].type).toBe('user')
      expect(eventService.getMembers).toHaveBeenCalledWith(1)
    }))

    it('pre-selects both teams and users from saved filter', fakeAsync(() => {
      setEventTeamsAndFilter(1, [team1], { teamIds: ['team1'], userIds: ['u2'] })
      tick(SEARCH_DEBOUNCE_MS)
      expect(component.selected().length).toBe(2)
      expect(component.selected().map(s => s.id)).toContain('team1')
      expect(component.selected().map(s => s.id)).toContain('u2')
    }))

    it('makes no selection when filter has ids not present in the loaded options', fakeAsync(() => {
      setEventTeamsAndFilter(1, [team1], { teamIds: ['unknown-team'], userIds: ['unknown-user'] })
      tick(SEARCH_DEBOUNCE_MS)
      expect(component.selected().length).toBe(0)
    }))
  })
})
