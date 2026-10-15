import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router'
import { MatDialog } from '@angular/material/dialog'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { NoopAnimationsModule } from '@angular/platform-browser/animations'
import { of, throwError } from 'rxjs'

import { TeamDetailsComponent } from './team-details.component'
import { Team, TeamMemberRole, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { AdminEventsService } from '../../services/admin-events.service'
import { SessionService } from 'mage-web-app/http/session.service'
import { User as CoreUser } from '@ngageoint/mage.web-core-lib/user'
import { DeleteTeamComponent } from '../delete-team/delete-team.component'
import { SearchModalComponent } from '../../search-modal/search-modal.component'
import { RouteReuse } from '../../../route-reuse.strategy'

describe('TeamDetailsComponent', () => {
  let component: TeamDetailsComponent
  let fixture: ComponentFixture<TeamDetailsComponent>

  let mockRouter: jasmine.SpyObj<Router>
  let mockDialog: jasmine.SpyObj<MatDialog>
  let mockSessionService: { user: any, hasPermission: jasmine.Spy }
  let mockTeamsService: jasmine.SpyObj<TeamService>
  let mockEventsService: jasmine.SpyObj<AdminEventsService>

  const mockTeam: Team = {
    id: 'team123' as any,
    name: 'Test Team',
    description: 'Test Description',
    teamEventId: 123,
    userIds: ['user1', 'user2'] as any,
    acl: {
      user123: {
        role: TeamMemberRole.OWNER,
        permissions: ['update', 'delete']
      }
    }
  }

  const mockMyselfWithGlobalPerms: any = {
    id: 'user123',
    role: { permissions: ['UPDATE_TEAM', 'DELETE_TEAM'] }
  }

  const mockMyselfNoGlobalPerms: any = {
    id: 'user123',
    role: { permissions: [] }
  }

  const mockMember: CoreUser = {
    id: 'user123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com'
  } as any

  const mockEvent: any = {
    id: 'event123',
    name: 'Test Event',
    description: 'Test Event Description'
  }

  // Runs change detection so effects and resources run, then waits for their loads to finish
  const load = async () => {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl'])
    mockDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])

    mockSessionService = {
      user: mockMyselfWithGlobalPerms,
      hasPermission: jasmine.createSpy('hasPermission').and.callFake(
        (permission: string) => (mockSessionService.user?.role?.permissions || []).includes(permission)
      )
    }
    mockTeamsService = jasmine.createSpyObj<TeamService>(
      'AdminTeamsService',
      [
        'getTeamById',
        'getMembers',
        'getNonMembers',
        'addUserToTeam',
        'removeMember',
        'editTeam',
        'updateUserRole'
      ]
    )
    mockEventsService = jasmine.createSpyObj<AdminEventsService>(
      'AdminEventsService',
      ['getEvents', 'addTeamToEvent', 'removeEventFromTeam']
    )

    mockTeamsService.getTeamById.and.returnValue(of(mockTeam))
    mockTeamsService.getMembers.and.returnValue(
      of({ items: [mockMember], totalCount: 1 } as any)
    )
    mockEventsService.getEvents.and.returnValue(
      of({ items: [mockEvent], totalCount: 1 } as any)
    )

    await TestBed.configureTestingModule({
      imports: [TeamDetailsComponent, NoopAnimationsModule, MatSnackBarModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ teamId: 'team123' }) } } },
        { provide: Router, useValue: mockRouter },
        { provide: MatDialog, useValue: mockDialog },
        { provide: SessionService, useValue: mockSessionService },
        { provide: TeamService, useValue: mockTeamsService },
        { provide: AdminEventsService, useValue: mockEventsService }
      ]
    }).compileComponents()

    fixture = TestBed.createComponent(TeamDetailsComponent)
    component = fixture.componentInstance
  })

  describe('loading', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
      expect(component.hasUpdatePermission()).toBeFalse()
      expect(component.hasDeletePermission()).toBeFalse()
    })

    it('should load the team, members, and events for the route id', async () => {
      await load()

      expect(component.teamId).toBe('team123')
      expect(mockTeamsService.getTeamById).toHaveBeenCalledWith('team123')
      expect(mockTeamsService.getMembers).toHaveBeenCalledWith({ teamId: 'team123', pageIndex: 0, pageSize: 5, term: '' })
      expect(mockEventsService.getEvents).toHaveBeenCalledWith({ teamId: 'team123', term: '', page: 0, page_size: 5 })
      expect(component.team()).toEqual(mockTeam)
    })

    it('should render the team, its members with roles, and its events', async () => {
      await load()

      const element: HTMLElement = fixture.nativeElement
      expect(element.querySelector('.team-name')?.textContent).toContain('Test Team')
      expect(element.textContent).toContain('Test User')
      expect(element.textContent).toContain('Test Event')
      expect(element.querySelector('.user-role-badge')?.classList).toContain('role-owner')
    })

    it('should build breadcrumbs from the team', async () => {
      await load()

      expect(component.breadcrumbs().map((crumb) => crumb.title)).toEqual(['Teams', 'Test Team'])
    })

    it('should show an error state when the team fails to load', async () => {
      mockTeamsService.getTeamById.and.returnValue(throwError(() => new Error('Load failed')))

      await load()

      expect(component.team()).toBeNull()
      expect(component.teamLoadError()).toBeTruthy()
      expect(fixture.nativeElement.querySelector('.team-error')?.textContent).toContain('Failed to load team')
      expect(fixture.nativeElement.querySelector('.team-page')).toBeNull()
    })

    it('should load the team again on retry', async () => {
      mockTeamsService.getTeamById.and.returnValue(throwError(() => new Error('Load failed')))
      await load()

      mockTeamsService.getTeamById.and.returnValue(of(mockTeam))
      component.reloadTeam()
      await load()

      expect(component.teamLoadError()).toBeFalsy()
      expect(component.team()).toEqual(mockTeam)
      expect(fixture.nativeElement.querySelector('.team-error')).toBeNull()
      expect(fixture.nativeElement.querySelector('.team-page')).not.toBeNull()
    })

    it('should get a new component instead of being reused when the team id changes', () => {
      expect(TeamDetailsComponent.routeReuse).toBe(RouteReuse.RecreateOnParamChange)
    })
  })

  describe('permissions', () => {
    it('should set permissions via global role permissions', async () => {
      mockSessionService.user = mockMyselfWithGlobalPerms

      await load()

      expect(component.hasUpdatePermission()).toBeTrue()
      expect(component.hasDeletePermission()).toBeTrue()
    })

    it('should set permissions via ACL permissions when global perms missing', async () => {
      mockSessionService.user = mockMyselfNoGlobalPerms

      await load()

      expect(component.hasUpdatePermission()).toBeTrue()
      expect(component.hasDeletePermission()).toBeTrue()
    })

    it('should deny permissions when no global perms and no ACL match', async () => {
      mockSessionService.user = { id: 'someoneElse', role: { permissions: [] } }
      mockTeamsService.getTeamById.and.returnValue(
        of({ ...mockTeam, acl: {} } as any)
      )

      await load()

      expect(component.hasUpdatePermission()).toBeFalse()
      expect(component.hasDeletePermission()).toBeFalse()
    })
  })

  describe('members', () => {
    it('should show the members page', async () => {
      await load()

      expect(component.membersPage().items).toEqual([mockMember])
      expect(component.membersPage().totalCount).toBe(1)
      expect(component.loadingMembers()).toBeFalse()
    })

    it('should show an empty page when members fail to load', async () => {
      mockTeamsService.getMembers.and.returnValue(throwError(() => new Error('fail')))

      await load()

      expect(component.membersPage().items).toEqual([])
      expect(component.membersPage().totalCount).toBe(0)
      expect(component.loadingMembers()).toBeFalse()
    })

    it('should reload members for a page change', async () => {
      await load()

      component.onMembersPageChange({ pageIndex: 2, pageSize: 10 } as any)
      await load()

      expect(component.membersPageIndex()).toBe(2)
      expect(component.membersPageSize()).toBe(10)
      expect(mockTeamsService.getMembers).toHaveBeenCalledWith({ teamId: 'team123', pageIndex: 2, pageSize: 10, term: '' })
    })

    it('should reload members for a new search term from the first page', async () => {
      await load()
      component.membersPageIndex.set(5)

      component.onMembersSearchChange('abc')
      await load()

      expect(component.membersPageIndex()).toBe(0)
      expect(component.memberSearchTerm()).toBe('abc')
      expect(mockTeamsService.getMembers).toHaveBeenCalledWith({ teamId: 'team123', pageIndex: 0, pageSize: 5, term: 'abc' })
    })
  })

  describe('events', () => {
    it('should show the events page', async () => {
      await load()

      expect(component.eventsPage().items).toEqual([mockEvent])
      expect(component.eventsPage().totalCount).toBe(1)
      expect(component.loadingEvents()).toBeFalse()
    })

    it('should show an empty page when events fail to load', async () => {
      mockEventsService.getEvents.and.returnValue(throwError(() => new Error('fail')))

      await load()

      expect(component.eventsPage().items).toEqual([])
      expect(component.eventsPage().totalCount).toBe(0)
      expect(component.loadingEvents()).toBeFalse()
    })

    it('should reload events for a page change', async () => {
      await load()

      component.onEventsPageChange({ pageIndex: 1, pageSize: 25 } as any)
      await load()

      expect(component.eventsPageIndex()).toBe(1)
      expect(component.eventsPageSize()).toBe(25)
      expect(mockEventsService.getEvents).toHaveBeenCalledWith({ teamId: 'team123', term: '', page: 1, page_size: 25 })
    })

    it('should reload events for a new search term from the first page', async () => {
      await load()
      component.eventsPageIndex.set(3)

      component.onTeamEventSearchChange('zzz')
      await load()

      expect(component.eventsPageIndex()).toBe(0)
      expect(component.eventSearchTerm()).toBe('zzz')
      expect(mockEventsService.getEvents).toHaveBeenCalledWith({ teamId: 'team123', term: 'zzz', page: 0, page_size: 5 })
    })
  })

  describe('editing team details', () => {
    beforeEach(async () => {
      await load()
    })

    it('editTeamDetails should open the edit dialog with the current team', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(null) } as any)

      component.editTeamDetails()

      expect(mockDialog.open).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: { team: mockTeam } })
      )
    })

    it('editTeamDetails should update team + breadcrumbs when dialog returns an updated team', () => {
      const updated = { ...mockTeam, name: 'Updated Team' }
      mockDialog.open.and.returnValue({ afterClosed: () => of(updated) } as any)

      component.editTeamDetails()

      expect(component.team()).toEqual(updated as any)
      expect(component.breadcrumbs()[1].title).toBe('Updated Team')
      expect(mockTeamsService.getTeamById).toHaveBeenCalledTimes(1)
    })
  })

  describe('member management', () => {
    beforeEach(async () => {
      mockTeamsService.addUserToTeam.and.returnValue(of({} as any))
      mockTeamsService.removeMember.and.returnValue(of({} as any))
      mockTeamsService.getNonMembers.and.returnValue(
        of({ items: [mockMember], totalCount: 1 } as any)
      )
      await load()
      mockTeamsService.getMembers.calls.reset()
    })

    it('addMember should open SearchModal, add the selected user, and reload members', async () => {
      mockDialog.open.and.returnValue({
        afterClosed: () => of({ selectedItem: mockMember })
      } as any)

      component.addMember()
      await load()

      expect(mockDialog.open).toHaveBeenCalledWith(
        SearchModalComponent,
        jasmine.any(Object)
      )
      expect(mockTeamsService.addUserToTeam).toHaveBeenCalledWith(
        mockTeam.id,
        mockMember
      )
      expect(mockTeamsService.getMembers).toHaveBeenCalled()
    })

    it('addMember should do nothing if dialog returns no selection', () => {
      mockDialog.open.and.returnValue({
        afterClosed: () => of(null)
      } as any)

      component.addMember()

      expect(mockTeamsService.addUserToTeam).not.toHaveBeenCalled()
    })

    it('addMember should log an error when adding fails', () => {
      mockDialog.open.and.returnValue({
        afterClosed: () => of({ selectedItem: mockMember })
      } as any)
      mockTeamsService.addUserToTeam.and.returnValue(throwError(() => new Error('fail')))
      spyOn(console, 'error')

      component.addMember()

      expect(console.error).toHaveBeenCalledWith('Error adding member:', jasmine.any(Error))
    })

    it('removeMember should stop propagation, remove the member, and reload members', async () => {
      const ev = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopPropagation'
      ])
      spyOn((component as any).snackBar, 'open').and.returnValue({
        onAction: () => of()
      } as any)

      component.removeMember(ev, mockMember)
      await load()

      expect(ev.stopPropagation).toHaveBeenCalled()
      expect(mockTeamsService.removeMember).toHaveBeenCalledWith(
        mockTeam.id,
        mockMember.id
      )
      expect(mockTeamsService.getMembers).toHaveBeenCalled()
    })

    it('removeMember should restore the member when undo is clicked', () => {
      const ev = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopPropagation'
      ])
      mockTeamsService.addUserToTeam.and.returnValue(of(mockTeam))
      spyOn((component as any).snackBar, 'open').and.returnValue({
        onAction: () => of(undefined)
      } as any)

      component.removeMember(ev, mockMember)

      expect(mockTeamsService.addUserToTeam).toHaveBeenCalledWith(
        mockTeam.id,
        mockMember
      )
    })

    it('removeMember should log an error when removing fails', () => {
      mockTeamsService.removeMember.and.returnValue(throwError(() => new Error('fail')))
      spyOn(console, 'error')

      component.removeMember(new MouseEvent('click'), mockMember)

      expect(console.error).toHaveBeenCalledWith('Error removing member:', jasmine.any(Error))
    })

    it('getUserRole should return the role from the team ACL, or GUEST', () => {
      expect(component.getUserRole(mockMember)).toBe('OWNER')
      expect(component.getUserRole({ id: 'nobody' } as any)).toBe('GUEST')
    })

    it('updateUserRole should set the returned team without reloading members', async () => {
      const updated = { ...mockTeam, acl: { user123: { role: TeamMemberRole.MANAGER, permissions: ['update'] } } }
      mockTeamsService.updateUserRole.and.returnValue(of(updated as any))

      component.updateUserRole(mockMember, 'MANAGER')
      await load()

      expect(mockTeamsService.updateUserRole).toHaveBeenCalledWith(mockTeam.id, mockMember.id, 'MANAGER')
      expect(component.getUserRole(mockMember)).toBe('MANAGER')
      expect(mockTeamsService.getMembers).not.toHaveBeenCalled()
    })

    it('updateUserRole should log an error and keep the role when updating fails', () => {
      mockTeamsService.updateUserRole.and.returnValue(throwError(() => new Error('fail')))
      spyOn(console, 'error')

      component.updateUserRole(mockMember, 'MANAGER')

      expect(console.error).toHaveBeenCalledWith('Error updating member role:', jasmine.any(Error))
      expect(component.getUserRole(mockMember)).toBe('OWNER')
    })
  })

  describe('event management', () => {
    beforeEach(async () => {
      mockEventsService.addTeamToEvent.and.returnValue(of({} as any))
      mockEventsService.removeEventFromTeam.and.returnValue(of({} as any))
      await load()
      mockEventsService.getEvents.calls.reset()
    })

    it('addEventToTeam should open SearchModal, add the selected event, and reload events', async () => {
      mockDialog.open.and.returnValue({
        afterClosed: () => of({ selectedItem: mockEvent })
      } as any)

      component.addEventToTeam()
      await load()

      expect(mockDialog.open).toHaveBeenCalledWith(
        SearchModalComponent,
        jasmine.any(Object)
      )
      expect(mockEventsService.addTeamToEvent).toHaveBeenCalledWith(
        String(mockEvent.id),
        mockTeam
      )
      expect(mockEventsService.getEvents).toHaveBeenCalled()
    })

    it('addEventToTeam should log an error when adding fails', () => {
      mockDialog.open.and.returnValue({
        afterClosed: () => of({ selectedItem: mockEvent })
      } as any)
      mockEventsService.addTeamToEvent.and.returnValue(throwError(() => new Error('fail')))
      spyOn(console, 'error')

      component.addEventToTeam()

      expect(console.error).toHaveBeenCalledWith('Error adding event:', jasmine.any(Error))
    })

    it('removeEventFromTeam should stop propagation, remove the event, and reload events', async () => {
      const ev = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopPropagation'
      ])
      spyOn((component as any).snackBar, 'open').and.returnValue({
        onAction: () => of()
      } as any)

      component.removeEventFromTeam(ev, mockEvent)
      await load()

      expect(ev.stopPropagation).toHaveBeenCalled()
      expect(mockEventsService.removeEventFromTeam).toHaveBeenCalledWith(
        String(mockEvent.id),
        String(mockTeam.id)
      )
      expect(mockEventsService.getEvents).toHaveBeenCalled()
    })

    it('removeEventFromTeam should restore the event when undo is clicked', () => {
      const ev = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopPropagation'
      ])
      mockEventsService.addTeamToEvent.and.returnValue(of(mockTeam as any))
      spyOn((component as any).snackBar, 'open').and.returnValue({
        onAction: () => of(undefined)
      } as any)

      component.removeEventFromTeam(ev, mockEvent)

      expect(mockEventsService.addTeamToEvent).toHaveBeenCalledWith(
        String(mockEvent.id),
        mockTeam
      )
    })

    it('removeEventFromTeam should log an error when removing fails', () => {
      mockEventsService.removeEventFromTeam.and.returnValue(throwError(() => new Error('fail')))
      spyOn(console, 'error')

      component.removeEventFromTeam(new MouseEvent('click'), mockEvent)

      expect(console.error).toHaveBeenCalledWith('Error removing event:', jasmine.any(Error))
    })
  })

  describe('deleteTeam', () => {
    beforeEach(async () => {
      await load()
      mockRouter.navigate.and.returnValue(Promise.resolve(true))
    })

    it('should open delete dialog and navigate when confirmed', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any)

      component.deleteTeam()

      expect(mockDialog.open).toHaveBeenCalledWith(
        DeleteTeamComponent,
        jasmine.objectContaining({
          width: '600px',
          data: { team: mockTeam }
        })
      )

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['../../teams'],
        jasmine.objectContaining({
          relativeTo: jasmine.any(Object)
        })
      )

      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled()
    })

    it('should not navigate when cancelled', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(false) } as any)

      component.deleteTeam()

      expect(mockRouter.navigate).not.toHaveBeenCalled()
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled()
    })
  })
})
