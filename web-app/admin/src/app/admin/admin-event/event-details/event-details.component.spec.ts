import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSelectChange } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { EventDetailsComponent } from './event-details.component';
import { AdminEventsService } from '../../services/admin-events.service';
import { AdminTeamsService } from '../../services/admin-teams-service';

describe('EventDetailsComponent', () => {
  let component: EventDetailsComponent;
  let fixture: ComponentFixture<EventDetailsComponent>;

  let eventsService: jasmine.SpyObj<AdminEventsService>;
  let teamsService: jasmine.SpyObj<AdminTeamsService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let router: jasmine.SpyObj<Router>;

  const USER_RANMA: any = {
    id: '1',
    username: 'ranma',
    displayName: 'Ranma Saotome'
  };
  const USER_LILY: any = {
    id: '2',
    username: 'lily',
    displayName: 'Lily Hoshikawa'
  };

  const makeEvent = (overrides: any = {}) =>
    ({
      id: 1,
      name: 'Test Event',
      description: 'Test Description',
      forms: [],
      ...overrides
    } as any);

  const makeTeamsPage = (items: any[] = []) =>
    ({
      items,
      totalCount: items.length,
      pageSize: 5,
      pageIndex: 0
    } as any);

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
    ]);

    const teamsServiceSpy = jasmine.createSpyObj('AdminTeamsService', [
      'addUserToTeam',
      'removeMember',
      'updateUserRole'
    ]);

    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const routerSpy = jasmine.createSpyObj('Router', [
      'navigate',
      'navigateByUrl'
    ]);

    const routeStub = {
      snapshot: {
        paramMap: convertToParamMap({ eventId: '1' })
      }
    };

    await TestBed.configureTestingModule({
      declarations: [EventDetailsComponent],
      imports: [NoopAnimationsModule],
      providers: [
        { provide: AdminEventsService, useValue: eventsServiceSpy },
        { provide: AdminTeamsService, useValue: teamsServiceSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeStub }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    eventsService = TestBed.inject(
      AdminEventsService
    ) as jasmine.SpyObj<AdminEventsService>;
    teamsService = TestBed.inject(
      AdminTeamsService
    ) as jasmine.SpyObj<AdminTeamsService>;
    dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    eventsService.getEventById.and.returnValue(of(makeEvent()));
    eventsService.getTeamsInEvent.and.returnValue(of(makeTeamsPage([])));
    eventsService.getMembers.and.returnValue(
      of({ items: [], totalCount: 0, pageSize: 5, pageIndex: 0 } as any)
    );
    eventsService.getNonMembers.and.returnValue(
      of({ items: [], totalCount: 0, pageSize: 5, pageIndex: 0 } as any)
    );
    eventsService.getTeamsNotInEvent.and.returnValue(
      of({ items: [], totalCount: 0, pageSize: 5, pageIndex: 0 } as any)
    );
    eventsService.getAllLayers.and.returnValue(of([]));
    eventsService.getLayersForEvent.and.returnValue(of([]));
    eventsService.addLayerToEvent.and.returnValue(of({} as any));
    eventsService.removeLayerFromEvent.and.returnValue(of({} as any));
    eventsService.addTeamToEvent.and.returnValue(of({} as any));
    eventsService.removeEventFromTeam.and.returnValue(of({} as any));
    eventsService.updateEvent.and.returnValue(of(makeEvent()));

    teamsService.addUserToTeam.and.returnValue(of({} as any));
    teamsService.removeMember.and.returnValue(of({} as any));
    teamsService.updateUserRole.and.returnValue(of({} as any));

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
    it('should load event data on init and build breadcrumbs', fakeAsync(() => {
      const event = makeEvent({ id: 1, name: 'Test Event', forms: [] });
      const eventTeam = { id: 'team-evt-1', teamEventId: 1, acl: {} };

      eventsService.getEventById.and.returnValue(of(event));
      eventsService.getTeamsInEvent.and.returnValue(
        of(makeTeamsPage([eventTeam]))
      );

      spyOn(component, 'getMembersPage');
      spyOn(component, 'getTeamsPage');
      spyOn(component, 'loadLayers');

      component.ngOnInit();
      tick();

      expect(eventsService.getEventById).toHaveBeenCalledWith('1');
      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith(
        '1',
        jasmine.objectContaining({ page: 0, page_size: 100 })
      );
      expect(component.event).toEqual(event as any);
      expect(component.eventTeam).toEqual(eventTeam as any);

      expect(component.getMembersPage).toHaveBeenCalled();
      expect(component.getTeamsPage).toHaveBeenCalled();
      expect(component.loadLayers).toHaveBeenCalled();

      expect(component.breadcrumbs.length).toBe(2);
      expect(component.breadcrumbs[1].title).toBe('Test Event');
    }));

    it('should navigate away if eventId is missing', () => {
      const route = TestBed.inject(ActivatedRoute) as any;
      route.snapshot.paramMap = convertToParamMap({});

      component.ngOnInit();

      expect(router.navigate).toHaveBeenCalled();
    });

    it('should set permissions on init', () => {
      component.ngOnInit();
      expect(component.hasReadPermission).toBe(true);
      expect(component.hasUpdatePermission).toBe(true);
      expect(component.hasDeletePermission).toBe(true);
    });

    it('should clean up on destroy', () => {
      const nextSpy = spyOn((component as any).destroy$, 'next');
      const completeSpy = spyOn((component as any).destroy$, 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Simple Getters', () => {
    it('should return non-archived forms', () => {
      component.event = makeEvent({
        forms: [
          { id: 1, archived: false } as any,
          { id: 2, archived: true } as any,
          { id: 3, archived: false } as any
        ]
      });

      const result = component.nonArchivedForms;

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    it('should return empty array when event has no forms', () => {
      component.event = makeEvent({ forms: undefined });
      expect(component.nonArchivedForms).toEqual([]);
    });

    it('should return empty array when event is null', () => {
      component.event = null;
      expect(component.nonArchivedForms).toEqual([]);
    });

    it('should filter forms based on showArchivedForms flag', () => {
      component.event = makeEvent({
        forms: [
          { id: 1, archived: false } as any,
          { id: 2, archived: true } as any
        ]
      });

      component.showArchivedForms = false;
      expect(component.filteredForms.length).toBe(1);

      component.showArchivedForms = true;
      expect(component.filteredForms.length).toBe(2);
    });
  });

  describe('Toggle Methods', () => {
    it('should toggle edit details mode', () => {
      component.event = makeEvent({
        name: 'Test Event',
        description: 'Test Description'
      });

      expect(component.editingDetails).toBe(false);

      component.toggleEditDetails();
      expect(component.editingDetails).toBe(true);
      expect(component.eventEditForm.name).toBe('Test Event');
      expect(component.eventEditForm.description).toBe('Test Description');

      component.toggleEditDetails();
      expect(component.editingDetails).toBe(false);
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

    it('should toggle edit members mode and clear pending changes when entering edit', () => {
      (component as any).pendingRoleChanges.set('1', 'OWNER');

      expect(component.editMembers).toBe(false);
      component.toggleEditMembers();
      expect(component.editMembers).toBe(true);
      expect((component as any).pendingRoleChanges.size).toBe(0);
    });

    it('should apply pending role changes when exiting edit', fakeAsync(() => {
      component.event = makeEvent({ id: 1 });
      component.eventTeam = { id: 'team-1', acl: {} } as any;
      component.editMembers = true;

      (component as any).pendingRoleChanges.set('1', 'MANAGER');
      (component as any).pendingRoleChanges.set('2', 'OWNER');

      teamsService.updateUserRole.and.returnValues(
        of({ id: 'team-1', acl: {} } as any),
        of({ id: 'team-1', acl: {} } as any)
      );

      spyOn(component, 'getMembersPage');

      component.toggleEditMembers();
      tick();

      expect(component.editMembers).toBe(false);
      expect(teamsService.updateUserRole).toHaveBeenCalledTimes(2);
      expect((component as any).pendingRoleChanges.size).toBe(0);
      expect(component.getMembersPage).toHaveBeenCalled();
    }));
  });

  describe('Form Preview', () => {
    it('should preview form', () => {
      const form = { id: 1, name: 'Test Form' };
      const evt = new MouseEvent('click');
      spyOn(evt, 'stopPropagation');

      component.preview(evt, form);

      expect(evt.stopPropagation).toHaveBeenCalled();
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
      expect(component.trackByFormId(0, form)).toBe(123);
    });

    it('should track forms by object when id is missing', () => {
      const form = { name: 'No ID' };
      expect(component.trackByFormId(0, form)).toBe(form);
    });
  });

  describe('Cancel Actions', () => {
    it('should cancel edit details', () => {
      component.event = makeEvent({
        name: 'Original Name',
        description: 'Original Description'
      });
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
        id: 'team-1',
        name: 'Test Team',
        acl: {
          '1': { role: 'OWNER' },
          '2': { role: 'MANAGER' }
        }
      } as any;
    });

    it('should get user role from ACL', () => {
      expect(component.getUserRole(USER_RANMA)).toBe('OWNER');
    });

    it('should return pending role when present', () => {
      (component as any).pendingRoleChanges.set('1', 'GUEST');
      expect(component.getUserRole(USER_RANMA)).toBe('GUEST');
    });

    it('should return GUEST when user not in ACL', () => {
      expect(component.getUserRole({ id: '999' } as any)).toBe('GUEST');
    });

    it('should return GUEST when no event team', () => {
      component.eventTeam = null;
      expect(component.getUserRole(USER_RANMA)).toBe('GUEST');
    });

    it('should generate role class', () => {
      expect(component.getRoleClass(USER_RANMA)).toBe(
        'user-role-badge role-owner'
      );
    });

    it('should update user role and keep data source refreshed', () => {
      component.membersDataSource.data = [USER_RANMA, USER_LILY];
      const roleEvent = { source: null, value: 'MANAGER' } as MatSelectChange;

      component.updateUserRole(USER_RANMA, roleEvent);

      expect((component as any).pendingRoleChanges.get('1')).toBe('MANAGER');
      expect(component.membersDataSource.data.length).toBe(2);
    });
  });

  describe('Search Methods', () => {
    beforeEach(() => {
      component.event = makeEvent({ id: 1 });
    });

    it('should search members and reset page', () => {
      component.membersPageIndex = 2;
      component.memberSearchTerm = 'test';

      spyOn(component, 'getMembersPage');

      component.searchMembers();

      expect(component.membersPageIndex).toBe(0);
      expect(component.getMembersPage).toHaveBeenCalled();
    });

    it('should search teams and reset page', () => {
      component.teamsPageIndex = 2;
      component.teamSearchTerm = 'test';

      spyOn(component, 'getTeamsPage');

      component.searchTeams();

      expect(component.teamsPageIndex).toBe(0);
      expect(component.getTeamsPage).toHaveBeenCalled();
    });

    it('should search layers and reset page', () => {
      component.layersPageIndex = 2;
      component.layerSearchTerm = 'layer';

      spyOn(component, 'filterAndPaginateLayers');

      component.searchLayers();

      expect(component.layersPageIndex).toBe(0);
      expect(component.filterAndPaginateLayers).toHaveBeenCalled();
    });
  });

  describe('Member Management', () => {
    beforeEach(() => {
      component.event = makeEvent({ id: 1 });
      component.eventTeam = {
        id: 'team-1',
        name: 'Event Team',
        acl: {}
      } as any;
    });

    it('should open dialog to add member to event', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.addMemberToEvent();

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.anything(),
        jasmine.objectContaining({
          panelClass: 'search-modal-dialog',
          data: jasmine.objectContaining({
            title: 'Add Members to Event',
            type: 'members'
          })
        })
      );
    });

    it('should add member when dialog returns selection', () => {
      const selectedUser = USER_LILY;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedUser }));
      dialog.open.and.returnValue(dialogRef);

      spyOn(component, 'getMembersPage');

      component.addMemberToEvent();

      expect(teamsService.addUserToTeam).toHaveBeenCalledWith(
        'team-1',
        selectedUser
      );
      expect(component.getMembersPage).toHaveBeenCalled();
    });

    it('should handle error when adding member fails', () => {
      const selectedUser = USER_LILY;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedUser }));
      dialog.open.and.returnValue(dialogRef);

      teamsService.addUserToTeam.and.returnValue(
        throwError(() => new Error('Add failed'))
      );
      spyOn(console, 'error');

      component.addMemberToEvent();

      expect(console.error).toHaveBeenCalledWith(
        'Error adding member:',
        jasmine.any(Error)
      );
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
      const evt = new MouseEvent('click');
      spyOn(evt, 'stopPropagation');

      component.removeMember(evt, USER_RANMA);

      expect(evt.stopPropagation).toHaveBeenCalled();
      expect(teamsService.removeMember).toHaveBeenCalledWith('team-1', '1');
    });

    it('should handle remove member error', () => {
      const evt = new MouseEvent('click');
      teamsService.removeMember.and.returnValue(
        throwError(() => new Error('Remove failed'))
      );
      spyOn(console, 'error');

      component.removeMember(evt, USER_RANMA);

      expect(console.error).toHaveBeenCalledWith(
        'Error removing member:',
        jasmine.any(Error)
      );
    });

    it('should not remove member without event team', () => {
      component.eventTeam = null;
      const evt = new MouseEvent('click');
      spyOn(console, 'error');

      component.removeMember(evt, USER_RANMA);

      expect(console.error).toHaveBeenCalledWith('Event team not found');
      expect(teamsService.removeMember).not.toHaveBeenCalled();
    });
  });

  describe('Team Management', () => {
    beforeEach(() => {
      component.event = makeEvent({ id: 1 });
    });

    it('should open dialog to add team to event', () => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.addTeamToEvent();

      expect(dialog.open).toHaveBeenCalledWith(
        jasmine.anything(),
        jasmine.objectContaining({
          panelClass: 'search-modal-dialog',
          data: jasmine.objectContaining({
            title: 'Add Teams to Event',
            type: 'teams'
          })
        })
      );
    });

    it('should add team when dialog returns selection', () => {
      const selectedTeam = { id: '2', name: 'New Team' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedTeam }));
      dialog.open.and.returnValue(dialogRef);

      spyOn(component, 'getTeamsPage');

      component.addTeamToEvent();

      expect(eventsService.addTeamToEvent).toHaveBeenCalledWith(
        '1',
        selectedTeam
      );
      expect(component.getTeamsPage).toHaveBeenCalled();
    });

    it('should handle error when adding team fails', () => {
      const selectedTeam = { id: '2', name: 'New Team' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ selectedItem: selectedTeam }));
      dialog.open.and.returnValue(dialogRef);

      eventsService.addTeamToEvent.and.returnValue(
        throwError(() => new Error('Add failed'))
      );
      spyOn(console, 'error');

      component.addTeamToEvent();

      expect(console.error).toHaveBeenCalledWith(
        'Error adding team:',
        jasmine.any(Error)
      );
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
      const evt = new MouseEvent('click');
      spyOn(evt, 'stopPropagation');

      component.removeTeam(evt, team);

      expect(evt.stopPropagation).toHaveBeenCalled();
      expect(eventsService.removeEventFromTeam).toHaveBeenCalledWith('1', '1');
    });

    it('should not remove team without event', () => {
      component.event = null;
      const team = { id: '1', name: 'Team 1' } as any;
      const evt = new MouseEvent('click');

      component.removeTeam(evt, team);

      expect(eventsService.removeEventFromTeam).not.toHaveBeenCalled();
    });

    it('should load teams page', fakeAsync(() => {
      component.event = makeEvent({ id: 1 });
      const mockTeams = [
        { id: '1', name: 'Team 1' } as any,
        { id: '2', name: 'Team 2' } as any
      ];

      eventsService.getTeamsInEvent.and.returnValue(
        of({
          items: mockTeams,
          totalCount: 2,
          pageSize: 5,
          pageIndex: 0
        } as any)
      );

      component.getTeamsPage();
      tick();

      expect(eventsService.getTeamsInEvent).toHaveBeenCalledWith('1', {
        page: 0,
        page_size: 5,
        term: '',
        total: true,
        omit_event_teams: true
      });
    }));
  });

  describe('Layer Management', () => {
    beforeEach(() => {
      component.event = makeEvent({ id: 1 });
    });

    it('should load layers successfully', fakeAsync(() => {
      const eventLayers = [{ id: 1, name: 'Layer 1' } as any];
      eventsService.getLayersForEvent.and.returnValue(of(eventLayers));

      component.loadLayers();
      tick();

      expect(eventsService.getLayersForEvent).toHaveBeenCalledWith('1');
      expect(component.eventLayers.length).toBe(1);
      expect(component.layersPage.totalCount).toBe(1);
    }));

    it('should not load layers without event', () => {
      component.event = null;
      component.loadLayers();
      expect(eventsService.getLayersForEvent).not.toHaveBeenCalled();
    });

    it('should add layer to event', () => {
      const layer = { id: 2, name: 'Layer 2' } as any;
      const evt = new MouseEvent('click');
      spyOn(evt, 'stopPropagation');

      component.addLayer(evt, layer);

      expect(evt.stopPropagation).toHaveBeenCalled();
      expect(eventsService.addLayerToEvent).toHaveBeenCalledWith('1', {
        id: 2
      });
    });

    it('should remove layer from event', () => {
      const layer = { id: 1, name: 'Layer 1' } as any;
      const evt = new MouseEvent('click');
      spyOn(evt, 'stopPropagation');

      component.removeLayer(evt, layer);

      expect(evt.stopPropagation).toHaveBeenCalled();
      expect(eventsService.removeLayerFromEvent).toHaveBeenCalledWith('1', 1);
    });

    it('should filter and paginate layers', () => {
      component.eventLayers = [
        { id: 1, name: 'Alpha' } as any,
        { id: 2, name: 'Beta' } as any,
        { id: 3, name: 'Gamma' } as any
      ];
      component.layerSearchTerm = 'a';
      component.layersPageIndex = 0;
      component.layersPageSize = 2;

      component.filterAndPaginateLayers();

      expect(component.layersPage.totalCount).toBe(3);
      expect(component.layersDataSource.data.length).toBe(2);
    });

    it('should open dialog to add layer to event and add selection', fakeAsync(() => {
      const selectedLayer = { id: 7, name: 'New Layer' } as any;
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(
        of({ selectedItem: selectedLayer })
      );
      dialog.open.and.returnValue(dialogRef);

      spyOn(component, 'loadLayers');

      component.addLayerToEvent();
      tick();

      expect(dialog.open).toHaveBeenCalled();
      expect(eventsService.addLayerToEvent).toHaveBeenCalledWith('1', {
        id: 7
      });
      expect(component.loadLayers).toHaveBeenCalled();
    }));

    it('should not open layer dialog when event not found', () => {
      component.event = null;
      component.addLayerToEvent();
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });

  describe('Form Restrictions', () => {
    beforeEach(() => {
      component.event = makeEvent({
        id: 1,
        minObservationForms: 0,
        maxObservationForms: 10,
        forms: [{ id: 1, min: 0, max: 5 }]
      });

      component.restrictionsForm = {
        form: { markAsPristine: jasmine.createSpy('markAsPristine') }
      } as any;
    });

    it('should save form restrictions and mark pristine', fakeAsync(() => {
      const updated = makeEvent({
        id: 1,
        minObservationForms: 1,
        maxObservationForms: 9,
        forms: [{ id: 1, min: 1, max: 4 }]
      });

      eventsService.updateEvent.and.returnValue(of(updated));

      component.saveFormRestrictions();
      tick();

      expect(eventsService.updateEvent).toHaveBeenCalledWith(
        '1',
        jasmine.objectContaining({
          minObservationForms: 0,
          maxObservationForms: 10
        })
      );

      expect(component.event!.minObservationForms).toBe(1);
      expect(component.event!.maxObservationForms).toBe(9);
      expect((component.event!.forms as any)[0].min).toBe(1);
      expect((component.event!.forms as any)[0].max).toBe(4);
      expect(
        (component.restrictionsForm as any).form.markAsPristine
      ).toHaveBeenCalled();
    }));

    it('should handle save restrictions error and set restrictionsError', fakeAsync(() => {
      const error = { error: { message: 'Validation error' } };
      eventsService.updateEvent.and.returnValue(throwError(() => error));
      spyOn(console, 'error');

      component.saveFormRestrictions();
      tick();

      expect(console.error).toHaveBeenCalledWith(
        'Error saving form restrictions:',
        jasmine.anything()
      );
      expect(component.restrictionsError).toEqual({
        message: 'Validation error'
      });
    }));

    it('should not save without event', () => {
      component.event = null;
      component.saveFormRestrictions();
      expect(eventsService.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('Event Details Editing', () => {
    beforeEach(() => {
      component.event = makeEvent({
        id: 1,
        name: 'Test Event',
        description: 'Test Description'
      });
    });

    it('should save event details', fakeAsync(() => {
      const updatedEvent = makeEvent({
        id: 1,
        name: 'Updated',
        description: 'Test Description'
      });
      eventsService.updateEvent.and.returnValue(of(updatedEvent));

      component.editingDetails = true;
      component.eventEditForm.name = 'Updated';
      component.eventEditForm.description = 'Test Description';

      component.saveEventDetails();
      tick();

      expect(eventsService.updateEvent).toHaveBeenCalledWith(
        '1',
        jasmine.objectContaining({ name: 'Updated' })
      );
      expect(component.editingDetails).toBe(false);
      expect(component.event!.name).toBe('Updated');
    }));

    it('should handle save error', fakeAsync(() => {
      eventsService.updateEvent.and.returnValue(
        throwError(() => new Error('Save failed'))
      );
      spyOn(console, 'error');

      component.saveEventDetails();
      tick();

      expect(console.error).toHaveBeenCalledWith(
        'Error updating event:',
        jasmine.any(Error)
      );
    }));

    it('should not save without event', () => {
      component.event = null;
      component.saveEventDetails();
      expect(eventsService.updateEvent).not.toHaveBeenCalled();
    });
  });

  describe('Event Actions', () => {
    beforeEach(() => {
      component.event = makeEvent({ id: 1, name: 'Test Event' });
    });

    it('should complete event', fakeAsync(() => {
      const completedEvent = makeEvent({ id: 1, complete: true });
      eventsService.updateEvent.and.returnValue(of(completedEvent));

      component.completeEvent(component.event as any);
      tick();

      expect(eventsService.updateEvent).toHaveBeenCalledWith(
        '1',
        jasmine.objectContaining({ complete: true })
      );
    }));

    it('should activate event', fakeAsync(() => {
      const activeEvent = makeEvent({ id: 1, complete: false });
      eventsService.updateEvent.and.returnValue(of(activeEvent));

      component.activateEvent(component.event as any);
      tick();

      expect(eventsService.updateEvent).toHaveBeenCalledWith(
        '1',
        jasmine.objectContaining({ complete: false })
      );
    }));

    it('should delete event and navigate when confirmed', fakeAsync(() => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(true));
      dialog.open.and.returnValue(dialogRef);

      component.deleteEvent();
      tick();

      expect(dialog.open).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalled();
    }));

    it('should not navigate when delete dialog returns falsy', fakeAsync(() => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(false));
      dialog.open.and.returnValue(dialogRef);

      component.deleteEvent();
      tick();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    }));

    it('should not delete without event', () => {
      component.event = null;
      component.deleteEvent();
      expect(dialog.open).not.toHaveBeenCalled();
    });
  });

  describe('Page Change Handlers', () => {
    beforeEach(() => {
      component.event = makeEvent({ id: 1 });
      spyOn(component, 'getMembersPage');
      spyOn(component, 'getTeamsPage');
      spyOn(component, 'filterAndPaginateLayers');
    });

    it('should handle member search change', () => {
      component.onMemberSearchChange('search');

      expect(component.memberSearchTerm).toBe('search');
      expect(component.membersPageIndex).toBe(0);
      expect(component.getMembersPage).toHaveBeenCalled();
    });

    it('should handle members page change', () => {
      component.onMembersPageChange({
        pageIndex: 1,
        pageSize: 10,
        length: 50
      } as any);

      expect(component.membersPageIndex).toBe(1);
      expect(component.membersPageSize).toBe(10);
      expect(component.getMembersPage).toHaveBeenCalled();
    });

    it('should handle team search change', () => {
      component.onTeamSearchChange('team');

      expect(component.teamSearchTerm).toBe('team');
      expect(component.teamsPageIndex).toBe(0);
      expect(component.getTeamsPage).toHaveBeenCalled();
    });

    it('should handle teams page change', () => {
      component.onTeamsPageChange({
        pageIndex: 2,
        pageSize: 5,
        length: 25
      } as any);

      expect(component.teamsPageIndex).toBe(2);
      expect(component.teamsPageSize).toBe(5);
      expect(component.getTeamsPage).toHaveBeenCalled();
    });

    it('should handle layer search change', () => {
      component.onLayerSearchChange('layer');

      expect(component.layerSearchTerm).toBe('layer');
      expect(component.layersPageIndex).toBe(0);
      expect(component.filterAndPaginateLayers).toHaveBeenCalled();
    });

    it('should handle layers page change', () => {
      component.onLayersPageChange({
        pageIndex: 2,
        pageSize: 25,
        length: 100
      } as any);

      expect(component.layersPageIndex).toBe(2);
      expect(component.layersPageSize).toBe(25);
      expect(component.filterAndPaginateLayers).toHaveBeenCalled();
    });
  });

  describe('Form Operations', () => {
    beforeEach(() => {
      component.event = makeEvent({
        id: 1,
        forms: [
          { id: 1, name: 'Form 1', archived: false },
          { id: 2, name: 'Form 2', archived: false }
        ]
      });
    });

    it('should create form dialog and navigate on close when form has id', fakeAsync(() => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of({ id: 99 }));
      dialog.open.and.returnValue(dialogRef);

      component.createForm();
      tick();

      expect(dialog.open).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(
        ['../../events', 1, 'forms', 99],
        jasmine.any(Object)
      );
    }));

    it('should not navigate when form dialog closes without id', fakeAsync(() => {
      const dialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRef.afterClosed.and.returnValue(of(null));
      dialog.open.and.returnValue(dialogRef);

      component.createForm();
      tick();

      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('should handle forms reordered and call updateEvent', fakeAsync(() => {
      const reorderedForms = [
        { id: 2, name: 'Form 2', archived: false },
        { id: 1, name: 'Form 1', archived: false }
      ];

      eventsService.updateEvent.and.returnValue(
        of(makeEvent({ id: 1, forms: reorderedForms }))
      );

      component.onFormsReordered(reorderedForms as any);
      tick();

      expect(eventsService.updateEvent).toHaveBeenCalledWith(
        '1',
        jasmine.objectContaining({ forms: reorderedForms })
      );
      expect(component.event!.forms![0].id).toBe(2);
      expect(component.event!.forms![1].id).toBe(1);
    }));

    it('should not reorder forms when event has no forms', () => {
      (component.event as any).forms = undefined;

      component.onFormsReordered([]);

      expect(eventsService.updateEvent).not.toHaveBeenCalled();
    });
  });
});
