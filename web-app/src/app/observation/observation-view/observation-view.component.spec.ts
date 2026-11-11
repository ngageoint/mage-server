import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ObservationViewComponent } from './observation-view.component';
import { ObservationOption } from './observation-options.component';
import { SidebarService } from '../../sidebar/sidebar.service';
import { MapService } from '../../map/map.service';
import { EventService } from '../../event/event.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { Observation } from '../../entities/observation/entities.observation';

function existingObservation(): Observation {
  return {
    id: 'obs1',
    eventId: 1,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [10, 20] },
    url: '/api/events/1/observations/obs1',
    userId: 'user2',
    attachments: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastModified: '2026-01-02T00:00:00Z',
    style: { iconUrl: '/icon.png' },
    favoriteUserIds: ['user3'],
    important: { description: 'important' },
    properties: {
      timestamp: new Date('2026-01-01T00:00:00Z'),
      forms: [
        { id: 'entry1', formId: 1, name: 'first' },
        { id: 'entry2', formId: 2, tags: ['a', 'b'] }
      ]
    }
  } as Observation
}

describe('ObservationViewComponent', () => {
  let fixture: ComponentFixture<ObservationViewComponent>;
  let component: ObservationViewComponent;
  let sidebarService: jasmine.SpyObj<SidebarService>;
  let bottomSheet: jasmine.SpyObj<MatBottomSheet>;
  let eventService: jasmine.SpyObj<EventService>;
  let permissions: string[];

  beforeEach(async () => {
    sidebarService = jasmine.createSpyObj('SidebarService', ['edit']);
    bottomSheet = jasmine.createSpyObj('MatBottomSheet', ['open']);
    eventService = jasmine.createSpyObj('EventService', ['getFormsForEvent', 'createForm', 'isUserInEvent']);
    permissions = [];

    await TestBed.configureTestingModule({
      imports: [ObservationViewComponent],
      providers: [
        { provide: SidebarService, useValue: sidebarService },
        { provide: MatBottomSheet, useValue: bottomSheet },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: MapService, useValue: jasmine.createSpyObj('MapService', ['zoomToFeatureInLayer']) },
        { provide: EventService, useValue: eventService },
        { provide: SessionService, useValue: { user: { id: 'user1', role: { permissions: [] } }, hasPermission: (permission: string) => permissions.includes(permission) } }
      ]
    })
      .overrideComponent(ObservationViewComponent, {
        set: { template: '', imports: [] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ObservationViewComponent);
    component = fixture.componentInstance;
  });

  describe('important editor', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('event', { id: 1, acl: {} });
      fixture.componentRef.setInput('observation', existingObservation());
      fixture.detectChanges();
    });

    it('opens when flagging as important', () => {
      component.onFlagAsImportant();

      expect(component.importantEditorOpen()).toBeTrue();
    });

    it('closes when a different observation is shown', () => {
      component.onFlagAsImportant();

      fixture.componentRef.setInput('observation', { ...existingObservation(), id: 'obs2' });

      expect(component.importantEditorOpen()).toBeFalse();
    });
  });

  describe('observation options', () => {

    function show(observation: Partial<Observation>, acl: Record<string, any> = {}): void {
      fixture.componentRef.setInput('event', { id: 1, acl });
      fixture.componentRef.setInput('observation', { ...existingObservation(), ...observation });
      fixture.detectChanges();
    }

    it('can clone with the create permission when the user is in the event', () => {
      permissions = ['CREATE_OBSERVATION'];
      eventService.isUserInEvent.and.returnValue(true);
      show({});

      expect(component.canClone()).toBeTrue();
    });

    it('cannot clone without the create permission', () => {
      eventService.isUserInEvent.and.returnValue(true);
      show({});

      expect(component.canClone()).toBeFalse();
    });

    it('cannot clone when the user is not in the event', () => {
      permissions = ['CREATE_OBSERVATION', 'UPDATE_OBSERVATION_ALL'];
      eventService.isUserInEvent.and.returnValue(false);
      show({});

      expect(component.canClone()).toBeFalse();
    });

    it('can delete with the update event permission', () => {
      permissions = ['UPDATE_EVENT'];
      show({});

      expect(component.canDelete()).toBeTrue();
    });

    it('can delete their own observation', () => {
      show({ userId: 'user1' });

      expect(component.canDelete()).toBeTrue();
    });

    it('can delete with update access to the event', () => {
      show({}, { user1: { permissions: ['update'] } });

      expect(component.canDelete()).toBeTrue();
    });

    it('cannot delete without any of those', () => {
      permissions = ['DELETE_OBSERVATION', 'UPDATE_OBSERVATION_ALL'];
      show({}, { user1: { permissions: ['read'] } });

      expect(component.canDelete()).toBeFalse();
    });

    it('tells the options sheet which options are allowed', () => {
      permissions = ['CREATE_OBSERVATION'];
      eventService.isUserInEvent.and.returnValue(true);
      bottomSheet.open.and.returnValue({ afterDismissed: () => of(undefined) } as any);
      show({});

      component.onOptions();

      expect(bottomSheet.open.calls.mostRecent().args[1]?.data).toEqual({ canClone: true, canDelete: false });
    });
  });

  describe('cloning an observation', () => {

    let observation: Observation;

    beforeEach(() => {
      observation = existingObservation();
      eventService.getFormsForEvent.and.returnValue([{ id: 1 }, { id: 2 }] as any);
      fixture.componentRef.setInput('event', { id: 1, acl: {} });
      fixture.componentRef.setInput('observation', observation);
      fixture.detectChanges();
    });

    it('does not copy form entries for archived forms', () => {
      eventService.getFormsForEvent.and.callFake((_event: any, options: any): any =>
        options?.archived === false ? [{ id: 1 }] : [{ id: 1 }, { id: 2 }]
      );

      component.cloneObservation();

      expect(editedClone().properties.forms).toEqual([{ id: null, formId: 1, name: 'first' }]);
    });

    function editedClone(): any {
      expect(sidebarService.edit).toHaveBeenCalledTimes(1);
      return sidebarService.edit.calls.mostRecent().args[0];
    }

    it('opens the clone for editing when the clone option is chosen', () => {
      bottomSheet.open.and.returnValue({ afterDismissed: () => of(ObservationOption.CLONE) } as any);

      component.onOptions();

      expect(editedClone().id).toEqual('new');
    });

    it('copies the event, type and geometry of the observation', () => {
      component.cloneObservation();

      const clone = editedClone();
      expect(clone.eventId).toEqual(1);
      expect(clone.type).toEqual('Feature');
      expect(clone.geometry).toEqual({ type: 'Point', coordinates: [10, 20] });
    });

    it('copies the form entries without their ids', () => {
      component.cloneObservation();

      expect(editedClone().properties.forms).toEqual([
        { id: null, formId: 1, name: 'first' },
        { id: null, formId: 2, tags: ['a', 'b'] }
      ]);
    });

    it('gives the clone a new timestamp', () => {
      const before = Date.now();

      component.cloneObservation();

      expect(editedClone().properties.timestamp.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('does not copy the server managed or user specific properties', () => {
      component.cloneObservation();

      const clone = editedClone();
      expect(clone.url).toBeUndefined();
      expect(clone.userId).toBeUndefined();
      expect(clone.attachments).toBeUndefined();
      expect(clone.createdAt).toBeUndefined();
      expect(clone.lastModified).toBeUndefined();
      expect(clone.favoriteUserIds).toBeUndefined();
      expect(clone.important).toBeUndefined();
    });

    it('does not change the original observation when the clone changes', () => {
      component.cloneObservation();

      const clone = editedClone();
      clone.properties.forms[0].name = 'changed';
      clone.properties.forms[1].tags.push('c');
      (clone.geometry.coordinates as number[])[0] = 99;

      expect(observation.properties.forms[0].id).toEqual('entry1');
      expect(observation.properties.forms[0].name).toEqual('first');
      expect(observation.properties.forms[1].tags).toEqual(['a', 'b']);
      expect((observation.geometry as GeoJSON.Point).coordinates).toEqual([10, 20]);
    });
  });
});
