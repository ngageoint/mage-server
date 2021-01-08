import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationViewFormComponent } from './observation-view-form.component';

describe('ObservationViewFormComponent', () => {
  let component: ObservationViewFormComponent;
  let fixture: ComponentFixture<ObservationViewFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationViewFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationViewFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
