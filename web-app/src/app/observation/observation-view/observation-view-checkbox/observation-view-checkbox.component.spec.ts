import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ObservationViewCheckboxComponent } from './observation-view-checkbox.component';

describe('ObservationViewCheckboxComponent', () => {
  let component: ObservationViewCheckboxComponent;
  let fixture: ComponentFixture<ObservationViewCheckboxComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewCheckboxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewCheckboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
