import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { TakPushStatusComponent } from './tak-push-status.component';
import { TakPushStatus, TakPushStatusService, MageEventSummary } from '../tak-push-status.service';

const EVENTS: MageEventSummary[] = [
  { id: 2, name: 'Zeta Exercise' },
  { id: 1, name: 'Alpha Exercise' }
];

const STATUS: TakPushStatus = {
  enabled: true,
  locationSharingEnabled: false,
  connectionConfigured: true,
  pushedCount: 3,
  lastSyncedAt: '2026-01-01T00:00:00.000Z',
  recentlySynced: []
};

describe('TakPushStatusComponent', () => {
  let component: TakPushStatusComponent;
  let fixture: ComponentFixture<TakPushStatusComponent>;
  let service: jasmine.SpyObj<TakPushStatusService>;

  beforeEach(waitForAsync(() => {
    service = jasmine.createSpyObj('TakPushStatusService', ['getEvents', 'getStatus', 'setEnabled', 'setLocationSharingEnabled']);
    service.getEvents.and.returnValue(of(EVENTS));
    service.getStatus.and.returnValue(of(STATUS));

    // This component's template leans on Angular Material (mat-select,
    // mat-slide-toggle, etc.), which pulls in animations/CVA wiring that's
    // irrelevant to the component's own logic under test here. Swap in a
    // trivial template so these tests exercise TakPushStatusComponent's
    // behavior, not Material's rendering.
    TestBed.overrideComponent(TakPushStatusComponent, { set: { template: '<div></div>' } });
    TestBed.configureTestingModule({
      declarations: [TakPushStatusComponent],
      providers: [{ provide: TakPushStatusService, useValue: service }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TakPushStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads and sorts events by name on init', () => {
    fixture.detectChanges();
    expect(component.events.map(e => e.name)).toEqual(['Alpha Exercise', 'Zeta Exercise']);
  });

  it('does nothing until an event is selected', () => {
    fixture.detectChanges();
    expect(service.getStatus).not.toHaveBeenCalled();
    expect(component.status).toBeNull();
  });

  it('loads status when an event is selected', () => {
    fixture.detectChanges();
    component.selectedEventId = 1;

    component.onEventChange();

    expect(service.getStatus).toHaveBeenCalledWith(1);
    expect(component.status).toEqual(STATUS);
    expect(component.isLoading).toBe(false);
  });

  it('refresh reloads status for the selected event', () => {
    fixture.detectChanges();
    component.selectedEventId = 1;
    component.onEventChange();
    service.getStatus.calls.reset();

    component.refresh();

    expect(service.getStatus).toHaveBeenCalledWith(1);
  });

  it('clears status and stops loading when the status request fails', () => {
    service.getStatus.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    component.selectedEventId = 1;

    component.onEventChange();

    expect(component.status).toBeNull();
    expect(component.isLoading).toBe(false);
  });

  it('ignores a toggle when no event is selected', () => {
    fixture.detectChanges();

    component.onToggle(true);

    expect(service.setEnabled).not.toHaveBeenCalled();
  });

  it('saves a toggle change and applies the returned status', () => {
    const toggledStatus = { ...STATUS, enabled: false };
    service.setEnabled.and.returnValue(of(toggledStatus));
    fixture.detectChanges();
    component.selectedEventId = 1;
    component.onEventChange();

    component.onToggle(false);

    expect(service.setEnabled).toHaveBeenCalledWith(1, false);
    expect(component.status).toEqual(toggledStatus);
    expect(component.isSaving).toBe(false);
  });

  it('re-fetches the real status if saving a toggle change fails', () => {
    service.setEnabled.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    component.selectedEventId = 1;
    component.onEventChange();
    service.getStatus.calls.reset();

    component.onToggle(false);

    expect(component.isSaving).toBe(false);
    expect(service.getStatus).toHaveBeenCalledWith(1);
  });

  it('ignores a location toggle when no event is selected', () => {
    fixture.detectChanges();

    component.onLocationToggle(true);

    expect(service.setLocationSharingEnabled).not.toHaveBeenCalled();
  });

  it('saves a location toggle change and applies the returned status', () => {
    const toggledStatus = { ...STATUS, locationSharingEnabled: true };
    service.setLocationSharingEnabled.and.returnValue(of(toggledStatus));
    fixture.detectChanges();
    component.selectedEventId = 1;
    component.onEventChange();

    component.onLocationToggle(true);

    expect(service.setLocationSharingEnabled).toHaveBeenCalledWith(1, true);
    expect(component.status).toEqual(toggledStatus);
    expect(component.isSaving).toBe(false);
  });

  it('re-fetches the real status if saving a location toggle change fails', () => {
    service.setLocationSharingEnabled.and.returnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    component.selectedEventId = 1;
    component.onEventChange();
    service.getStatus.calls.reset();

    component.onLocationToggle(true);

    expect(component.isSaving).toBe(false);
    expect(service.getStatus).toHaveBeenCalledWith(1);
  });
});
