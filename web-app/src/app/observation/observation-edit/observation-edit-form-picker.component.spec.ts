import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditFormPickerComponent } from './observation-edit-form-picker.component';

describe('ObservationEditFormPickerComponent', () => {
  let component: ObservationEditFormPickerComponent;
  let fixture: ComponentFixture<ObservationEditFormPickerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ObservationEditFormPickerComponent ]
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
