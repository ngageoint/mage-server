import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditFormComponent } from './observation-edit-form.component';

describe('FormComponent', () => {
  let component: ObservationEditFormComponent;
  let fixture: ComponentFixture<ObservationEditFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
