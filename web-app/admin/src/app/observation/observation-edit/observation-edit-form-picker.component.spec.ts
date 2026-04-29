import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { of } from 'rxjs';

import { ObservationEditFormPickerComponent } from './observation-edit-form-picker.component';
import { AdminEventsService } from '../../admin/services/admin-events.service';
import { FilterService } from 'src/app/filter/filter.service';

import { EventService } from 'src/app/event/event.service';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

class MockFilterService {
  getEvent(): any {
    return {};
  }
}

class MockAdminEventsService {
  getFormsForEvent(): any {
    return [];
  }
}

class MockEventService {
  getFormsForEvent() {
    return [];
  }
}

describe('ObservationEditFormPickerComponent', () => {
  let component: ObservationEditFormPickerComponent;
  let fixture: ComponentFixture<ObservationEditFormPickerComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditFormPickerComponent],
      providers: [
        { provide: FilterService, useClass: MockFilterService },
        { provide: AdminEventsService, useClass: MockAdminEventsService },

        { provide: EventService, useClass: MockEventService },

        { provide: MatBottomSheetRef, useValue: { dismiss: jasmine.createSpy('dismiss') } }
      ],
      schemas: [ CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditFormPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
