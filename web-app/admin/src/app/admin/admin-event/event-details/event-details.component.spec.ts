import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSelectChange } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { StateService } from '@uirouter/angular';

import { EventDetailsComponent } from './event-details.component';
import { EventsService } from '../../admin-event/events.service';
import { TeamsService } from '../../admin-teams/teams-service';

describe('EventDetailsComponent', () => {
  let component: EventDetailsComponent;
  let fixture: ComponentFixture<EventDetailsComponent>;
  let eventsService: jasmine.SpyObj<EventsService>;
  let teamsService: jasmine.SpyObj<TeamsService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let stateService: jasmine.SpyObj<StateService>;

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
    const stateServiceSpy = jasmine.createSpyObj('StateService', ['go']);
    stateServiceSpy.params = { eventId: '1' };

    await TestBed.configureTestingModule({
      declarations: [EventDetailsComponent],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: EventsService, useValue: eventsServiceSpy },
        { provide: TeamsService, useValue: teamsServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: StateService, useValue: stateServiceSpy }
      ]
    })
      .compileComponents();

    eventsService = TestBed.inject(EventsService) as jasmine.SpyObj<EventsService>;
    teamsService = TestBed.inject(TeamsService) as jasmine.SpyObj<TeamsService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    stateService = TestBed.inject(StateService) as jasmine.SpyObj<StateService>;

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
      expect(component.teamsPageSize).toBe(5);
      expect(component.layersPageIndex).toBe(0);
      expect(component.layersPageSize).toBe(5);
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

    it('should search teams and reset page', () => {
      component.teamsPageIndex = 2;
      component.teamSearchTerm = 'test';

      component.searchTeams();

      expect(component.teamsPageIndex).toBe(0);
      expect(eventsService.getTeamsInEvent).toHaveBeenCalled();
    });
  });

  describe('Member Management', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
      component.eventTeam = { id: '1', name: 'Test Team' } as any;
    });

    it('should open dialog to add member to event', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.addMemberToEvent();

      expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
        panelClass: 'search-modal-dialog',
        data: jasmine.objectContaining({
          title: 'Add Members to Event',
          type: 'members'
        })
      }));
    });

    it('should add member when dialog returns selection', () => {
      const selectedUser = { id: '2', username: 'newuser' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedUser }));
      dialog.open.and.returnValue(dialogRef);
      teamsService.addUserToTeam.and.returnValue(of({} as any));
      spyOn(component, 'getMembersPage');

      component.addMemberToEvent();

      expect(teamsService.addUserToTeam).toHaveBeenCalledWith('1', selectedUser);
      expect(component.getMembersPage).toHaveBeenCalled();
    });

    it('should handle error when adding member fails', () => {
      const selectedUser = { id: '2', username: 'newuser' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedUser }));
      dialog.open.and.returnValue(dialogRef);
      teamsService.addUserToTeam.and.returnValue(throwError(() => new Error('Add failed')));
      spyOn(console, 'error');

      component.addMemberToEvent();

      expect(console.error).toHaveBeenCalledWith('Error adding member:', jasmine.any(Error));
    });

    it('should not add member when dialog is cancelled', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.addMemberToEvent();

      expect(teamsService.addUserToTeam).not.toHaveBeenCalled();
    });

    it('should not open dialog when event team not found', () => {
      component.eventTeam = null;
      spyOn(console, 'error');

      component.addMemberToEvent();

      expect(console.error).toHaveBeenCalledWith('Event team not found');
      expect(dialog.open).not.toHaveBeenCalled();
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
      const roleEvent = { source: null, value: 'MANAGER' } as MatSelectChange;
      component.membersDataSource.data = [user];

      component.updateUserRole(user, roleEvent);

      expect(component['pendingRoleChanges'].get('1')).toBe('MANAGER');
      expect(component.membersDataSource.data.length).toBe(1);
    });

    it('should store multiple pending role changes', () => {
      const user1 = { id: '1', username: 'user1' } as any;
      const user2 = { id: '2', username: 'user2' } as any;
      const roleEvent1 = { source: null, value: 'MANAGER' } as MatSelectChange;
      const roleEvent2 = { source: null, value: 'OWNER' } as MatSelectChange;
      component.membersDataSource.data = [user1, user2];

      component.updateUserRole(user1, roleEvent1);
      component.updateUserRole(user2, roleEvent2);

      expect(component['pendingRoleChanges'].get('1')).toBe('MANAGER');
      expect(component['pendingRoleChanges'].get('2')).toBe('OWNER');
      expect(component['pendingRoleChanges'].size).toBe(2);
    });
  });

  describe('Team Management', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
    });

    it('should open dialog to add team to event', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.addTeamToEvent();

      expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
        panelClass: 'search-modal-dialog',
        data: jasmine.objectContaining({
          title: 'Add Teams to Event',
          type: 'teams'
        })
      }));
    });

    it('should add team when dialog returns selection', () => {
      const selectedTeam = { id: '2', name: 'New Team' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedTeam }));
      dialog.open.and.returnValue(dialogRef);
      eventsService.addTeamToEvent.and.returnValue(of(undefined));
      spyOn(component, 'getTeamsPage');

      component.addTeamToEvent();

      expect(eventsService.addTeamToEvent).toHaveBeenCalledWith('1', selectedTeam);
      expect(component.getTeamsPage).toHaveBeenCalled();
    });

    it('should handle error when adding team fails', () => {
      const selectedTeam = { id: '2', name: 'New Team' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedTeam }));
      dialog.open.and.returnValue(dialogRef);
      eventsService.addTeamToEvent.and.returnValue(throwError(() => new Error('Add failed')));
      spyOn(console, 'error');

      component.addTeamToEvent();

      expect(console.error).toHaveBeenCalledWith('Error adding team:', jasmine.any(Error));
    });

    it('should not add team when dialog is cancelled', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.addTeamToEvent();

      expect(eventsService.addTeamToEvent).not.toHaveBeenCalled();
    });

    it('should not open dialog when event not found', () => {
      component.event = null;

      component.addTeamToEvent();

      expect(dialog.open).not.toHaveBeenCalled();
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
        pageSize: 5,
        pageIndex: 0
      }));

      component.getTeamsPage();

      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith('1', {
        page: 0,
        page_size: 5,
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
  });

  describe('Layer Management', () => {
    beforeEach(() => {
      component.event = { id: 1, name: 'Test' } as any;
    });

    it('should open dialog to add layer to event', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.addLayerToEvent();

      expect(dialog.open).toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
        panelClass: 'search-modal-dialog',
        data: jasmine.objectContaining({
          title: 'Add Layers to Event',
          type: 'layers'
        })
      }));
    });

    it('should add layer when dialog returns selection', () => {
      const selectedLayer = { id: 2, name: 'New Layer' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedLayer }));
      dialog.open.and.returnValue(dialogRef);
      eventsService.addLayerToEvent.and.returnValue(of(undefined));
      spyOn(component, 'loadLayers');

      component.addLayerToEvent();

      expect(eventsService.addLayerToEvent).toHaveBeenCalledWith('1', { id: 2 });
      expect(component.loadLayers).toHaveBeenCalled();
    });

    it('should handle error when adding layer fails', () => {
      const selectedLayer = { id: 2, name: 'New Layer' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedLayer }));
      dialog.open.and.returnValue(dialogRef);
      eventsService.addLayerToEvent.and.returnValue(throwError(() => new Error('Add failed')));
      spyOn(console, 'error');

      component.addLayerToEvent();

      expect(console.error).toHaveBeenCalledWith('Error adding layer:', jasmine.any(Error));
    });

    it('should not add layer when dialog is cancelled', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.addLayerToEvent();

      expect(eventsService.addLayerToEvent).not.toHaveBeenCalled();
    });

    it('should not open dialog when event not found', () => {
      component.event = null;

      component.addLayerToEvent();

      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('should load layers successfully', () => {
      const eventLayers = [{ id: 1, name: 'Layer 1' } as any];
      eventsService.getLayersForEvent.and.returnValue(of(eventLayers));

      component.loadLayers();

      expect(eventsService.getLayersForEvent).toHaveBeenCalledWith('1');
    });

    it('should not load layers without event', () => {
      component.event = null;

      component.loadLayers();

      expect(eventsService.getLayersForEvent).not.toHaveBeenCalled();
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

      component.gotoLayer(layer);

      expect(stateService.go).toHaveBeenCalledWith('admin.layer', { layerId: 1 });
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
      component.editEvent(component.event as any);

      expect(stateService.go).toHaveBeenCalledWith('admin.eventEdit', { eventId: 1 });
    });

    it('should navigate to edit access', () => {
      component.editAccess(component.event as any);

      expect(stateService.go).toHaveBeenCalledWith('admin.eventAccess', { eventId: 1 });
    });

    it('should navigate to edit form', () => {
      const form = { id: 1, name: 'Form 1' };

      component.editForm(component.event as any, form);

      expect(stateService.go).toHaveBeenCalledWith('admin.formEdit', { eventId: 1, formId: 1 });
    });

    it('should navigate to member (user)', () => {
      const user = { id: '1', username: 'user1' } as any;

      component.gotoMember(user);

      expect(stateService.go).toHaveBeenCalledWith('admin.user', { userId: '1' });
    });

    it('should navigate to member (team)', () => {
      const team = { id: '1', name: 'Team 1' } as any;

      component.gotoMember(team);

      expect(stateService.go).toHaveBeenCalledWith('admin.team', { teamId: '1' });
    });

    it('should navigate to team', () => {
      const team = { id: '1', name: 'Team 1' } as any;

      component.gotoTeam(team);

      expect(stateService.go).toHaveBeenCalledWith('admin.team', { teamId: '1' });
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

    it('should handle forms reordered', () => {
      eventsService.updateEvent.and.returnValue(of(component.event as any));
      const reorderedForms = [
        { id: 2, name: 'Form 2', archived: false },
        { id: 1, name: 'Form 1', archived: false }
      ];

      component.onFormsReordered(reorderedForms);

      expect(eventsService.updateEvent).toHaveBeenCalled();
      expect(component.event!.forms![0].id).toBe(2);
      expect(component.event!.forms![1].id).toBe(1);
    });

    it('should not reorder forms when event has no forms', () => {
      component.event!.forms = undefined;

      component.onFormsReordered([]);

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
