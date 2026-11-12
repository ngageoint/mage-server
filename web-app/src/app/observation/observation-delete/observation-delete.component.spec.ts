import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ObservationDeleteComponent } from './observation-delete.component';
import { EventService } from '../../event/event.service';
import { MapService } from '../../map/map.service';
import { SessionService } from '../../http/session.service';
import { SidebarService } from '../../sidebar/sidebar.service';

describe('ObservationDeleteComponent', () => {
  let component: ObservationDeleteComponent;
  let fixture: ComponentFixture<ObservationDeleteComponent>;
  let eventService: jasmine.SpyObj<EventService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ObservationDeleteComponent>>;

  // ObservationDeleteComponent's template embeds <observation-list-item> directly (it's a real
  // import now that both are standalone, not a NO_ERRORS_SCHEMA-skipped unknown element) - these
  // mocks and this observation/event shape exist to satisfy ObservationListItemComponent's own
  // construction and ngOnChanges, not to test its behavior (see its own spec for that).
  const mageEvent: any = { id: 1, name: 'Test Event', forms: [], acl: {} };
  const observation: any = { id: 'obs1', eventId: 1, favoriteUserIds: [], properties: { forms: [] }, attachments: [] };

  beforeEach(waitForAsync(() => {
    eventService = jasmine.createSpyObj('EventService', [
      'getEventById', 'archiveObservation', 'getFormsForEvent'
    ]);
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    eventService.getEventById.and.returnValue(mageEvent);
    eventService.getFormsForEvent.and.returnValue([]);

    const sessionService = jasmine.createSpyObj('SessionService', ['hasPermission', 'getToken'], {
      user: { id: 1, role: { permissions: [] } }
    });
    sessionService.hasPermission.and.returnValue(false);
    sessionService.getToken.and.returnValue('mockToken');

    TestBed.configureTestingModule({
      imports: [ObservationDeleteComponent, MatSnackBarModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: EventService, useValue: eventService },
        { provide: MAT_DIALOG_DATA, useValue: observation },
        { provide: MapService, useValue: jasmine.createSpyObj('MapService', ['zoomToFeatureInLayer']) },
        { provide: SessionService, useValue: sessionService },
        { provide: SidebarService, useValue: jasmine.createSpyObj('SidebarService', ['viewObservation']) }
      ]
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
