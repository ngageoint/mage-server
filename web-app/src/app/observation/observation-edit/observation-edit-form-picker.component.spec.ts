import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { EventService, FilterService } from 'src/app/upgrade/ajs-upgraded-providers';

import { ObservationEditFormPickerComponent } from './observation-edit-form-picker.component';

class MockFilterService {
  getEvent(): any {
    return {}
  }
}

class MockEventService {
  getFormsForEvent(): any {
    return []
  }
}

describe('ObservationEditFormPickerComponent', () => {
  let component: ObservationEditFormPickerComponent;
  let fixture: ComponentFixture<ObservationEditFormPickerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationEditFormPickerComponent ],
      providers: [{
        provide: FilterService,
        useClass: MockFilterService
      },{
        provide: EventService,
        useClass: MockEventService
      },{
        provide: MatBottomSheetRef,
        useValue: {}
      }]
    })
    .compileComponents();
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
