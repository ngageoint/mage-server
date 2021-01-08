import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationViewMultiselectdropdownComponent } from './observation-view-multiselectdropdown.component';

describe('ObservationViewMultiselectdropdownComponent', () => {
  let component: ObservationViewMultiselectdropdownComponent;
  let fixture: ComponentFixture<ObservationViewMultiselectdropdownComponent>;

  beforeEach(async(() => {
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
