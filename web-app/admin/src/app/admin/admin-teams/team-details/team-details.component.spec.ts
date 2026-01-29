import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { TeamDetailsComponent } from './team-details.component';
import { AdminTeamsService } from '../../services/admin-teams-service';
import { AdminEventsService } from '../../services/admin-events.service';
import { AdminUserService } from '../../services/admin-user.service';
import { Team } from '../team';
import { User as CoreUser } from '@ngageoint/mage.web-core-lib/user';
import { DeleteTeamComponent } from '../delete-team/delete-team.component';
import { SearchModalComponent } from '../../../core/search-modal/search-modal.component';

describe('TeamDetailsComponent', () => {
  let component: TeamDetailsComponent;
  let fixture: ComponentFixture<TeamDetailsComponent>;

  let paramMap$: BehaviorSubject<any>;

  let mockRoute: any;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockUserService: jasmine.SpyObj<AdminUserService>;
  let mockTeamsService: jasmine.SpyObj<AdminTeamsService>;
  let mockEventsService: jasmine.SpyObj<AdminEventsService>;

  const mockTeam: Team = {
    id: 'team123' as any,
    name: 'Test Team',
    description: 'Test Description',
    teamEventId: 'event123',
    users: ['user1', 'user2'] as any,
    acl: {
      user123: { permissions: ['update', 'delete'] }
    } as any
  };

  const mockMyselfWithGlobalPerms: any = {
    id: 'user123',
    role: { permissions: ['UPDATE_TEAM', 'DELETE_TEAM'] }
  };

  const mockMyselfNoGlobalPerms: any = {
    id: 'user123',
    role: { permissions: [] }
  };

  const mockMember: CoreUser = {
    id: 'user123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com'
  } as any;

  const mockEvent: any = {
    id: 'event123',
    name: 'Test Event',
    description: 'Test Event Description'
  };

  beforeEach(waitForAsync(() => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ teamId: 'team123' }));
    mockRoute = {
      paramMap: paramMap$.asObservable(),
      snapshot: { paramMap: convertToParamMap({ teamId: 'team123' }) }
    };

    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    mockDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    mockUserService = jasmine.createSpyObj<AdminUserService>(
      'AdminUserService',
      ['getMyself', 'hasPermission']
    );
    mockTeamsService = jasmine.createSpyObj<AdminTeamsService>(
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
    );
    mockEventsService = jasmine.createSpyObj<AdminEventsService>(
      'AdminEventsService',
      ['getEvents', 'addTeamToEvent', 'removeEventFromTeam']
    );

    mockUserService.getMyself.and.returnValue(of(mockMyselfWithGlobalPerms));
    mockTeamsService.getTeamById.and.returnValue(of(mockTeam));
    mockTeamsService.getMembers.and.returnValue(
      of({ items: [mockMember], totalCount: 1 } as any)
    );
    mockEventsService.getEvents.and.returnValue(
      of({ items: [mockEvent], totalCount: 1 } as any)
    );

    TestBed.configureTestingModule({
      declarations: [TeamDetailsComponent],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: MatDialog, useValue: mockDialog },
        { provide: AdminUserService, useValue: mockUserService },
        { provide: AdminTeamsService, useValue: mockTeamsService },
        { provide: AdminEventsService, useValue: mockEventsService }
      ]
    })
      .overrideTemplate(TeamDetailsComponent, '')
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TeamDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.hasUpdatePermission).toBeFalse();
    expect(component.hasDeletePermission).toBeFalse();
  });

  it('should load team + members + events on init', () => {
    fixture.detectChanges();

    expect(component.teamId).toBe('team123');
    expect(mockUserService.getMyself).toHaveBeenCalled();
    expect(mockTeamsService.getTeamById).toHaveBeenCalledWith('team123');
    expect(mockTeamsService.getMembers).toHaveBeenCalled();
    expect(mockEventsService.getEvents).toHaveBeenCalled();
    expect(component.team).toEqual(mockTeam);
  });

  it('should set permissions via global role permissions', () => {
    mockUserService.getMyself.and.returnValue(of(mockMyselfWithGlobalPerms));

    fixture.detectChanges();

    expect(component.hasUpdatePermission).toBeTrue();
    expect(component.hasDeletePermission).toBeTrue();
  });

  it('should set permissions via ACL permissions when global perms missing', () => {
    mockUserService.getMyself.and.returnValue(of(mockMyselfNoGlobalPerms));

    fixture.detectChanges();

    expect(component.hasUpdatePermission).toBeTrue();
    expect(component.hasDeletePermission).toBeTrue();
  });

  it('should deny permissions when no global perms and no ACL match', () => {
    mockUserService.getMyself.and.returnValue(
      of({ id: 'someoneElse', role: { permissions: [] } })
    );
    mockTeamsService.getTeamById.and.returnValue(
      of({ ...mockTeam, acl: {} } as any)
    );

    fixture.detectChanges();

    expect(component.hasUpdatePermission).toBeFalse();
    expect(component.hasDeletePermission).toBeFalse();
  });

  it('should still load team if getMyself errors', () => {
    mockUserService.getMyself.and.returnValue(
      throwError(() => new Error('nope'))
    );

    fixture.detectChanges();

    expect(mockTeamsService.getTeamById).toHaveBeenCalledWith('team123');
    expect(component.team).toBeTruthy();
  });

  describe('getMembers', () => {
    beforeEach(() => {
      component.team = mockTeam;
    });

    it('should fetch members and update datasource + counts', () => {
      mockTeamsService.getMembers.and.returnValue(
        of({ items: [mockMember], totalCount: 1 } as any)
      );

      component.getMembers();

      expect(mockTeamsService.getMembers).toHaveBeenCalledWith({
        id: mockTeam.id,
        term: component.memberSearchTerm,
        page: component.membersPageIndex,
        page_size: component.membersPageSize
      });
      expect(component.loadingMembers).toBeFalse();
      expect(component.membersDataSource.data).toEqual([mockMember]);
      expect(component.totalMembers).toBe(1);
    });

    it('should handle error fetching members by resetting data', () => {
      mockTeamsService.getMembers.and.returnValue(
        throwError(() => new Error('fail'))
      );

      component.getMembers();

      expect(component.loadingMembers).toBeFalse();
      expect(component.membersDataSource.data).toEqual([]);
      expect(component.totalMembers).toBe(0);
    });

    it('should return early if team not loaded', () => {
      component.team = null;
      component.getMembers();
      expect(mockTeamsService.getMembers).not.toHaveBeenCalled();
    });
  });

  describe('getTeamEvents', () => {
    it('should fetch events and update datasource + counts', () => {
      component.teamId = 'team123';
      mockEventsService.getEvents.and.returnValue(
        of({ items: [mockEvent], totalCount: 1 } as any)
      );

      component.getTeamEvents();

      expect(mockEventsService.getEvents).toHaveBeenCalledWith({
        term: component.teamEventSearch,
        teamId: component.teamId,
        page: component.teamEventsPage,
        page_size: component.eventsPerPage
      });
      expect(component.loadingEvents).toBeFalse();
      expect(component.teamEvents).toEqual([mockEvent]);
      expect(component.eventsDataSource.data).toEqual([mockEvent]);
      expect(component.totalEvents).toBe(1);
    });

    it('should return early if teamId missing', () => {
      component.teamId = '';
      component.getTeamEvents();
      expect(mockEventsService.getEvents).not.toHaveBeenCalled();
    });
  });

  describe('pagination + search', () => {
    beforeEach(() => {
      component.team = mockTeam;
      component.teamId = 'team123';
      spyOn(component, 'getMembers');
      spyOn(component, 'getTeamEvents');
    });

    it('onMembersPageChange should update pagination and reload', () => {
      component.onMembersPageChange({ pageIndex: 2, pageSize: 10 } as any);
      expect(component.membersPageIndex).toBe(2);
      expect(component.membersPageSize).toBe(10);
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('onMembersSearchChange should reset page and reload', () => {
      component.membersPageIndex = 5;
      component.onMembersSearchChange('abc');
      expect(component.membersPageIndex).toBe(0);
      expect(component.memberSearchTerm).toBe('abc');
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('onEventsPageChange should update pagination and reload', () => {
      component.onEventsPageChange({ pageIndex: 1, pageSize: 25 } as any);
      expect(component.teamEventsPage).toBe(1);
      expect(component.eventsPerPage).toBe(25);
      expect(component.getTeamEvents).toHaveBeenCalled();
    });

    it('onTeamEventSearchChange should reset page and reload', () => {
      component.teamEventsPage = 3;
      component.onTeamEventSearchChange('zzz');
      expect(component.teamEventsPage).toBe(0);
      expect(component.teamEventSearch).toBe('zzz');
      expect(component.getTeamEvents).toHaveBeenCalled();
    });
  });

  describe('editing team details', () => {
    beforeEach(() => {
      component.team = mockTeam;
      component.hasUpdatePermission = true;
      (component as any).updateActionButtons();
    });

    it('toggleEditDetails should populate form on entering edit mode', () => {
      component.editingDetails = false;
      component.toggleEditDetails();

      expect(component.editingDetails).toBeTrue();
      expect(component.editForm.name).toBe(mockTeam.name);
      expect(component.editForm.description).toBe(mockTeam.description);
    });

    it('cancelEditDetails should reset form and exit edit mode', () => {
      component.editingDetails = true;
      component.editForm.name = 'Changed';
      component.cancelEditDetails();

      expect(component.editingDetails).toBeFalse();
      expect(component.editForm.name).toBe(mockTeam.name);
      expect(component.editForm.description).toBe(mockTeam.description);
    });

    it('saveTeamDetails should call service and update team + breadcrumbs', () => {
      const updated = { ...mockTeam, name: 'Updated Team' };
      mockTeamsService.editTeam.and.returnValue(of(updated as any));

      component.editingDetails = true;
      component.editForm.name = 'Updated Team';
      component.editForm.description = 'Updated Description';

      component.saveTeamDetails();

      expect(mockTeamsService.editTeam).toHaveBeenCalledWith(mockTeam.id, {
        name: 'Updated Team',
        description: 'Updated Description'
      });
      expect(component.team).toEqual(updated as any);
      expect(component.editingDetails).toBeFalse();
      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].title).toBe('Updated Team');
    });
  });

  describe('member management', () => {
    beforeEach(() => {
      component.team = mockTeam;
      mockTeamsService.addUserToTeam.and.returnValue(of({} as any));
      mockTeamsService.removeMember.and.returnValue(of({} as any));
      mockTeamsService.getNonMembers.and.returnValue(
        of({ items: [mockMember], totalCount: 1 } as any)
      );
      spyOn(component, 'getMembers');
    });

    it('addMember should open SearchModal and add selected user', () => {
      mockDialog.open.and.returnValue({
        afterClosed: () => of({ selectedItem: mockMember })
      } as any);

      component.addMember();

      expect(mockDialog.open).toHaveBeenCalledWith(
        SearchModalComponent,
        jasmine.any(Object)
      );
      expect(mockTeamsService.addUserToTeam).toHaveBeenCalledWith(
        mockTeam.id,
        mockMember
      );
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('addMember should do nothing if dialog returns no selection', () => {
      mockDialog.open.and.returnValue({
        afterClosed: () => of(null)
      } as any);

      component.addMember();

      expect(mockTeamsService.addUserToTeam).not.toHaveBeenCalled();
    });

    it('removeMember should stop propagation and call service', () => {
      const ev = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopPropagation'
      ]);

      component.removeMember(ev, mockMember);

      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(mockTeamsService.removeMember).toHaveBeenCalledWith(
        mockTeam.id,
        mockMember.id
      );
      expect(component.getMembers).toHaveBeenCalled();
    });
  });

  describe('event management', () => {
    beforeEach(() => {
      component.team = mockTeam;
      component.teamId = mockTeam.id as any;
      mockEventsService.addTeamToEvent.and.returnValue(of({} as any));
      mockEventsService.removeEventFromTeam.and.returnValue(of({} as any));
      spyOn(component, 'getTeamEvents');
    });

    it('addEventToTeam should open SearchModal and add selected event', () => {
      mockDialog.open.and.returnValue({
        afterClosed: () => of({ selectedItem: mockEvent })
      } as any);

      component.addEventToTeam();

      expect(mockDialog.open).toHaveBeenCalledWith(
        SearchModalComponent,
        jasmine.any(Object)
      );
      expect(mockEventsService.addTeamToEvent).toHaveBeenCalledWith(
        String(mockEvent.id),
        mockTeam
      );
      expect(component.getTeamEvents).toHaveBeenCalled();
    });

    it('removeEventFromTeam should stop propagation and call service', () => {
      const ev = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopPropagation'
      ]);

      component.removeEventFromTeam(ev, mockEvent);

      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(mockEventsService.removeEventFromTeam).toHaveBeenCalledWith(
        String(mockEvent.id),
        String(mockTeam.id)
      );
      expect(component.getTeamEvents).toHaveBeenCalled();
    });
  });

  describe('deleteTeam', () => {
    beforeEach(() => {
      component.team = mockTeam;
  
      (mockRouter as any).navigate = jasmine
        .createSpy('navigate')
        .and.returnValue(Promise.resolve(true));
    });
  
    it('should open delete dialog and navigate when confirmed', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
  
      component.deleteTeam();
  
      expect(mockDialog.open).toHaveBeenCalledWith(DeleteTeamComponent, {
        data: { team: mockTeam }
      });
  
      expect((mockRouter as any).navigate).toHaveBeenCalledWith(
        ['../../teams'],
        jasmine.objectContaining({
          relativeTo: jasmine.any(Object)
        })
      );
  
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });
  
    it('should not navigate when cancelled', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(false) } as any);
  
      component.deleteTeam();
  
      expect((mockRouter as any).navigate).not.toHaveBeenCalled();
      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });
  });
  
});
