import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog as MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule as MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { TeamDetailsComponent } from './team-details.component';
import { TeamMemberRole, TeamService } from '@ngageoint/mage.web-core-lib/team'
import { AdminEventsService } from '../../services/admin-events.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { Team } from 'core-lib-src/team';
import { User as CoreUser } from '@ngageoint/mage.web-core-lib/user';
import { DeleteTeamComponent } from '../delete-team/delete-team.component';
import { SearchModalComponent } from '../../search-modal/search-modal.component';

describe('TeamDetailsComponent', () => {
  let component: TeamDetailsComponent;
  let fixture: ComponentFixture<TeamDetailsComponent>;

  let paramMap$: BehaviorSubject<any>;

  let mockRoute: any;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSessionService: { user: any; hasPermission: jasmine.Spy };
  let mockTeamsService: jasmine.SpyObj<TeamService>;
  let mockEventsService: jasmine.SpyObj<AdminEventsService>;

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

    mockSessionService = {
      user: mockMyselfWithGlobalPerms,
      hasPermission: jasmine.createSpy('hasPermission').and.callFake(
        (permission: string) => (mockSessionService.user?.role?.permissions || []).includes(permission)
      )
    };
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
    );
    mockEventsService = jasmine.createSpyObj<AdminEventsService>(
      'AdminEventsService',
      ['getEvents', 'addTeamToEvent', 'removeEventFromTeam']
    );

    mockTeamsService.getTeamById.and.returnValue(of(mockTeam));
    mockTeamsService.getMembers.and.returnValue(
      of({ items: [mockMember], totalCount: 1 } as any)
    );
    mockEventsService.getEvents.and.returnValue(
      of({ items: [mockEvent], totalCount: 1 } as any)
    );

    TestBed.configureTestingModule({
      declarations: [TeamDetailsComponent],
      imports: [NoopAnimationsModule, MatSnackBarModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: MatDialog, useValue: mockDialog },
        { provide: SessionService, useValue: mockSessionService },
        { provide: TeamService, useValue: mockTeamsService },
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
    expect(mockTeamsService.getTeamById).toHaveBeenCalledWith('team123');
    expect(mockTeamsService.getMembers).toHaveBeenCalled();
    expect(mockEventsService.getEvents).toHaveBeenCalled();
    expect(component.team).toEqual(mockTeam);
  });

  it('should set permissions via global role permissions', () => {
    mockSessionService.user = mockMyselfWithGlobalPerms;

    fixture.detectChanges();

    expect(component.hasUpdatePermission).toBeTrue();
    expect(component.hasDeletePermission).toBeTrue();
  });

  it('should set permissions via ACL permissions when global perms missing', () => {
    mockSessionService.user = mockMyselfNoGlobalPerms;

    fixture.detectChanges();

    expect(component.hasUpdatePermission).toBeTrue();
    expect(component.hasDeletePermission).toBeTrue();
  });

  it('should deny permissions when no global perms and no ACL match', () => {
    mockSessionService.user = { id: 'someoneElse', role: { permissions: [] } };
    mockTeamsService.getTeamById.and.returnValue(
      of({ ...mockTeam, acl: {} } as any)
    );

    fixture.detectChanges();

    expect(component.hasUpdatePermission).toBeFalse();
    expect(component.hasDeletePermission).toBeFalse();
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
        teamId: mockTeam.id,
        term: component.memberSearchTerm,
        pageIndex: component.membersPageIndex,
        pageSize: component.membersPageSize
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
    });

    it('editTeamDetails should open the edit dialog with the current team', () => {
      mockDialog.open.and.returnValue({ afterClosed: () => of(null) } as any);

      component.editTeamDetails();

      expect(mockDialog.open).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({ data: { team: mockTeam } })
      );
    });

    it('editTeamDetails should update team + breadcrumbs when dialog returns an updated team', () => {
      const updated = { ...mockTeam, name: 'Updated Team' };
      mockDialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);

      component.editTeamDetails();

      expect(component.team).toEqual(updated as any);
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
      spyOn((component as any).snackBar, 'open').and.returnValue({
        onAction: () => of(undefined)
      } as any);

      component.removeMember(ev, mockMember);

      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(mockTeamsService.removeMember).toHaveBeenCalledWith(
        mockTeam.id,
        mockMember.id
      );
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('removeMember should restore the member when undo is clicked', () => {
      const ev = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopPropagation'
      ]);
      mockTeamsService.addUserToTeam.and.returnValue(of(mockTeam));
      spyOn((component as any).snackBar, 'open').and.returnValue({
        onAction: () => of(undefined)
      } as any);

      component.removeMember(ev, mockMember);

      expect(mockTeamsService.addUserToTeam).toHaveBeenCalledWith(
        mockTeam.id,
        mockMember
      );
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
      spyOn((component as any).snackBar, 'open').and.returnValue({
        onAction: () => of(undefined)
      } as any);

      component.removeEventFromTeam(ev, mockEvent);

      expect(ev.stopPropagation).toHaveBeenCalled();
      expect(mockEventsService.removeEventFromTeam).toHaveBeenCalledWith(
        String(mockEvent.id),
        String(mockTeam.id)
      );
      expect(component.getTeamEvents).toHaveBeenCalled();
    });

    it('removeEventFromTeam should restore the event when undo is clicked', () => {
      const ev = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopPropagation'
      ]);
      mockEventsService.addTeamToEvent.and.returnValue(of(mockTeam as any));
      spyOn((component as any).snackBar, 'open').and.returnValue({
        onAction: () => of(undefined)
      } as any);

      component.removeEventFromTeam(ev, mockEvent);

      expect(mockEventsService.addTeamToEvent).toHaveBeenCalledWith(
        String(mockEvent.id),
        mockTeam
      );
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

      expect(mockDialog.open).toHaveBeenCalledWith(
        DeleteTeamComponent,
        jasmine.objectContaining({
          width: '600px',
          data: { team: mockTeam }
        })
      );

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

