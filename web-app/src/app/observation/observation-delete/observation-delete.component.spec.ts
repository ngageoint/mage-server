import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ObservationDeleteComponent } from './observation-delete.component';
import { EventService } from '../../event/event.service';

describe('ObservationDeleteComponent', () => {
  let component: ObservationDeleteComponent;
  let fixture: ComponentFixture<ObservationDeleteComponent>;
  let eventService: jasmine.SpyObj<EventService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ObservationDeleteComponent>>;

  const mageEvent: any = { id: 1, name: 'Test Event', forms: [] };
  const observation: any = { id: 'obs1', eventId: 1 };

  beforeEach(waitForAsync(() => {
    eventService = jasmine.createSpyObj('EventService', ['getEventById', 'archiveObservation']);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    eventService.getEventById.and.returnValue(mageEvent);

    TestBed.configureTestingModule({
      declarations: [ObservationDeleteComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: EventService, useValue: eventService },
        { provide: MAT_DIALOG_DATA, useValue: observation }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('looks up the event the observation belongs to', () => {
    expect(eventService.getEventById).toHaveBeenCalledWith(observation.eventId);
    expect(component.event).toEqual(mageEvent);
  });

  it('closes the dialog with "cancel" when closed without deleting', () => {
    component.close();
    expect(dialogRef.close).toHaveBeenCalledWith('cancel');
  });

  it('archives the observation and closes with "delete" on success', () => {
    eventService.archiveObservation.and.returnValue(of(observation));

    component.delete();

    expect(eventService.archiveObservation).toHaveBeenCalledWith(observation);
    expect(dialogRef.close).toHaveBeenCalledWith('delete');
  });
});
