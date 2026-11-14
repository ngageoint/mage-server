import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';

import { ObservationEditComponent } from './observation-edit.component';
import { AttachmentService, AttachmentUploadEvent, AttachmentUploadStatus } from '../attachment/attachment.service';
import { MapService } from 'src/app/map/map.service';
import { UserService } from 'src/app/user/user.service';
import { EventService } from 'src/app/event/event.service';
import { ObservationService } from '../observation.service';
import { EventPreference } from 'core-lib-src/user';

function newObservation(eventId: number) {
  return {
    id: 'new',
    eventId,
    properties: { forms: [], timestamp: new Date() },
    geometry: null
  };
}

@Component({
  selector: 'host-component',
  template: `<observation-edit [observation]="observation"></observation-edit>`,
  imports: [ObservationEditComponent]
})
class TestHostComponent {
  observation: any = newObservation(1);

  component = viewChild.required(ObservationEditComponent);
}

describe('ObservationEditComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let eventService: jasmine.SpyObj<EventService>;

  beforeEach(waitForAsync(() => {
    userService = jasmine.createSpyObj('UserService', ['getEventPreferences']);
    eventService = jasmine.createSpyObj('EventService', ['getEventById', 'getFormsForEvent', 'saveObservation', 'addAttachmentToObservation']);
    eventService.getEventById.and.callFake((eventId: number): any => ({ id: eventId }));
    eventService.getFormsForEvent.and.returnValue([]);
    userService.getEventPreferences.and.returnValue(of(null));

    TestBed.configureTestingModule({
      imports: [MatDialogModule, TestHostComponent],
      providers: [
        { provide: AttachmentService, useValue: { upload$: new Subject() } },
        { provide: MapService, useValue: jasmine.createSpyObj('MapService', ['addFeaturesToLayer', 'updateFeatureForLayer', 'removeFeatureFromLayer']) },
        { provide: UserService, useValue: userService },
        { provide: EventService, useValue: eventService },
        { provide: ObservationService, useValue: jasmine.createSpyObj('ObservationService', ['getObservationStyleForForm']) }
      ]
    })
      // Override the real template, which pulls in the entire tree of form field
      // components, so this suite can exercise the component class in isolation.
      .overrideComponent(ObservationEditComponent, {
        set: { template: '<div #editContent><div #form></div></div>' }
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();

    expect(hostComponent.component()).toBeTruthy();
  });

  describe('loading event preferences', () => {

    it('loads preferences for the event on the very first change detection cycle', () => {
      const eventPreference: EventPreference = { forms: { 1: { fields: { field1: { recentChoices: ['blue'] } } } } };
      userService.getEventPreferences.and.returnValue(of(eventPreference));

      // A single detectChanges() call drives ngOnChanges then ngOnInit, in that
      // real Angular order, exactly like production. This is the regression test
      // for the bug where the preferences subscription lived in ngOnInit while the
      // trigger fired from ngOnChanges, silently dropping the very first load.
      fixture.detectChanges();

      expect(userService.getEventPreferences).toHaveBeenCalledOnceWith(1);
      expect(hostComponent.component().eventPreferences()).toEqual(eventPreference);
    });

    it('does not refetch preferences when the event has not changed', () => {
      fixture.detectChanges();

      hostComponent.observation = newObservation(1);
      fixture.detectChanges();

      expect(userService.getEventPreferences).toHaveBeenCalledTimes(1);
    });

    it('refetches preferences when the event changes', () => {
      fixture.detectChanges();

      hostComponent.observation = newObservation(2);
      fixture.detectChanges();

      expect(userService.getEventPreferences).toHaveBeenCalledTimes(2);
      expect(userService.getEventPreferences).toHaveBeenCalledWith(2);
    });

    it('ignores a stale, slower-resolving response from a previous event when the event changes again', () => {
      const firstEventResponse = new Subject<EventPreference | null>();
      const secondEventPreference: EventPreference = { forms: { 2: { fields: { field1: { recentChoices: ['green'] } } } } };

      userService.getEventPreferences.and.callFake((eventId: number) => {
        return eventId === 1 ? firstEventResponse.asObservable() : of(secondEventPreference);
      });

      fixture.detectChanges();
      expect(userService.getEventPreferences).toHaveBeenCalledWith(1);

      hostComponent.observation = newObservation(2);
      fixture.detectChanges();
      expect(userService.getEventPreferences).toHaveBeenCalledWith(2);

      // The first event's request resolves after the second event's request already
      // completed. switchMap should have unsubscribed from it, so it must not
      // clobber the second event's preferences.
      firstEventResponse.next({ forms: { 1: { fields: {} } } });

      expect(hostComponent.component().eventPreferences()).toEqual(secondEventPreference);
    });

    it('sets preferences to null if the request errors', () => {
      userService.getEventPreferences.and.returnValue(of(null));

      fixture.detectChanges();

      expect(hostComponent.component().eventPreferences()).toBeNull();
    });
  });

  describe('new observation', () => {

    const formDefinition = {
      id: 1,
      name: 'Form 1',
      fields: [
        { id: 1, name: 'name', type: 'textfield', title: 'Name', value: 'default name' },
        { id: 2, name: 'notes', type: 'textarea', title: 'Notes', value: 'default notes' }
      ]
    };

    function unsavedObservation(forms: any[]) {
      return {
        id: 'new',
        eventId: 1,
        type: 'Feature',
        properties: { forms, timestamp: new Date() },
        geometry: { type: 'Point', coordinates: [10, 20] }
      };
    }

    function formValues(): any[] {
      return hostComponent.component().formGroup().getRawValue().properties.forms;
    }

    let mapService: jasmine.SpyObj<MapService>;

    beforeEach(() => {
      eventService.getFormsForEvent.and.returnValue([formDefinition] as any);
      mapService = TestBed.inject(MapService) as jasmine.SpyObj<MapService>;
    });

    it('uses the form defaults for fields without a value', () => {
      hostComponent.observation = unsavedObservation([{ formId: 1 }]);
      fixture.detectChanges();

      expect(formValues()).toEqual([{ id: null, formId: 1, name: 'default name', notes: 'default notes' }]);
    });

    it('keeps the values the form entries already have, such as a clone', () => {
      hostComponent.observation = unsavedObservation([{ id: null, formId: 1, name: 'copied' }]);
      fixture.detectChanges();

      expect(formValues()).toEqual([{ id: null, formId: 1, name: 'copied', notes: 'default notes' }]);
    });

    it('does not use the form defaults for a saved observation', () => {
      hostComponent.observation = { ...unsavedObservation([{ id: 'entry1', formId: 1, name: 'saved' }]), id: 'obs1' };
      fixture.detectChanges();

      expect(formValues()).toEqual([{ id: 'entry1', formId: 1, name: 'saved', notes: null }]);
    });

    it('asks for a form when it has no forms', () => {
      const pickForm = spyOn(ObservationEditComponent.prototype, 'pickForm');
      hostComponent.observation = unsavedObservation([]);
      fixture.detectChanges();

      expect(pickForm).toHaveBeenCalledTimes(1);
    });

    it('does not ask for a form when it already has forms', () => {
      const pickForm = spyOn(ObservationEditComponent.prototype, 'pickForm');
      hostComponent.observation = unsavedObservation([{ id: null, formId: 1, name: 'copied' }]);
      fixture.detectChanges();

      expect(pickForm).not.toHaveBeenCalled();
    });

    it('is added to the map while editing', () => {
      const observation = unsavedObservation([{ formId: 1 }]);
      hostComponent.observation = observation;
      fixture.detectChanges();

      expect(mapService.addFeaturesToLayer).toHaveBeenCalledWith([observation as any], 'observations');
    });

    it('is saved without an id and removed from the map', () => {
      eventService.saveObservation.and.returnValue(of({ id: 'saved', attachments: [] } as any));
      hostComponent.observation = unsavedObservation([{ formId: 1 }]);
      fixture.detectChanges();

      hostComponent.component().save();

      const saved = eventService.saveObservation.calls.mostRecent().args[0];
      expect('id' in saved).toBeFalse();
      expect(mapService.removeFeatureFromLayer).toHaveBeenCalledWith({ id: 'new' }, 'observations');
    });

    it('keeps the new id when the save fails', () => {
      eventService.saveObservation.and.returnValue(throwError(() => ({ error: { message: 'invalid' } })));
      hostComponent.observation = unsavedObservation([{ formId: 1 }]);
      fixture.detectChanges();

      hostComponent.component().save();

      expect(hostComponent.component().currentObservation().id).toEqual('new');
      expect(hostComponent.component().error()).toEqual({ message: 'invalid' });
    });

    function closeDiscardDialogWith(result: string | undefined): void {
      const dialog = TestBed.inject(MatDialog);
      spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(result) } as any);
    }

    it('is removed from the map when the changes are discarded', () => {
      closeDiscardDialogWith('discard');
      const observation = unsavedObservation([{ formId: 1 }]);
      hostComponent.observation = observation;
      fixture.detectChanges();

      hostComponent.component().cancel();

      expect(mapService.removeFeatureFromLayer).toHaveBeenCalledWith(observation as any, 'observations');
      expect(mapService.updateFeatureForLayer).not.toHaveBeenCalledWith(observation as any, 'observations');
    });

    it('stays on the map and open when the user keeps editing', () => {
      closeDiscardDialogWith(undefined);
      const close = jasmine.createSpy('close');
      hostComponent.observation = unsavedObservation([{ formId: 1 }]);
      fixture.detectChanges();
      hostComponent.component().closed.subscribe(close);

      hostComponent.component().cancel();

      expect(mapService.removeFeatureFromLayer).not.toHaveBeenCalled();
      expect(close).not.toHaveBeenCalled();
    });

    it('keeps an edited location on the map when the user keeps editing a saved observation', () => {
      closeDiscardDialogWith(undefined);
      hostComponent.observation = { ...unsavedObservation([{ id: 'entry1', formId: 1 }]), id: 'obs1' };
      fixture.detectChanges();
      mapService.updateFeatureForLayer.calls.reset();

      hostComponent.component().cancel();

      expect(mapService.updateFeatureForLayer).not.toHaveBeenCalled();
    });

    it('puts a saved observation back at its original location when the changes are discarded', () => {
      closeDiscardDialogWith('discard');
      const observation = { ...unsavedObservation([{ id: 'entry1', formId: 1 }]), id: 'obs1' };
      hostComponent.observation = observation;
      fixture.detectChanges();
      hostComponent.component().currentObservation().geometry = { type: 'Point', coordinates: [30, 40] };
      mapService.updateFeatureForLayer.calls.reset();

      hostComponent.component().cancel();

      expect(mapService.updateFeatureForLayer).toHaveBeenCalledTimes(1);
      expect(mapService.updateFeatureForLayer.calls.mostRecent().args[0].geometry).toEqual({ type: 'Point', coordinates: [10, 20] });
    });

    it('is removed from the map when the editor is closed without cancelling', () => {
      hostComponent.observation = unsavedObservation([{ formId: 1 }]);
      fixture.detectChanges();

      fixture.destroy();

      expect(mapService.removeFeatureFromLayer).toHaveBeenCalledWith({ id: 'new' }, 'observations');
    });

    it('leaves a saved observation on the map when the editor is closed', () => {
      hostComponent.observation = { ...unsavedObservation([{ id: 'entry1', formId: 1 }]), id: 'obs1' };
      fixture.detectChanges();

      fixture.destroy();

      expect(mapService.removeFeatureFromLayer).not.toHaveBeenCalled();
    });
  });

  describe('attachment uploads', () => {
    let upload$: Subject<AttachmentUploadEvent>;

    function completeUpload(): void {
      upload$.next({ status: AttachmentUploadStatus.COMPLETE, upload: { attachmentId: 'a1' } as any, response: { id: 'a1' } });
    }

    beforeEach(() => {
      upload$ = (TestBed.inject(AttachmentService) as any).upload$;
      fixture.detectChanges();
    });

    it('adds a finished upload to the observation while the editor is open', () => {
      completeUpload();

      expect(eventService.addAttachmentToObservation).toHaveBeenCalledTimes(1);
    });

    it('stops listening for uploads once the editor is closed', () => {
      fixture.destroy();

      completeUpload();

      expect(eventService.addAttachmentToObservation).not.toHaveBeenCalled();
    });
  });
});
