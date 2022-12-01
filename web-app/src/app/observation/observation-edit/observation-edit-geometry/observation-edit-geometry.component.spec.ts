import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ObservationEditGeometryComponent } from './observation-edit-geometry.component';

describe('ObservationEditGeometryComponent', () => {
  let component: ObservationEditGeometryComponent;
  let fixture: ComponentFixture<ObservationEditGeometryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditGeometryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditGeometryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
