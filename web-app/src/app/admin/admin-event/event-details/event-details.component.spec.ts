import { ComponentFixture, TestBed } from '@angular/core/testing'
import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBar } from '@angular/material/snack-bar'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { TeamService } from '@ngageoint/mage.web-core-lib/team'
import { AdminBreadcrumbService } from 'mage-web-app/admin/admin-breadcrumb/admin-breadcrumb.service'
import { of, throwError } from 'rxjs'

import { EventDetailsComponent } from './event-details.component'
import { AdminEventsService } from '../../services/admin-events.service'
import { RouteReuse } from '../../../route-reuse.strategy'
import { Form } from 'mage-web-app/entities/event/entities.event'

describe('EventDetailsComponent', () => {
  let component: EventDetailsComponent
  let fixture: ComponentFixture<EventDetailsComponent>

  let eventsService: jasmine.SpyObj<AdminEventsService>
  let teamsService: jasmine.SpyObj<TeamService>
  let dialog: jasmine.SpyObj<MatDialog>
  let router: jasmine.SpyObj<Router>
  let breadcrumbService: jasmine.SpyObj<AdminBreadcrumbService>

  const USER_ONE: any = {
    id: '1',
    username: 'user1',
    displayName: 'User One'
  }
  const USER_TWO: any = {
    id: '2',
    username: 'user2',
    displayName: 'User Two'
  }

  const makeEvent = (overrides: any = {}) =>
    ({
      id: 1,
      name: 'Test Event',
      description: 'Test Description',
      forms: [],
      acl: {},
      ...overrides
    } as any)

  const makePage = (items: any[] = []) =>
    ({
      items,
      totalCount: items.length,
      pageSize: 5,
      pageIndex: 0
    } as any)

  const EVENT_TEAM: any = {
    id: 'team-1',
    name: 'Event Team',
    teamEventId: 1,
    acl: {
      '1': { role: 'OWNER', permissions: [] },
      '2': { role: 'MANAGER', permissions: [] }
    }
  }

  // Runs change detection so effects and resources run, then waits for their loads to finish
  const load = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  const closedDialog = (result: any) => {
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed'])
    dialogRef.afterClosed.and.returnValue(of(result))
    dialog.open.and.returnValue(dialogRef)
    return dialogRef
  }

  beforeEach(async () => {
    const eventsServiceSpy = jasmine.createSpyObj('AdminEventsService', [
      'getEventById',
      'updateEvent',
      'getMembers',
      'getNonMembers',
      'getTeamsInEvent',
      'getTeamsNotInEvent',
      'addTeamToEvent',
      'removeEventFromTeam',
      'getAllLayers',
      'getLayersForEvent',
      'addLayerToEvent',
      'removeLayerFromEvent'
    ])

    const teamsServiceSpy = jasmine.createSpyObj('AdminTeamsService', [
      'addUserToTeam',
      'removeMember',
      'updateUserRole'
    ])

    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open'])
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open'])
    snackBarSpy.open.and.returnValue({ onAction: () => of() })
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'])
    const breadcrumbServiceSpy = jasmine.createSpyObj('BreadcrumbService', ['setBreadcrumbs', 'setActions'])

    await TestBed.configureTestingModule({
      imports: [EventDetailsComponent, NoopAnimationsModule],
      providers: [
        { provide: AdminEventsService, useValue: eventsServiceSpy },
        { provide: TeamService, useValue: teamsServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ eventId: '1' }) } } },
        { provide: AdminBreadcrumbService, useValue: breadcrumbServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents()

    eventsService = TestBed.inject(AdminEventsService) as jasmine.SpyObj<AdminEventsService>
    teamsService = TestBed.inject(TeamService) as jasmine.SpyObj<TeamService>
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>
    breadcrumbService = TestBed.inject(AdminBreadcrumbService) as jasmine.SpyObj<AdminBreadcrumbService>

    eventsService.getEventById.and.callFake((id: string) => of(makeEvent({ id: Number(id), name: `Event ${id}` })))
    eventsService.getTeamsInEvent.and.callFake((_id: string, options: any) =>
      of(options?.omit_event_teams ? makePage([]) : makePage([EVENT_TEAM]))
    )
    eventsService.getMembers.and.returnValue(of(makePage([])))
    eventsService.getNonMembers.and.returnValue(of(makePage([])))
    eventsService.getTeamsNotInEvent.and.returnValue(of(makePage([])))
    eventsService.getAllLayers.and.returnValue(of([]))
    eventsService.getLayersForEvent.and.returnValue(of([]))
    eventsService.addLayerToEvent.and.returnValue(of({} as any))
    eventsService.removeLayerFromEvent.and.returnValue(of({} as any))
    eventsService.addTeamToEvent.and.returnValue(of({} as any))
    eventsService.removeEventFromTeam.and.returnValue(of({} as any))
    eventsService.updateEvent.and.returnValue(of(makeEvent()))

    teamsService.addUserToTeam.and.returnValue(of({} as any))
    teamsService.removeMember.and.returnValue(of({} as any))
    teamsService.updateUserRole.and.returnValue(of({} as any))

    fixture = TestBed.createComponent(EventDetailsComponent)
    component = fixture.componentInstance
  })

  describe('Loading', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should load the event and its event team for the route id', async () => {
      await load()

      expect(eventsService.getEventById).toHaveBeenCalledWith('1')
      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith(
        '1',
        jasmine.objectContaining({ page: 0, page_size: 100 })
      )
      expect(component.event()?.id).toBe(1)
      expect(component.eventTeam()?.id).toBe('team-1')
    })

    it('should load members, teams, and layers for the route id', async () => {
      await load()

      expect(eventsService.getMembers).toHaveBeenCalledWith('1', { page: 0, page_size: 5, term: '', total: true })
      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith('1', {
        page: 0,
        page_size: 5,
        term: '',
        total: true,
        omit_event_teams: true
      })
      expect(eventsService.getLayersForEvent).toHaveBeenCalledWith('1')
    })

    it('should build breadcrumbs from the event', async () => {
      await load()

      expect(component.breadcrumbs().map((crumb) => crumb.title)).toEqual(['Events', 'Event 1'])
      expect(breadcrumbService.setBreadcrumbs).toHaveBeenCalledWith(component.breadcrumbs())
    })

    it('should show an error state when the event fails to load', async () => {
      eventsService.getEventById.and.returnValue(throwError(() => new Error('Load failed')))

      await load()

      expect(component.event()).toBeNull()
      expect(component.eventLoadError()).toBeTruthy()
      expect(fixture.nativeElement.querySelector('.event-error')?.textContent).toContain('Failed to load event')
      expect(fixture.nativeElement.querySelector('.event-page')).toBeNull()
    })

    it('should load the event again on retry', async () => {
      eventsService.getEventById.and.returnValue(throwError(() => new Error('Load failed')))
      await load()

      eventsService.getEventById.and.returnValue(of(makeEvent({ id: 1, name: 'Event 1' })))
      component.reloadEvent()
      await load()

      expect(component.eventLoadError()).toBeFalsy()
      expect(component.event()?.name).toBe('Event 1')
      expect(fixture.nativeElement.querySelector('.event-error')).toBeNull()
      expect(fixture.nativeElement.querySelector('.event-page')).not.toBeNull()
    })

    it('should get a new component instead of being reused when the event id changes', () => {
      expect(EventDetailsComponent.routeReuse).toBe(RouteReuse.RecreateOnParamChange)
    })

    it('should set and clear breadcrumb actions', () => {
      component.ngOnInit()
      expect(breadcrumbService.setActions).toHaveBeenCalledWith(component.breadcrumbActions)

      component.ngOnDestroy()
      expect(breadcrumbService.setActions).toHaveBeenCalledWith(null)
    })
  })

  describe('Computed Forms', () => {
    it('should return non-archived forms', () => {
      component.event.set(makeEvent({
        forms: [
          { id: 1, archived: false },
          { id: 2, archived: true },
          { id: 3, archived: false }
        ]
      }))

      expect(component.nonArchivedForms().map((f: any) => f.id)).toEqual([1, 3])
    })

    it('should return empty array when event has no forms', () => {
      component.event.set(makeEvent({ forms: undefined }))
      expect(component.nonArchivedForms()).toEqual([])
    })

    it('should return empty array when event is null', () => {
      component.event.set(null)
      expect(component.nonArchivedForms()).toEqual([])
    })

    it('should filter forms based on showArchivedForms flag', () => {
      component.event.set(makeEvent({
        forms: [
          { id: 1, archived: false },
          { id: 2, archived: true }
        ]
      }))

      component.showArchivedForms.set(false)
      expect(component.filteredForms().length).toBe(1)

      component.showArchivedForms.set(true)
      expect(component.filteredForms().length).toBe(2)
    })
  })

  describe('Form Preview', () => {
    it('should preview form', () => {
      const form = { id: 1, name: 'Test Form' } as Form
      const evt = new MouseEvent('click')
      spyOn(evt, 'stopPropagation')

      component.preview(evt, form)

      expect(evt.stopPropagation).toHaveBeenCalled()
      expect(component.previewForm()).toBe(form)
    })

    it('should close preview', () => {
      component.previewForm.set({ id: 1, name: 'Test Form' } as Form)
      component.closePreview()
      expect(component.previewForm()).toBeNull()
    })
  })

  describe('Member Management', () => {
    beforeEach(async () => {
      await load()
      eventsService.getMembers.calls.reset()
    })

    it('should show the members page', async () => {
      eventsService.getMembers.and.returnValue(of(makePage([USER_ONE, USER_TWO])))
      component.members.reload()
      await load()

      expect(component.membersPage().items).toEqual([USER_ONE, USER_TWO])
      expect(component.membersPage().totalCount).toBe(2)
      expect(component.loadingMembers()).toBe(false)
    })

    it('should show a role badge for each member', async () => {
      eventsService.getMembers.and.returnValue(of(makePage([USER_ONE, USER_TWO])))
      component.members.reload()
      await load()

      const badges = fixture.nativeElement.querySelectorAll('.user-role-badge')
      expect(badges.length).toBe(2)
      expect(badges[0].classList).toContain('role-owner')
      expect(badges[1].classList).toContain('role-manager')
    })

    it('should get user role from the event team ACL', () => {
      expect(component.getUserRole(USER_ONE)).toBe('OWNER')
      expect(component.getUserRole(USER_TWO)).toBe('MANAGER')
    })

    it('should return GUEST when user not in ACL', () => {
      expect(component.getUserRole({ id: '999' } as any)).toBe('GUEST')
    })

    it('should return GUEST when no event team', () => {
      component.eventTeam.set(null)
      expect(component.getUserRole(USER_ONE)).toBe('GUEST')
    })

    it('should update user role and set the returned event team', () => {
      const updatedTeam = { ...EVENT_TEAM, acl: { '1': { role: 'MANAGER', permissions: [] } } }
      teamsService.updateUserRole.and.returnValue(of(updatedTeam))

      component.updateUserRole(USER_ONE, 'MANAGER')

      expect(teamsService.updateUserRole).toHaveBeenCalledWith('team-1', '1', 'MANAGER')
      expect(component.getUserRole(USER_ONE)).toBe('MANAGER')
    })

    it('should not update user role without event team', () => {
      component.eventTeam.set(null)

      component.updateUserRole(USER_ONE, 'MANAGER')

      expect(teamsService.updateUserRole).not.toHaveBeenCalled()
    })

    it('should handle error when updating user role fails', () => {
      teamsService.updateUserRole.and.returnValue(throwError(() => new Error('Update failed')))
      spyOn(console, 'error')

      component.updateUserRole(USER_ONE, 'MANAGER')

      expect(console.error).toHaveBeenCalledWith('Error updating user role:', jasmine.any(Error))
      expect(component.getUserRole(USER_ONE)).toBe('OWNER')
    })

    it('should open dialog to add member to event', () => {
      closedDialog(null)

      component.addMemberToEvent()

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.anything(),
        jasmine.objectContaining({
          panelClass: 'search-modal-dialog',
          data: jasmine.objectContaining({ title: 'Add Member to Event', type: 'members' })
        })
      )
    })

    it('should add member and reload members when dialog returns selection', async () => {
      closedDialog({ selectedItem: USER_TWO })

      component.addMemberToEvent()
      await load()

      expect(teamsService.addUserToTeam).toHaveBeenCalledWith('team-1', USER_TWO)
      expect(eventsService.getMembers).toHaveBeenCalled()
    })

    it('should handle error when adding member fails', () => {
      closedDialog({ selectedItem: USER_TWO })
      teamsService.addUserToTeam.and.returnValue(throwError(() => new Error('Add failed')))
      spyOn(console, 'error')

      component.addMemberToEvent()

      expect(console.error).toHaveBeenCalledWith('Error adding member:', jasmine.any(Error))
    })

    it('should not add member when dialog is cancelled', () => {
      closedDialog(null)

      component.addMemberToEvent()

      expect(teamsService.addUserToTeam).not.toHaveBeenCalled()
    })

    it('should not open dialog when event team not found', () => {
      component.eventTeam.set(null)
      spyOn(console, 'error')

      component.addMemberToEvent()

      expect(console.error).toHaveBeenCalledWith('Event team not found')
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('should remove member from team and reload members', async () => {
      const evt = new MouseEvent('click')
      spyOn(evt, 'stopPropagation')

      component.removeMember(evt, USER_ONE)
      await load()

      expect(evt.stopPropagation).toHaveBeenCalled()
      expect(teamsService.removeMember).toHaveBeenCalledWith('team-1', '1')
      expect(eventsService.getMembers).toHaveBeenCalled()
    })

    it('should handle remove member error', () => {
      teamsService.removeMember.and.returnValue(throwError(() => new Error('Remove failed')))
      spyOn(console, 'error')

      component.removeMember(new MouseEvent('click'), USER_ONE)

      expect(console.error).toHaveBeenCalledWith('Error removing member:', jasmine.any(Error))
    })

    it('should not remove member without event team', () => {
      component.eventTeam.set(null)
      spyOn(console, 'error')

      component.removeMember(new MouseEvent('click'), USER_ONE)

      expect(console.error).toHaveBeenCalledWith('Event team not found')
      expect(teamsService.removeMember).not.toHaveBeenCalled()
    })
  })

  describe('Team Management', () => {
    beforeEach(async () => {
      await load()
      eventsService.getTeamsInEvent.calls.reset()
    })

    it('should open dialog to add team to event', () => {
      closedDialog(null)

      component.addTeamToEvent()

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.anything(),
        jasmine.objectContaining({
          panelClass: 'search-modal-dialog',
          data: jasmine.objectContaining({ title: 'Add Team to Event', type: 'teams' })
        })
      )
    })

    it('should add team and reload teams when dialog returns selection', async () => {
      const selectedTeam = { id: '2', name: 'New Team' } as any
      closedDialog({ selectedItem: selectedTeam })

      component.addTeamToEvent()
      await load()

      expect(eventsService.addTeamToEvent).toHaveBeenCalledWith('1', selectedTeam)
      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({ omit_event_teams: true }))
    })

    it('should handle error when adding team fails', () => {
      closedDialog({ selectedItem: { id: '2', name: 'New Team' } })
      eventsService.addTeamToEvent.and.returnValue(throwError(() => new Error('Add failed')))
      spyOn(console, 'error')

      component.addTeamToEvent()

      expect(console.error).toHaveBeenCalledWith('Error adding team:', jasmine.any(Error))
    })

    it('should not add team when dialog is cancelled', () => {
      closedDialog(null)

      component.addTeamToEvent()

      expect(eventsService.addTeamToEvent).not.toHaveBeenCalled()
    })

    it('should remove team from event', () => {
      const evt = new MouseEvent('click')
      spyOn(evt, 'stopPropagation')

      component.removeTeam(evt, { id: '1', name: 'Team 1' } as any)

      expect(evt.stopPropagation).toHaveBeenCalled()
      expect(eventsService.removeEventFromTeam).toHaveBeenCalledWith('1', '1')
    })
  })

  describe('Layer Management', () => {
    beforeEach(async () => {
      await load()
      eventsService.getLayersForEvent.calls.reset()
    })

    it('should search and page layers locally', async () => {
      eventsService.getLayersForEvent.and.returnValue(of([
        { id: 1, name: 'Alpha' },
        { id: 2, name: 'Beta' },
        { id: 3, name: 'Gamma' }
      ] as any))
      component.layers.reload()
      await load()

      component.layerSearchTerm.set('a')
      component.layersPageSize.set(2)

      expect(component.layersPage().totalCount).toBe(3)
      expect(component.layersPage().items.length).toBe(2)

      component.layerSearchTerm.set('gam')
      expect(component.layersPage().items.map((layer) => layer.name)).toEqual(['Gamma'])
    })

    it('should remove layer from event', () => {
      const evt = new MouseEvent('click')
      spyOn(evt, 'stopPropagation')

      component.removeLayer(evt, { id: 1, name: 'Layer 1' } as any)

      expect(evt.stopPropagation).toHaveBeenCalled()
      expect(eventsService.removeLayerFromEvent).toHaveBeenCalledWith('1', 1)
    })

    it('should add the selected layer from the dialog', async () => {
      closedDialog({ selectedItem: { id: 7, name: 'New Layer' } })

      component.addLayerToEvent()
      await load()

      expect(dialog.open).toHaveBeenCalled()
      expect(eventsService.addLayerToEvent).toHaveBeenCalledWith('1', { id: 7 })
      expect(eventsService.getLayersForEvent).toHaveBeenCalledWith('1')
    })
  })

  describe('Form Restrictions', () => {
    let markAsPristine: jasmine.Spy

    beforeEach(async () => {
      await load()
      component.event.set(makeEvent({
        id: 1,
        minObservationForms: 0,
        maxObservationForms: 10,
        forms: [{ id: 1, min: 0, max: 5 }]
      }))
      markAsPristine = jasmine.createSpy('markAsPristine')
      component.restrictionsForm = { form: { markAsPristine } } as any
      eventsService.getEventById.calls.reset()
    })

    it('should save form restrictions and update them from the saved event without reloading', () => {
      eventsService.updateEvent.and.returnValue(of(makeEvent({
        id: 1,
        minObservationForms: 1,
        maxObservationForms: 9,
        forms: [{ id: 1, min: 1, max: 4 }]
      })))

      component.saveFormRestrictions()

      expect(eventsService.updateEvent).toHaveBeenCalledWith(
        '1',
        jasmine.objectContaining({ minObservationForms: 0, maxObservationForms: 10 })
      )
      const event = component.event() as any
      expect(event.minObservationForms).toBe(1)
      expect(event.maxObservationForms).toBe(9)
      expect(event.forms[0].min).toBe(1)
      expect(event.forms[0].max).toBe(4)
      expect(markAsPristine).toHaveBeenCalled()
      expect(eventsService.getEventById).not.toHaveBeenCalled()
    })

    it('should keep other unsaved changes to the event when saving restrictions', () => {
      eventsService.updateEvent.and.returnValue(of(makeEvent({ id: 1, minObservationForms: 1, forms: [] })))
      component.event.update((event) => event && { ...event, description: 'Unsaved description' })

      component.saveFormRestrictions()

      expect(component.event()?.description).toBe('Unsaved description')
    })

    it('should set restrictionsError when saving fails', () => {
      eventsService.updateEvent.and.returnValue(throwError(() => ({ error: { message: 'Validation error' } })))
      spyOn(console, 'error')

      component.saveFormRestrictions()

      expect(console.error).toHaveBeenCalledWith('Error saving form restrictions:', jasmine.anything())
      expect(component.restrictionsError()).toEqual({ message: 'Validation error' })
    })
  })

  describe('Event Details Editing', () => {
    beforeEach(async () => {
      await load()
    })

    it('should open edit dialog with the current event', () => {
      closedDialog(undefined)

      component.editEventDetails()

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.anything(),
        jasmine.objectContaining({ data: { event: component.event() } })
      )
    })

    it('should update event and breadcrumbs when dialog returns an updated event', async () => {
      const updatedEvent = makeEvent({ id: 1, name: 'Updated Event' })
      closedDialog(updatedEvent)

      component.editEventDetails()
      await load()

      expect(component.event()).toEqual(updatedEvent)
      expect(component.breadcrumbs()[1].title).toBe('Updated Event')
    })

    it('should not change event when dialog is cancelled', () => {
      const original = component.event()
      closedDialog(undefined)

      component.editEventDetails()

      expect(component.event()).toBe(original)
    })
  })

  describe('Event Actions', () => {
    beforeEach(async () => {
      await load()
      eventsService.getEventById.calls.reset()
    })

    it('should complete event and update it from the saved event without reloading', () => {
      eventsService.updateEvent.and.returnValue(of(makeEvent({ id: 1, complete: true })))

      component.completeEvent(component.event() as any)

      expect(eventsService.updateEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({ complete: true }))
      expect(component.event()?.complete).toBe(true)
      expect(eventsService.getEventById).not.toHaveBeenCalled()
    })

    it('should activate event and update it from the saved event without reloading', () => {
      component.event.update((event) => event && { ...event, complete: true })
      eventsService.updateEvent.and.returnValue(of(makeEvent({ id: 1, complete: false })))

      component.activateEvent(component.event() as any)

      expect(eventsService.updateEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({ complete: false }))
      expect(component.event()?.complete).toBe(false)
      expect(eventsService.getEventById).not.toHaveBeenCalled()
    })

    it('should delete event and navigate when confirmed', () => {
      closedDialog(true)

      component.deleteEvent()

      expect(dialog.open).toHaveBeenCalled()
      expect(router.navigate).toHaveBeenCalled()
    })

    it('should not navigate when delete dialog returns falsy', () => {
      closedDialog(false)

      component.deleteEvent()

      expect(router.navigate).not.toHaveBeenCalled()
    })
  })

  describe('Page Change Handlers', () => {
    beforeEach(async () => {
      await load()
    })

    it('should reload members for a new search term from the first page', async () => {
      component.membersPageIndex.set(3)

      component.onMemberSearchChange('search')
      await load()

      expect(component.memberSearchTerm()).toBe('search')
      expect(component.membersPageIndex()).toBe(0)
      expect(eventsService.getMembers).toHaveBeenCalledWith('1', { page: 0, page_size: 5, term: 'search', total: true })
    })

    it('should reload members for a page change', async () => {
      component.onMembersPageChange({ pageIndex: 1, pageSize: 10, length: 50 } as any)
      await load()

      expect(component.membersPageIndex()).toBe(1)
      expect(component.membersPageSize()).toBe(10)
      expect(eventsService.getMembers).toHaveBeenCalledWith('1', { page: 1, page_size: 10, term: '', total: true })
    })

    it('should reload teams for a new search term from the first page', async () => {
      component.onTeamSearchChange('team')
      await load()

      expect(component.teamSearchTerm()).toBe('team')
      expect(component.teamsPageIndex()).toBe(0)
      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({ term: 'team', page: 0 }))
    })

    it('should reload teams for a page change', async () => {
      component.onTeamsPageChange({ pageIndex: 2, pageSize: 5, length: 25 } as any)
      await load()

      expect(component.teamsPageIndex()).toBe(2)
      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({ page: 2, page_size: 5 }))
    })

    it('should update layer search from the first page', () => {
      component.layersPageIndex.set(2)

      component.onLayerSearchChange('layer')

      expect(component.layerSearchTerm()).toBe('layer')
      expect(component.layersPageIndex()).toBe(0)
    })

    it('should update layers page', () => {
      component.onLayersPageChange({ pageIndex: 2, pageSize: 25, length: 100 } as any)

      expect(component.layersPageIndex()).toBe(2)
      expect(component.layersPageSize()).toBe(25)
    })
  })

  describe('Form Operations', () => {
    beforeEach(async () => {
      await load()
      component.event.set(makeEvent({
        id: 1,
        forms: [
          { id: 1, name: 'Form 1', archived: false },
          { id: 2, name: 'Form 2', archived: false }
        ]
      }))
    })

    it('should navigate to the uploaded form when the dialog returns one', () => {
      closedDialog({ id: 99 })

      component.uploadForm()

      expect(dialog.open).toHaveBeenCalled()
      expect(router.navigate).toHaveBeenCalledWith(['../../events', '1', 'forms', 99], jasmine.any(Object))
    })

    it('should not navigate when upload form dialog closes without id', () => {
      closedDialog(null)

      component.uploadForm()

      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('should show the new form order right away and save it', () => {
      eventsService.updateEvent.and.returnValue(of({} as any))

      component.onFormsReordered({ previousIndex: 1, currentIndex: 0 } as any)

      const reorderedForms = [
        { id: 2, name: 'Form 2', archived: false },
        { id: 1, name: 'Form 1', archived: false }
      ]
      expect(eventsService.updateEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({ forms: reorderedForms }))
      expect((component.event() as any).forms.map((f: any) => f.id)).toEqual([2, 1])
    })

    it('should put the previous form order back when saving the order fails', () => {
      eventsService.updateEvent.and.returnValue(throwError(() => new Error('Save failed')))
      spyOn(console, 'error')
      const snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>

      component.onFormsReordered({ previousIndex: 1, currentIndex: 0 } as any)

      expect((component.event() as any).forms.map((f: any) => f.id)).toEqual([1, 2])
      expect(snackBar.open).toHaveBeenCalledWith('Error saving the form order', 'Close', { duration: 5000 })
    })
  })
})
