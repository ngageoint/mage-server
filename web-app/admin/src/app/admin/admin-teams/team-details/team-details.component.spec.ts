import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';
import { StateService } from '@uirouter/angular';
import { of, throwError } from 'rxjs';

import { TeamDetailsComponent } from './team-details.component';
import { TeamsService } from '../teams-service';
import { EventsService } from '../../admin-event/events.service';
import { UserService } from '../../../upgrade/ajs-upgraded-providers';
import { Team } from '../team';
import { User } from '@ngageoint/mage.web-core-lib/user';
import { Event } from 'src/app/filter/filter.types';
import { DeleteTeamComponent } from '../delete-team/delete-team.component';
import { SearchModalComponent } from '../../../core/search-modal/search-modal.component';

describe('TeamDetailsComponent', () => {
  let component: TeamDetailsComponent;
  let fixture: ComponentFixture<TeamDetailsComponent>;
  let mockStateService: jasmine.SpyObj<StateService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockUserService: jasmine.SpyObj<any>;
  let mockTeamsService: jasmine.SpyObj<TeamsService>;
  let mockEventsService: jasmine.SpyObj<EventsService>;

  const mockTeam: Team = {
    id: 'team123' as any,
    name: 'Test Team',
    description: 'Test Description',
    teamEventId: 'event123',
    users: ['user1', 'user2'] as any,
    acl: {
      'user123': {
        permissions: ['update', 'delete']
      }
    } as any
  };

  const mockUser: User = {
    id: 'user123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    role: {
      permissions: ['UPDATE_TEAM', 'DELETE_TEAM']
    }
  } as any;

  const mockEvent: Event = {
    id: 'event123',
    name: 'Test Event',
    description: 'Test Event Description'
  } as any;

  beforeEach(async () => {
    mockStateService = jasmine.createSpyObj('StateService', ['go'], {
      params: { teamId: 'team123' }
    });

    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    mockUserService = {
      myself: mockUser
    };

    mockTeamsService = jasmine.createSpyObj('TeamsService', [
      'getTeamById',
      'getMembers',
      'getNonMembers',
      'addUserToTeam',
      'removeMember',
      'editTeam'
    ]);

    mockEventsService = jasmine.createSpyObj('EventsService', [
      'getEvents',
      'addTeamToEvent',
      'removeEventFromTeam'
    ]);

    await TestBed.configureTestingModule({
      declarations: [TeamDetailsComponent],
      providers: [
        { provide: StateService, useValue: mockStateService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: UserService, useValue: mockUserService },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: EventsService, useValue: mockEventsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TeamDetailsComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.hasUpdatePermission).toBeFalse();
      expect(component.hasDeletePermission).toBeFalse();
      expect(component.editingDetails).toBeFalse();
      expect(component.loadingMembers).toBeTrue();
      expect(component.loadingEvents).toBeTrue();
      expect(component.membersPageIndex).toBe(0);
      expect(component.membersPageSize).toBe(5);
      expect(component.totalMembers).toBe(0);
      expect(component.eventsPageSize).toBe(5);
      expect(component.totalEvents).toBe(0);
      expect(component.membersDataSource).toBeInstanceOf(MatTableDataSource);
      expect(component.eventsDataSource).toBeInstanceOf(MatTableDataSource);
    });
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      mockTeamsService.getTeamById.and.returnValue(of(mockTeam));
      mockTeamsService.getMembers.and.returnValue(of({
        items: [mockUser],
        totalCount: 1
      }));
      mockEventsService.getEvents.and.returnValue(of({
        items: [mockEvent],
        totalCount: 1
      }));
    });

    it('should load team data on init', () => {
      component.ngOnInit();

      expect(mockTeamsService.getTeamById).toHaveBeenCalledWith('team123');
      expect(component.team).toEqual(mockTeam);
      expect(component.teamId).toBe('team123');
    });

    it('should set permissions correctly for users with role permissions', () => {
      component.ngOnInit();

      expect(component.hasUpdatePermission).toBeTrue();
      expect(component.hasDeletePermission).toBeTrue();
    });

    it('should set permissions correctly for users with ACL permissions', () => {
      mockUserService.myself = {
        ...mockUser,
        id: 'user123',
        role: { permissions: [] }
      };

      component.ngOnInit();

      expect(component.hasUpdatePermission).toBeTrue();
      expect(component.hasDeletePermission).toBeTrue();
    });

    it('should deny permissions for users without access', () => {
      mockUserService.myself = {
        ...mockUser,
        id: 'user456',
        role: { permissions: [] }
      };

      const teamWithoutAcl = { ...mockTeam, acl: {} };
      mockTeamsService.getTeamById.and.returnValue(of(teamWithoutAcl));

      component.ngOnInit();

      expect(component.hasUpdatePermission).toBeFalse();
      expect(component.hasDeletePermission).toBeFalse();
    });

    it('should call getMembers and getTeamEvents after loading team', () => {
      spyOn(component, 'getMembers');
      spyOn(component, 'getTeamEvents');

      component.ngOnInit();

      expect(component.getMembers).toHaveBeenCalled();
      expect(component.getTeamEvents).toHaveBeenCalled();
    });
  });

  describe('getMembers', () => {
    beforeEach(() => {
      component.team = mockTeam;
    });

    it('should fetch members successfully', () => {
      const mockResponse = {
        items: [mockUser],
        totalCount: 1
      };
      mockTeamsService.getMembers.and.returnValue(of(mockResponse));

      component.getMembers();

      expect(mockTeamsService.getMembers).toHaveBeenCalledWith({
        id: mockTeam.id,
        term: component.memberSearchTerm,
        page: component.membersPageIndex,
        page_size: component.membersPageSize
      });
      expect(component.loadingMembers).toBeFalse();
      expect(component.membersDataSource.data).toEqual([mockUser]);
      expect(component.totalMembers).toBe(1);
    });

    it('should handle error when fetching members', () => {
      spyOn(console, 'error');
      mockTeamsService.getMembers.and.returnValue(throwError('Error'));

      component.getMembers();

      expect(component.loadingMembers).toBeFalse();
      expect(component.membersDataSource.data).toEqual([]);
      expect(component.totalMembers).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Error fetching members:', 'Error');
    });

    it('should return early if team is not loaded', () => {
      component.team = null as any;

      component.getMembers();

      expect(mockTeamsService.getMembers).not.toHaveBeenCalled();
    });
  });

  describe('getTeamEvents', () => {
    beforeEach(() => {
      component.teamId = 'team123';
    });

    it('should fetch team events successfully', () => {
      const mockResponse = {
        items: [mockEvent],
        totalCount: 1
      };
      mockEventsService.getEvents.and.returnValue(of(mockResponse));

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
  });

  describe('Pagination', () => {
    it('should handle members page change', () => {
      spyOn(component, 'getMembers');
      const pageEvent: PageEvent = {
        pageIndex: 1,
        pageSize: 10,
        length: 20
      };

      component.onMembersPageChange(pageEvent);

      expect(component.membersPageSize).toBe(10);
      expect(component.membersPageIndex).toBe(1);
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('should handle events page change', () => {
      spyOn(component, 'getTeamEvents');
      const pageEvent: PageEvent = {
        pageIndex: 2,
        pageSize: 5,
        length: 15
      };

      component.onEventsPageChange(pageEvent);

      expect(component.eventsPageSize).toBe(5);
      expect(component.teamEventsPage).toBe(2);
      expect(component.getTeamEvents).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('should handle members search change', () => {
      spyOn(component, 'getMembers');

      component.onMembersSearchChange('test search');

      expect(component.membersPageIndex).toBe(0);
      expect(component.memberSearchTerm).toBe('test search');
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('should handle empty search term for members', () => {
      spyOn(component, 'getMembers');

      component.onMembersSearchChange();

      expect(component.memberSearchTerm).toBe('');
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('should handle team events search change', () => {
      spyOn(component, 'getTeamEvents');

      component.onTeamEventSearchChange('event search');

      expect(component.teamEventsPage).toBe(0);
      expect(component.teamEventSearch).toBe('event search');
      expect(component.getTeamEvents).toHaveBeenCalled();
    });
  });

  describe('Team Details Editing', () => {
    beforeEach(() => {
      component.team = mockTeam;
    });

    it('should toggle edit details mode', () => {
      component.toggleEditDetails();

      expect(component.editingDetails).toBeTrue();
      expect(component.editForm.name).toBe(mockTeam.name);
      expect(component.editForm.description).toBe(mockTeam.description);
    });

    it('should save team details', () => {
      const updatedTeam = { ...mockTeam, name: 'Updated Team' };
      mockTeamsService.editTeam.and.returnValue(of(updatedTeam));

      component.editForm.name = 'Updated Team';
      component.editForm.description = 'Updated Description';
      component.editingDetails = true;

      component.saveTeamDetails();

      expect(mockTeamsService.editTeam).toHaveBeenCalledWith(mockTeam.id, {
        name: 'Updated Team',
        description: 'Updated Description'
      });
      expect(component.team).toEqual(updatedTeam);
      expect(component.editingDetails).toBeFalse();
    });

    it('should cancel edit details', () => {
      component.editingDetails = true;
      component.editForm.name = 'Changed Name';

      component.cancelEditDetails();

      expect(component.editingDetails).toBeFalse();
      expect(component.editForm.name).toBe(mockTeam.name);
      expect(component.editForm.description).toBe(mockTeam.description);
    });
  });

  describe('Navigation', () => {
    it('should navigate to teams page', () => {
      component.goToTeams();

      expect(mockStateService.go).toHaveBeenCalledWith('admin.teams');
    });

    it('should navigate to user profile', () => {
      component.goToUserProfile(mockUser);

      expect(mockStateService.go).toHaveBeenCalledWith('admin.user', { userId: mockUser.id });
    });

    it('should navigate to team access page', () => {
      component.team = mockTeam;

      component.goToAccess();

      expect(mockStateService.go).toHaveBeenCalledWith('admin.teamAccess', { teamId: mockTeam.id });
    });

    it('should navigate to event page', () => {
      component.goToEventPage(mockEvent);

      expect(mockStateService.go).toHaveBeenCalledWith('admin.event', { eventId: mockEvent.id });
    });
  });

  describe('Member Management', () => {
    beforeEach(() => {
      component.team = mockTeam;
    });

    it('should open add member dialog', () => {
      const dialogRef = { afterClosed: () => of({ selectedItem: mockUser }) };
      mockDialog.open.and.returnValue(dialogRef as any);
      mockTeamsService.addUserToTeam.and.returnValue(of({}));
      spyOn(component, 'getMembers');

      component.addMember();

      expect(mockDialog.open).toHaveBeenCalledWith(SearchModalComponent, jasmine.any(Object));
      expect(mockTeamsService.addUserToTeam).toHaveBeenCalledWith(mockTeam.id, mockUser);
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('should remove member from team', () => {
      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');
      mockTeamsService.removeMember.and.returnValue(of({}));
      spyOn(component, 'getMembers');

      component.removeMember(mockEvent, mockUser);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockTeamsService.removeMember).toHaveBeenCalledWith(mockTeam.id, mockUser.id);
      expect(component.getMembers).toHaveBeenCalled();
    });

    it('should handle error when removing member', () => {
      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');
      spyOn(console, 'error');
      mockTeamsService.removeMember.and.returnValue(throwError('Error removing member'));

      component.removeMember(mockEvent, mockUser);

      expect(console.error).toHaveBeenCalledWith('Error removing member:', 'Error removing member');
    });
  });

  describe('Event Management', () => {
    beforeEach(() => {
      component.team = mockTeam;
    });

    it('should open add event dialog', () => {
      const dialogRef = { afterClosed: () => of({ selectedItem: mockEvent }) };
      mockDialog.open.and.returnValue(dialogRef as any);
      mockEventsService.addTeamToEvent.and.returnValue(of(mockEvent));
      spyOn(component, 'getTeamEvents');

      component.addEventToTeam();

      expect(mockDialog.open).toHaveBeenCalledWith(SearchModalComponent, jasmine.any(Object));
      expect(mockEventsService.addTeamToEvent).toHaveBeenCalledWith(mockEvent.id.toString(), mockTeam);
      expect(component.getTeamEvents).toHaveBeenCalled();
    });

    it('should handle error when adding event to team', () => {
      const dialogRef = { afterClosed: () => of({ selectedItem: mockEvent }) };
      mockDialog.open.and.returnValue(dialogRef as any);
      spyOn(console, 'error');
      mockEventsService.addTeamToEvent.and.returnValue(throwError('Error adding event'));

      component.addEventToTeam();

      expect(console.error).toHaveBeenCalledWith('Error adding event to team:', 'Error adding event');
    });

    it('should remove event from team', () => {
      const mockClickEvent = new MouseEvent('click');
      spyOn(mockClickEvent, 'stopPropagation');
      mockEventsService.removeEventFromTeam.and.returnValue(of(undefined));
      spyOn(component, 'getTeamEvents');

      component.removeEventFromTeam(mockClickEvent, mockEvent);

      expect(mockClickEvent.stopPropagation).toHaveBeenCalled();
      expect(mockEventsService.removeEventFromTeam).toHaveBeenCalledWith(
        mockEvent.id.toString(),
        mockTeam.id.toString()
      );
      expect(component.getTeamEvents).toHaveBeenCalled();
    });

    it('should handle error when removing event from team', () => {
      const mockClickEvent = new MouseEvent('click');
      spyOn(mockClickEvent, 'stopPropagation');
      spyOn(console, 'error');
      mockEventsService.removeEventFromTeam.and.returnValue(throwError('Error removing event'));

      component.removeEventFromTeam(mockClickEvent, mockEvent);

      expect(console.error).toHaveBeenCalledWith('Error removing event:', 'Error removing event');
    });
  });

  describe('Team Deletion', () => {
    it('should open delete team dialog and navigate on success', () => {
      component.team = mockTeam;
      const dialogRef = { afterClosed: () => of(true) };
      mockDialog.open.and.returnValue(dialogRef as any);

      component.deleteTeam();

      expect(mockDialog.open).toHaveBeenCalledWith(DeleteTeamComponent, {
        data: { team: mockTeam }
      });
      expect(mockStateService.go).toHaveBeenCalledWith('admin.teams');
    });

    it('should not navigate if dialog is cancelled', () => {
      component.team = mockTeam;
      const dialogRef = { afterClosed: () => of(false) };
      mockDialog.open.and.returnValue(dialogRef as any);

      component.deleteTeam();

      expect(mockStateService.go).not.toHaveBeenCalled();
    });
  });

});
