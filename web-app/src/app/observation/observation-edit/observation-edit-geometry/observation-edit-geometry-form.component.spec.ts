import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditGeometryFormComponent } from './observation-edit-geometry-form.component';

describe('ObservationEditGeometryFormComponent', () => {
  let component: ObservationEditGeometryFormComponent;
  let fixture: ComponentFixture<ObservationEditGeometryFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditGeometryFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditGeometryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
