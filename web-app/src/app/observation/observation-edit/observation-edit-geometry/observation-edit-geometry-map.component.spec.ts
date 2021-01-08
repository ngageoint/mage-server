import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationEditGeometryMapComponent } from './observation-edit-geometry-map.component';

describe('ObservationEditGeometryMapComponent', () => {
  let component: ObservationEditGeometryMapComponent;
  let fixture: ComponentFixture<ObservationEditGeometryMapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditGeometryMapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditGeometryMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
