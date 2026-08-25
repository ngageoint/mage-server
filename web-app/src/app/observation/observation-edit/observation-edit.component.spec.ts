import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of } from 'rxjs';

import { ObservationEditComponent } from './observation-edit.component';
import { AttachmentService } from '../attachment/attachment.service';
import { MapService } from 'src/app/map/map.service';
import { UserService } from 'src/app/user/user.service';
import { EventService } from 'src/app/event/event.service';
import { FilterService } from 'src/app/filter/filter.service';
import { ObservationService } from '../observation.service';
import { SessionService } from 'mage-web-app/http/session.service';
import { EventPreference } from 'core-lib-src/user';

function newObservation(eventId: number) {
  return {
    id: 'new',
    eventId,
    properties: { forms: [], timestamp: new Date() },
    geometry: null,
    noGeometry: false
  };
}

@Component({
  selector: 'host-component',
  template: `<observation-edit [observation]="observation"></observation-edit>`,
  standalone: false
})
class TestHostComponent {
  observation: any = newObservation(1);

  @ViewChild(ObservationEditComponent)
  component: ObservationEditComponent;
}

describe('ObservationEditComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let eventService: jasmine.SpyObj<EventService>;

  beforeEach(waitForAsync(() => {
    userService = jasmine.createSpyObj('UserService', ['getEventPreferences']);
    eventService = jasmine.createSpyObj('EventService', ['getEventById', 'getFormsForEvent']);
    eventService.getEventById.and.callFake((eventId: number) => ({ id: eventId }));
    eventService.getFormsForEvent.and.returnValue([]);
    userService.getEventPreferences.and.returnValue(of(null));

    TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, MatDialogModule],
      declarations: [ObservationEditComponent, TestHostComponent],
      providers: [
        { provide: AttachmentService, useValue: { upload$: new Subject() } },
        { provide: MapService, useValue: jasmine.createSpyObj('MapService', ['addFeaturesToLayer', 'updateFeatureForLayer', 'removeFeatureFromLayer']) },
        { provide: SessionService, useValue: { user: { id: 'user1', role: { permissions: [] } }, getToken: () => 'token' } },
        { provide: UserService, useValue: userService },
        { provide: FilterService, useValue: jasmine.createSpyObj('FilterService', ['getEvent']) },
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

    expect(hostComponent.component).toBeTruthy();
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
      expect(hostComponent.component.eventPreferences).toEqual(eventPreference);
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

      expect(hostComponent.component.eventPreferences).toEqual(secondEventPreference);
    });

    it('sets preferences to null if the request errors', () => {
      userService.getEventPreferences.and.returnValue(of(null));

      fixture.detectChanges();

      expect(hostComponent.component.eventPreferences).toBeNull();
    });
  });
});
