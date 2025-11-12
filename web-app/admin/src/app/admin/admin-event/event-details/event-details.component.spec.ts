import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { EventDetailsComponent } from './event-details.component';
import { EventsService } from '../../admin-event/events.service';
import { TeamsService } from '../../admin-teams/teams-service';

describe('EventDetailsComponent', () => {
  let component: EventDetailsComponent;
  let fixture: ComponentFixture<EventDetailsComponent>;
  let eventsService: jasmine.SpyObj<EventsService>;
  let teamsService: jasmine.SpyObj<TeamsService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    const eventsServiceSpy = jasmine.createSpyObj('EventsService', [
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
    ]);

    const teamsServiceSpy = jasmine.createSpyObj('TeamsService', [
      'addUserToTeam',
      'removeMember',
      'updateUserRole'
    ]);

    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [EventDetailsComponent],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: EventsService, useValue: eventsServiceSpy },
        { provide: TeamsService, useValue: teamsServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: '$stateParams', useValue: { eventId: '1' } },
        { provide: '$state', useValue: { go: jasmine.createSpy('go') } }
      ]
    })
      .compileComponents();

    eventsService = TestBed.inject(EventsService) as jasmine.SpyObj<EventsService>;
    teamsService = TestBed.inject(TeamsService) as jasmine.SpyObj<TeamsService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    eventsService.getEventById.and.returnValue(of({
      id: 1,
      name: 'Test Event',
      description: 'Test Description',
      forms: []
    } as any));
    eventsService.getTeamsInEvent.and.returnValue(of({ items: [], totalCount: 0 }));
    eventsService.getMembers.and.returnValue(of({ items: [], totalCount: 0 }));
    eventsService.getNonMembers.and.returnValue(of({ items: [], totalCount: 0 }));
    eventsService.getTeamsNotInEvent.and.returnValue(of({ items: [], totalCount: 0 }));
    eventsService.getAllLayers.and.returnValue(of([]));
    eventsService.getLayersForEvent.and.returnValue(of([]));

    fixture = TestBed.createComponent(EventDetailsComponent);
    component = fixture.componentInstance;
  });

  describe('Basic Component Tests', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.event).toBeNull();
      expect(component.eventTeam).toBeNull();
      expect(component.editingDetails).toBe(false);
      expect(component.editMembers).toBe(false);
      expect(component.editTeams).toBe(false);
      expect(component.editLayers).toBe(false);
    });

    it('should initialize data sources', () => {
      expect(component.membersDataSource).toBeInstanceOf(MatTableDataSource);
      expect(component.teamsDataSource).toBeInstanceOf(MatTableDataSource);
      expect(component.layersDataSource).toBeInstanceOf(MatTableDataSource);
    });

    it('should initialize pagination defaults', () => {
      expect(component.membersPageIndex).toBe(0);
      expect(component.membersPageSize).toBe(5);
      expect(component.teamsPageIndex).toBe(0);
      expect(component.teamsPageSize).toBe(2);
      expect(component.layersPage).toBe(0);
      expect(component.layersPerPage).toBe(5);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should load event data on init', () => {
      component.ngOnInit();

      expect(eventsService.getEventById).toHaveBeenCalledWith('1');
      expect(eventsService.getTeamsInEvent).toHaveBeenCalled();
    });

    it('should set permissions on init', () => {
      component.ngOnInit();

      expect(component.hasReadPermission).toBe(true);
      expect(component.hasUpdatePermission).toBe(true);
      expect(component.hasDeletePermission).toBe(true);
    });

    it('should clean up on destroy', () => {
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Simple Getters', () => {
    it('should return non-archived forms', () => {
      component.event = {
        id: 1,
        name: 'Test',
        forms: [
          { id: 1, archived: false } as any,
          { id: 2, archived: true } as any,
          { id: 3, archived: false } as any
        ]
      } as any;

      const result = component.nonArchivedForms;

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('should return empty array when event has no forms', () => {
      component.event = { id: 1, name: 'Test' } as any;

      expect(component.nonArchivedForms).toEqual([]);
    });

    it('should return empty array when event is null', () => {
      component.event = null;

      expect(component.nonArchivedForms).toEqual([]);
    });

    it('should filter forms based on showArchivedForms flag', () => {
      component.event = {
        id: 1,
        name: 'Test',
        forms: [
          { id: 1, archived: false } as any,
          { id: 2, archived: true } as any
        ]
      } as any;

      component.showArchivedForms = false;
      expect(component.filteredForms.length).toBe(1);

      component.showArchivedForms = true;
      expect(component.filteredForms.length).toBe(2);
    });
  });

  describe('Toggle Methods', () => {
    it('should toggle edit details mode', () => {
      component.event = {
        id: 1,
        name: 'Test Event',
        description: 'Test Description'
      } as any;

      expect(component.editingDetails).toBe(false);

      component.toggleEditDetails();
      expect(component.editingDetails).toBe(true);
      expect(component.eventEditForm.name).toBe('Test Event');
      expect(component.eventEditForm.description).toBe('Test Description');

      component.toggleEditDetails();
      expect(component.editingDetails).toBe(false);
    });

    it('should toggle edit members mode', () => {
      expect(component.editMembers).toBe(false);
      component.toggleEditMembers();
      expect(component.editMembers).toBe(true);
      component.toggleEditMembers();
      expect(component.editMembers).toBe(false);
    });

    it('should toggle edit teams mode', () => {
      expect(component.editTeams).toBe(false);
      component.toggleEditTeams();
      expect(component.editTeams).toBe(true);
      component.toggleEditTeams();
      expect(component.editTeams).toBe(false);
    });

    it('should toggle edit layers mode', () => {
      expect(component.editLayers).toBe(false);
      component.toggleEditLayers();
      expect(component.editLayers).toBe(true);
      component.toggleEditLayers();
      expect(component.editLayers).toBe(false);
    });
  });

  describe('Form Preview', () => {
    it('should preview form', () => {
      const form = { id: 1, name: 'Test Form' };
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');

      component.preview(event, form);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.previewForm).toBe(form);
    });

    it('should close preview', () => {
      component.previewForm = { id: 1, name: 'Test Form' };

      component.closePreview();

      expect(component.previewForm).toBeNull();
    });
  });

  describe('Track By Functions', () => {
    it('should track forms by id', () => {
      const form = { id: 123, name: 'Test' };

      const result = component.trackByFormId(0, form);

      expect(result).toBe(123);
    });
  });

  describe('Cancel Actions', () => {
    it('should cancel edit details', () => {
      component.event = {
        id: 1,
        name: 'Original Name',
        description: 'Original Description'
      } as any;
      component.editingDetails = true;
      component.eventEditForm.name = 'Changed Name';
      component.eventEditForm.description = 'Changed Description';

      component.cancelEditDetails();

      expect(component.editingDetails).toBe(false);
      expect(component.eventEditForm.name).toBe('Original Name');
      expect(component.eventEditForm.description).toBe('Original Description');
    });
  });

  describe('User Role Management', () => {
    beforeEach(() => {
      component.eventTeam = {
        id: '1',
        name: 'Test Team',
        acl: {
          'user1': { role: 'OWNER' },
          'user2': { role: 'MANAGER' }
        }
      } as any;
    });

    it('should get user role from ACL', () => {
      const user = { id: 'user1' } as any;

      const role = component.getUserRole(user);

      expect(role).toBe('OWNER');
    });

    it('should return GUEST when user not in ACL', () => {
      const user = { id: 'unknown' } as any;

      const role = component.getUserRole(user);

      expect(role).toBe('GUEST');
    });

    it('should return GUEST when no event team', () => {
      component.eventTeam = null;
      const user = { id: 'user1' } as any;

      const role = component.getUserRole(user);

      expect(role).toBe('GUEST');
    });

    it('should generate role class', () => {
      const user = { id: 'user1' } as any;

      const roleClass = component.getRoleClass(user);

      expect(roleClass).toBe('user-role-badge role-owner');
    });
  });

  describe('Search Methods', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
    });

    it('should search members and reset page', () => {
      component.membersPageIndex = 2;
      component.memberSearchTerm = 'test';

      component.searchMembers();

      expect(component.membersPageIndex).toBe(0);
      expect(eventsService.getMembers).toHaveBeenCalled();
    });

    it('should search non-members and reset page', () => {
      component.nonMembersPageIndex = 2;
      component.nonMemberSearchTerm = 'test';

      component.searchNonMembers();

      expect(component.nonMembersPageIndex).toBe(0);
      expect(eventsService.getNonMembers).toHaveBeenCalled();
    });

    it('should search teams and reset page', () => {
      component.teamsPageIndex = 2;
      component.teamSearchTerm = 'test';

      component.searchTeams();

      expect(component.teamsPageIndex).toBe(0);
      expect(eventsService.getTeamsInEvent).toHaveBeenCalled();
    });

    it('should search non-teams and reset page', () => {
      component.nonTeamsPageIndex = 2;
      component.nonTeamSearchTerm = 'test';

      component.searchNonTeams();

      expect(component.nonTeamsPageIndex).toBe(0);
      expect(eventsService.getTeamsNotInEvent).toHaveBeenCalled();
    });
  });

  describe('Layer Filtering', () => {
    beforeEach(() => {
      component.eventLayers = [
        { id: 1, name: 'Alpha Layer', type: 'Feature' } as any,
        { id: 2, name: 'Beta Layer', type: 'Imagery' } as any
      ];
    });

    it('should filter layers by search term', () => {
      component.layerSearch = 'alpha';

      component.filterLayers();

      expect(component.filteredLayers.length).toBe(1);
      expect(component.filteredLayers[0].name).toBe('Alpha Layer');
    });

    it('should return all layers when search is empty', () => {
      component.layerSearch = '';

      component.filterLayers();

      expect(component.filteredLayers.length).toBe(2);
    });

    it('should filter non-layers by search term', () => {
      component.nonLayers = [
        { id: 3, name: 'Gamma Layer', type: 'Feature' } as any,
        { id: 4, name: 'Delta Layer', type: 'Imagery' } as any
      ];
      component.nonLayerSearch = 'gamma';

      component.filterNonLayers();

      expect(component.filteredNonLayers.length).toBe(1);
      expect(component.filteredNonLayers[0].name).toBe('Gamma Layer');
    });
  });

  describe('Pagination Helpers', () => {
    describe('Member Pagination', () => {
      it('should check if has next member page', () => {
        component.membersPageIndex = 0;
        component.membersPageSize = 5;
        component.membersPage = { items: [], totalCount: 15 };

        expect(component.hasNextMember()).toBe(true);
      });

      it('should check if has previous member page', () => {
        component.membersPageIndex = 1;
        component.membersPage = { items: [], totalCount: 15 };

        expect(component.hasPreviousMember()).toBe(true);
      });

      it('should return false when on first page', () => {
        component.membersPageIndex = 0;
        component.membersPage = { items: [], totalCount: 15 };

        expect(component.hasPreviousMember()).toBe(false);
      });
    });

    describe('Team Pagination', () => {
      it('should check if has next team page', () => {
        component.teamsPageIndex = 0;
        component.teamsPageSize = 2;
        component.teamsPage = { items: [], totalCount: 10 };

        expect(component.hasNextTeam()).toBe(true);
      });

      it('should check if has previous team page', () => {
        component.teamsPageIndex = 1;
        component.teamsPage = { items: [], totalCount: 10 };

        expect(component.hasPreviousTeam()).toBe(true);
      });
    });

    describe('Non-Member Pagination', () => {
      it('should check if has next non-member page', () => {
        component.nonMembersPageIndex = 0;
        component.nonMembersPageSize = 5;
        component.nonMembersPage = { items: [], totalCount: 20 };

        expect(component.hasNextNonMember()).toBe(true);
      });

      it('should check if has previous non-member page', () => {
        component.nonMembersPageIndex = 1;
        component.nonMembersPage = { items: [], totalCount: 20 };

        expect(component.hasPreviousNonMember()).toBe(true);
      });
    });

    describe('Non-Team Pagination', () => {
      it('should check if has next non-team page', () => {
        component.nonTeamsPageIndex = 0;
        component.nonTeamsPageSize = 5;
        component.nonTeamsPage = { items: [], totalCount: 15 };

        expect(component.hasNextNonTeam()).toBe(true);
      });

      it('should check if has previous non-team page', () => {
        component.nonTeamsPageIndex = 1;
        component.nonTeamsPage = { items: [], totalCount: 15 };

        expect(component.hasPreviousNonTeam()).toBe(true);
      });
    });
  });

  describe('Pagination Navigation', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
    });

    it('should navigate to next member page', () => {
      component.membersPageIndex = 0;
      component.membersPageSize = 5;
      component.membersPage = { items: [], totalCount: 15 };

      component.nextMemberPage();

      expect(component.membersPageIndex).toBe(1);
      expect(eventsService.getMembers).toHaveBeenCalled();
    });

    it('should navigate to previous member page', () => {
      component.membersPageIndex = 2;
      component.membersPage = { items: [], totalCount: 15 };

      component.previousMemberPage();

      expect(component.membersPageIndex).toBe(1);
      expect(eventsService.getMembers).toHaveBeenCalled();
    });

    it('should not navigate when no next member page', () => {
      component.membersPageIndex = 2;
      component.membersPageSize = 5;
      component.membersPage = { items: [], totalCount: 15 };

      component.nextMemberPage();

      expect(component.membersPageIndex).toBe(2);
    });

    it('should navigate to next team page', () => {
      component.teamsPageIndex = 0;
      component.teamsPageSize = 2;
      component.teamsPage = { items: [], totalCount: 10 };

      component.nextTeamPage();

      expect(component.teamsPageIndex).toBe(1);
      expect(eventsService.getTeamsInEvent).toHaveBeenCalled();
    });

    it('should navigate to previous team page', () => {
      component.teamsPageIndex = 2;
      component.teamsPage = { items: [], totalCount: 10 };

      component.previousTeamPage();

      expect(component.teamsPageIndex).toBe(1);
      expect(eventsService.getTeamsInEvent).toHaveBeenCalled();
    });

    it('should navigate to next non-member page', () => {
      component.nonMembersPageIndex = 0;
      component.nonMembersPageSize = 5;
      component.nonMembersPage = { items: [], totalCount: 20 };

      component.nextNonMemberPage();

      expect(component.nonMembersPageIndex).toBe(1);
      expect(eventsService.getNonMembers).toHaveBeenCalled();
    });

    it('should navigate to previous non-member page', () => {
      component.nonMembersPageIndex = 2;
      component.nonMembersPage = { items: [], totalCount: 20 };

      component.previousNonMemberPage();

      expect(component.nonMembersPageIndex).toBe(1);
      expect(eventsService.getNonMembers).toHaveBeenCalled();
    });

    it('should navigate to next non-team page', () => {
      component.nonTeamsPageIndex = 0;
      component.nonTeamsPageSize = 5;
      component.nonTeamsPage = { items: [], totalCount: 15 };

      component.nextNonTeamPage();

      expect(component.nonTeamsPageIndex).toBe(1);
      expect(eventsService.getTeamsNotInEvent).toHaveBeenCalled();
    });

    it('should navigate to previous non-team page', () => {
      component.nonTeamsPageIndex = 2;
      component.nonTeamsPage = { items: [], totalCount: 15 };

      component.previousNonTeamPage();

      expect(component.nonTeamsPageIndex).toBe(1);
      expect(eventsService.getTeamsNotInEvent).toHaveBeenCalled();
    });
  });

  describe('Member Management', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
      component.eventTeam = { id: '1', name: 'Test Team' } as any;
    });

    it('should remove member from team', () => {
      const user = { id: '1', username: 'user1' } as any;
      const event = new MouseEvent('click');
      teamsService.removeMember.and.returnValue(of({} as any));

      component.removeMember(event, user);

      expect(teamsService.removeMember).toHaveBeenCalledWith('1', '1');
    });

    it('should handle remove member error', () => {
      const user = { id: '1', username: 'user1' } as any;
      const event = new MouseEvent('click');
      spyOn(console, 'error');
      teamsService.removeMember.and.returnValue(throwError(() => new Error('Remove failed')));

      component.removeMember(event, user);

      expect(console.error).toHaveBeenCalledWith('Error removing member:', jasmine.any(Error));
    });

    it('should not remove member without event team', () => {
      component.eventTeam = null;
      const user = { id: '1', username: 'user1' } as any;
      const event = new MouseEvent('click');
      spyOn(console, 'error');

      component.removeMember(event, user);

      expect(console.error).toHaveBeenCalledWith('Event team not found');
      expect(teamsService.removeMember).not.toHaveBeenCalled();
    });

    it('should update user role', () => {
      const user = { id: '1', username: 'user1', displayName: 'User One' } as any;
      const roleEvent = { target: { value: 'MANAGER' } };
      teamsService.updateUserRole.and.returnValue(of({ id: '1' } as any));
      spyOn(console, 'log');

      component.updateUserRole(user, roleEvent);

      expect(console.log).toHaveBeenCalledWith('Updating user User One role to MANAGER');
      expect(teamsService.updateUserRole).toHaveBeenCalledWith('1', '1', 'MANAGER');
    });

    it('should handle update role error', () => {
      component.eventTeam = null;
      const user = { id: '1', username: 'user1' } as any;
      const roleEvent = { target: { value: 'MANAGER' } };
      spyOn(console, 'error');

      component.updateUserRole(user, roleEvent);

      expect(console.error).toHaveBeenCalledWith('Event team not found');
    });
  });

  describe('Team Management', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
    });

    it('should add team and log', () => {
      const team = { id: '1', name: 'Team 1' } as any;
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      spyOn(console, 'log');

      component.addTeam(event, team);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Adding team:', team);
    });

    it('should remove team from event', () => {
      const team = { id: '1', name: 'Team 1' } as any;
      const event = new MouseEvent('click');
      eventsService.removeEventFromTeam.and.returnValue(of(undefined as void));

      component.removeTeam(event, team);

      expect(eventsService.removeEventFromTeam).toHaveBeenCalledWith('1', '1');
    });

    it('should not remove team without event', () => {
      component.event = null;
      const team = { id: '1', name: 'Team 1' } as any;
      const event = new MouseEvent('click');

      component.removeTeam(event, team);

      expect(eventsService.removeEventFromTeam).not.toHaveBeenCalled();
    });

    it('should load teams page', () => {
      const mockTeams = [
        { id: '1', name: 'Team 1' } as any,
        { id: '2', name: 'Team 2' } as any
      ];
      eventsService.getTeamsInEvent.and.returnValue(of({
        items: mockTeams,
        totalCount: 2,
        pageSize: 2,
        pageIndex: 0
      }));

      component.getTeamsPage();

      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith('1', {
        page: 0,
        page_size: 2,
        term: '',
        total: true,
        omit_event_teams: true
      });
    });

    it('should not load teams without event', () => {
      component.event = null;

      component.getTeamsPage();

      expect(eventsService.getTeamsInEvent).not.toHaveBeenCalled();
    });

    it('should load non-teams page', () => {
      const mockTeams = [{ id: '3', name: 'Team 3' } as any];
      eventsService.getTeamsNotInEvent.and.returnValue(of({
        items: mockTeams,
        totalCount: 1,
        pageSize: 5,
        pageIndex: 0
      }));

      component.getNonTeamsPage();

      expect(eventsService.getTeamsNotInEvent).toHaveBeenCalledWith('1', {
        page: 0,
        page_size: 5,
        term: '',
        total: true,
        omit_event_teams: true
      });
    });
  });

  describe('Layer Management', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
    });

    it('should load layers successfully', () => {
      const allLayers = [
        { id: 1, name: 'Layer 1' } as any,
        { id: 2, name: 'Layer 2' } as any
      ];
      const eventLayers = [{ id: 1, name: 'Layer 1' } as any];
      eventsService.getAllLayers.and.returnValue(of(allLayers));
      eventsService.getLayersForEvent.and.returnValue(of(eventLayers));

      component.loadLayers();

      expect(eventsService.getAllLayers).toHaveBeenCalled();
      expect(eventsService.getLayersForEvent).toHaveBeenCalledWith('1');
    });

    it('should not load layers without event', () => {
      component.event = null;

      component.loadLayers();

      expect(eventsService.getAllLayers).not.toHaveBeenCalled();
    });

    it('should add layer to event', () => {
      const layer = { id: 2, name: 'Layer 2' } as any;
      const event = new MouseEvent('click');
      eventsService.addLayerToEvent.and.returnValue(of({} as any));

      component.addLayer(event, layer);

      expect(eventsService.addLayerToEvent).toHaveBeenCalledWith('1', { id: 2 });
    });

    it('should not add layer without event', () => {
      component.event = null;
      const layer = { id: 2, name: 'Layer 2' } as any;
      const event = new MouseEvent('click');

      component.addLayer(event, layer);

      expect(eventsService.addLayerToEvent).not.toHaveBeenCalled();
    });

    it('should remove layer from event', () => {
      const layer = { id: 1, name: 'Layer 1' } as any;
      const event = new MouseEvent('click');
      eventsService.removeLayerFromEvent.and.returnValue(of({} as any));

      component.removeLayer(event, layer);

      expect(eventsService.removeLayerFromEvent).toHaveBeenCalledWith('1', 1);
    });

    it('should not remove layer without event', () => {
      component.event = null;
      const layer = { id: 1, name: 'Layer 1' } as any;
      const event = new MouseEvent('click');

      component.removeLayer(event, layer);

      expect(eventsService.removeLayerFromEvent).not.toHaveBeenCalled();
    });

    it('should navigate to layer', () => {
      const layer = { id: 1, name: 'Layer 1' } as any;
      const mockState = component['$state'];

      component.gotoLayer(layer);

      expect(mockState.go).toHaveBeenCalledWith('admin.layer', { layerId: 1 });
    });
  });

  describe('Form Restrictions', () => {
    beforeEach(() => {
      component.event = {
        id: 1,
        name: 'Test',
        minObservationForms: 0,
        maxObservationForms: 10,
        forms: [{ id: 1, min: 0, max: 5 }]
      } as any;
    });

    it('should save form restrictions', () => {
      eventsService.updateEvent.and.returnValue(of(component.event as any));

      component.saveFormRestrictions();

      expect(eventsService.updateEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({
        minObservationForms: 0,
        maxObservationForms: 10
      }));
    });

    it('should handle save restrictions error', () => {
      const error = { error: { message: 'Validation error' } };
      eventsService.updateEvent.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.saveFormRestrictions();

      expect(console.error).toHaveBeenCalledWith('Error saving form restrictions:', error);
      expect(component.restrictionsError).toEqual({ message: 'Validation error' });
    });

    it('should not save without event', () => {
      component.event = null;

      component.saveFormRestrictions();

      expect(eventsService.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('Event Details Editing', () => {
    beforeEach(() => {
      component.event = {
        id: 1,
        name: 'Test Event',
        description: 'Test Description'
      } as any;
    });

    it('should save event details', () => {
      const updatedEvent = { ...component.event, name: 'Updated' } as any;
      eventsService.updateEvent.and.returnValue(of(updatedEvent));
      component.eventEditForm.name = 'Updated';

      component.saveEventDetails();

      expect(eventsService.updateEvent).toHaveBeenCalled();
      expect(component.editingDetails).toBe(false);
    });

    it('should handle save error', () => {
      eventsService.updateEvent.and.returnValue(throwError(() => new Error('Save failed')));
      spyOn(console, 'error');

      component.saveEventDetails();

      expect(console.error).toHaveBeenCalledWith('Error updating event:', jasmine.any(Error));
    });

    it('should not save without event', () => {
      component.event = null;

      component.saveEventDetails();

      expect(eventsService.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('Event Actions', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test Event' } as any;
    });

    it('should navigate to edit event', () => {
      const mockState = component['$state'];

      component.editEvent(component.event as any);

      expect(mockState.go).toHaveBeenCalledWith('admin.eventEdit', { eventId: 1 });
    });

    it('should navigate to edit access', () => {
      const mockState = component['$state'];

      component.editAccess(component.event as any);

      expect(mockState.go).toHaveBeenCalledWith('admin.eventAccess', { eventId: 1 });
    });

    it('should navigate to edit form', () => {
      const form = { id: 1, name: 'Form 1' };
      const mockState = component['$state'];

      component.editForm(component.event as any, form);

      expect(mockState.go).toHaveBeenCalledWith('admin.formEdit', { eventId: 1, formId: 1 });
    });

    it('should navigate to member (user)', () => {
      const user = { id: '1', username: 'user1' } as any;
      const mockState = component['$state'];

      component.gotoMember(user);

      expect(mockState.go).toHaveBeenCalledWith('admin.user', { userId: '1' });
    });

    it('should navigate to member (team)', () => {
      const team = { id: '1', name: 'Team 1' } as any;
      const mockState = component['$state'];

      component.gotoMember(team);

      expect(mockState.go).toHaveBeenCalledWith('admin.team', { teamId: '1' });
    });

    it('should navigate to team', () => {
      const team = { id: '1', name: 'Team 1' } as any;
      const mockState = component['$state'];

      component.gotoTeam(team);

      expect(mockState.go).toHaveBeenCalledWith('admin.team', { teamId: '1' });
    });

    it('should complete event', () => {
      const completedEvent = { ...component.event, complete: true } as any;
      eventsService.updateEvent.and.returnValue(of(completedEvent));

      component.completeEvent(component.event as any);

      expect(eventsService.updateEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({
        complete: true
      }));
    });

    it('should not complete without event', () => {
      component.completeEvent(null as any);

      expect(eventsService.updateEvent).not.toHaveBeenCalled();
    });

    it('should activate event', () => {
      const activeEvent = { ...component.event, complete: false } as any;
      eventsService.updateEvent.and.returnValue(of(activeEvent));

      component.activateEvent(component.event as any);

      expect(eventsService.updateEvent).toHaveBeenCalledWith('1', jasmine.objectContaining({
        complete: false
      }));
    });

    it('should not activate without event', () => {
      component.activateEvent(null as any);

      expect(eventsService.updateEvent).not.toHaveBeenCalled();
    });

    it('should delete event and navigate', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(true));
      dialog.open.and.returnValue(dialogRef);

      component.deleteEvent();

      expect(dialog.open).toHaveBeenCalled();
    });

    it('should not delete without event', () => {
      component.event = null;

      component.deleteEvent();

      expect(dialog.open).not.toHaveBeenCalled();
    });
  });

  describe('Page Change Handlers', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
    });

    it('should handle member search change', () => {
      component.onMemberSearchChange('search');

      expect(component.memberSearchTerm).toBe('search');
      expect(component.membersPageIndex).toBe(0);
    });

    it('should handle members page change', () => {
      component.onMembersPageChange({ pageIndex: 1, pageSize: 10, length: 50 });

      expect(component.membersPageIndex).toBe(1);
      expect(component.membersPageSize).toBe(10);
    });

    it('should handle team search change', () => {
      component.onTeamSearchChange('team');

      expect(component.teamSearchTerm).toBe('team');
      expect(component.teamsPageIndex).toBe(0);
    });

    it('should handle teams page change', () => {
      component.onTeamsPageChange({ pageIndex: 2, pageSize: 5, length: 25 });

      expect(component.teamsPageIndex).toBe(2);
      expect(component.teamsPageSize).toBe(5);
    });

    it('should handle layer search change', () => {
      component.eventLayers = [{ id: 1, name: 'Layer 1' } as any];

      component.onLayerSearchChange('layer');

      expect(component.layerSearch).toBe('layer');
      expect(component.layersPage).toBe(0);
    });

    it('should handle layers page change', () => {
      component.onLayersPageChange({ pageIndex: 1, pageSize: 10, length: 20 });

      expect(component.layersPage).toBe(1);
      expect(component.layersPerPage).toBe(10);
    });
  });

  describe('Form Operations', () => {
    beforeEach(() => {
      component.event = {
        id: 1,
        name: 'Test',
        forms: [
          { id: 1, name: 'Form 1', archived: false },
          { id: 2, name: 'Form 2', archived: false }
        ]
      } as any;
    });

    it('should create form dialog', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.createForm();

      expect(dialog.open).toHaveBeenCalled();
    });

    it('should move form up', () => {
      eventsService.updateEvent.and.returnValue(of(component.event as any));
      const form = component.event!.forms![1];
      const event = new MouseEvent('click');

      component.moveFormUp(event, form);

      expect(eventsService.updateEvent).toHaveBeenCalled();
      expect(component.animatingFormId).toBe(form.id);
    });

    it('should move form down', () => {
      eventsService.updateEvent.and.returnValue(of(component.event as any));
      const form = component.event!.forms![0];
      const event = new MouseEvent('click');

      component.moveFormDown(event, form);

      expect(eventsService.updateEvent).toHaveBeenCalled();
      expect(component.animatingFormId).toBe(form.id);
    });

    it('should handle form drop', () => {
      eventsService.updateEvent.and.returnValue(of(component.event as any));
      const dropEvent = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      component.onFormDrop(dropEvent);

      expect(eventsService.updateEvent).toHaveBeenCalled();
    });

    it('should not perform operations without forms', () => {
      component.event!.forms = undefined;
      const event = new MouseEvent('click');

      component.moveFormUp(event, { id: 1 });
      component.moveFormDown(event, { id: 1 });
      component.onFormDrop({ previousIndex: 0, currentIndex: 1 } as any);

      expect(eventsService.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('Get non-archived forms', () => {
    it('should return non-archived forms getter', () => {
      component.event = {
        id: 1,
        name: 'Test',
        forms: [
          { id: 1, archived: false },
          { id: 2, archived: true },
          { id: 3, archived: false }
        ]
      } as any;

      const forms = component.nonArchivedForms;

      expect(forms.length).toBe(2);
    });
  });
});
