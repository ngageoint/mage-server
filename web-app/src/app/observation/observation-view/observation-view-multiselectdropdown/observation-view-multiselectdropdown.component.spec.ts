import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ObservationViewMultiselectdropdownComponent } from './observation-view-multiselectdropdown.component';

describe('ObservationViewMultiselectdropdownComponent', () => {
  let component: ObservationViewMultiselectdropdownComponent;
  let fixture: ComponentFixture<ObservationViewMultiselectdropdownComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewMultiselectdropdownComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewMultiselectdropdownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
