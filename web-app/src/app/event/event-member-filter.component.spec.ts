import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { of } from 'rxjs'
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
  spy.searchMembers.and.callFake((_event: any, term: string) => {
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

  function setEventAndTeams(event: any, teams: any[]): void {
    fixture.componentRef.setInput('event', event)
    fixture.componentRef.setInput('teams', teams)
    fixture.detectChanges()
  }

  function setEventTeamsAndFilter(event: any, teams: any[], filter: MemberFilterSelection): void {
    fixture.componentRef.setInput('filter', filter)
    fixture.componentRef.setInput('event', event)
    fixture.componentRef.setInput('teams', teams)
    fixture.detectChanges()
  }

  it('should create', () => {
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('loads teams from input and searches members from the event service on input change', fakeAsync(() => {
    setEventAndTeams({ id: 1 }, [team1, team2])
    tick(SEARCH_DEBOUNCE_MS)

    const groups = component.filteredGroups()
    const teamGroup = groups.find(g => g.label === 'Teams')
    const memberGroup = groups.find(g => g.label === 'Members')

    expect(teamGroup?.options.length).toBe(2)
    expect(teamGroup?.options.map(o => o.display)).toEqual(jasmine.arrayContaining(['Alpha Team', 'Bravo Team']))
    expect(memberGroup?.options.length).toBe(3)
    expect(eventService.searchMembers).toHaveBeenCalledWith({ id: 1 }, '')
  }))

  it('shows no groups when teams input is empty', fakeAsync(() => {
    setEventAndTeams({ id: 1 }, [])
    tick(SEARCH_DEBOUNCE_MS)

    expect(component.filteredGroups().length).toBe(0)
    expect(eventService.searchMembers).not.toHaveBeenCalled()
  }))

  it('shows no groups when event input is not set', fakeAsync(() => {
    setEventAndTeams(null, [team1])
    tick(SEARCH_DEBOUNCE_MS)

    expect(component.filteredGroups().length).toBe(0)
    expect(eventService.searchMembers).not.toHaveBeenCalled()
  }))

  it('searches the server for members as the query changes, debounced', fakeAsync(() => {
    setEventAndTeams({ id: 1 }, [team1, team2])
    tick(SEARCH_DEBOUNCE_MS)
    eventService.searchMembers.calls.reset()

    component.inputControl.setValue('ali')
    fixture.detectChanges()
    tick(SEARCH_DEBOUNCE_MS)

    expect(eventService.searchMembers).toHaveBeenCalledWith({ id: 1 }, 'ali')
    const groups = component.filteredGroups()
    const memberGroup = groups.find(g => g.label === 'Members')
    expect(memberGroup?.options.length).toBe(1)
    expect(memberGroup?.options[0].display).toBe('Alice Smith')
  }))

  it('filters team groups locally by the search query', fakeAsync(() => {
    setEventAndTeams({ id: 1 }, [team1, team2])
    tick(SEARCH_DEBOUNCE_MS)
    component.inputControl.setValue('alpha')
    tick(SEARCH_DEBOUNCE_MS)

    const groups = component.filteredGroups()
    const teamGroup = groups.find(g => g.label === 'Teams')
    expect(teamGroup?.options.length).toBe(1)
    expect(teamGroup?.options[0].display).toBe('Alpha Team')
  }))

  it('emits teamIds and userIds when a team is selected', fakeAsync(() => {
    setEventAndTeams({ id: 1 }, [team1, team2])
    tick(SEARCH_DEBOUNCE_MS)

    const emitted: MemberFilterSelection[] = []
    component.memberFilterChanged.subscribe(s => emitted.push(s))

    component.onOptionSelected({ option: { value: { type: 'team', id: 'team1', display: 'Alpha Team', raw: team1 } } } as any)

    expect(emitted.length).toBe(1)
    expect(emitted[0].teamIds).toEqual(['team1'])
    expect(emitted[0].userIds).toEqual([])
  }))

  it('emits teamIds and userIds when a user is selected', fakeAsync(() => {
    setEventAndTeams({ id: 1 }, [team1])
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
    setEventAndTeams({ id: 1 }, [team1])
    tick(SEARCH_DEBOUNCE_MS)

    const teamOption = { type: 'team' as const, id: 'team1', display: 'Alpha Team', raw: team1 }
    component.onOptionSelected({ option: { value: teamOption } } as any)
    component.onOptionSelected({ option: { value: teamOption } } as any)

    expect(component.selected().length).toBe(1)
  }))

  it('removes a selection and emits', fakeAsync(() => {
    setEventAndTeams({ id: 1 }, [team1])
    tick(SEARCH_DEBOUNCE_MS)

    const emitted: MemberFilterSelection[] = []
    component.memberFilterChanged.subscribe(s => emitted.push(s))

    const teamOption = { type: 'team' as const, id: 'team1', display: 'Alpha Team', raw: team1 }
    component.onOptionSelected({ option: { value: teamOption } } as any)
    component.remove(teamOption)

    expect(component.selected().length).toBe(0)
    expect(emitted[emitted.length - 1].teamIds).toEqual([])
  }))

  it('resets selection when inputs change', fakeAsync(() => {
    setEventAndTeams({ id: 1 }, [team1])
    tick(SEARCH_DEBOUNCE_MS)

    const teamOption = { type: 'team' as const, id: 'team1', display: 'Alpha Team', raw: team1 }
    component.onOptionSelected({ option: { value: teamOption } } as any)
    expect(component.selected().length).toBe(1)

    setEventAndTeams({ id: 1 }, [team2])
    tick(SEARCH_DEBOUNCE_MS)
    expect(component.selected().length).toBe(0)
  }))

  describe('pre-population from filter input', () => {

    it('pre-selects teams from saved filter', fakeAsync(() => {
      setEventTeamsAndFilter({ id: 1 }, [team1, team2], { teamIds: ['team1'], userIds: [] })
      tick(SEARCH_DEBOUNCE_MS)
      expect(component.selected().length).toBe(1)
      expect(component.selected()[0].id).toBe('team1')
      expect(component.selected()[0].type).toBe('team')
      expect(eventService.getMembers).not.toHaveBeenCalled()
    }))

    it('pre-selects users from saved filter using a bulk lookup', fakeAsync(() => {
      setEventTeamsAndFilter({ id: 1 }, [team1], { teamIds: [], userIds: ['u1'] })
      tick(SEARCH_DEBOUNCE_MS)
      expect(component.selected().length).toBe(1)
      expect(component.selected()[0].id).toBe('u1')
      expect(component.selected()[0].type).toBe('user')
      expect(eventService.getMembers).toHaveBeenCalledWith({ id: 1 })
    }))

    it('pre-selects both teams and users from saved filter', fakeAsync(() => {
      setEventTeamsAndFilter({ id: 1 }, [team1], { teamIds: ['team1'], userIds: ['u2'] })
      tick(SEARCH_DEBOUNCE_MS)
      expect(component.selected().length).toBe(2)
      expect(component.selected().map(s => s.id)).toContain('team1')
      expect(component.selected().map(s => s.id)).toContain('u2')
    }))

    it('makes no selection when filter has ids not present in the loaded options', fakeAsync(() => {
      setEventTeamsAndFilter({ id: 1 }, [team1], { teamIds: ['unknown-team'], userIds: ['unknown-user'] })
      tick(SEARCH_DEBOUNCE_MS)
      expect(component.selected().length).toBe(0)
    }))
  })
})
