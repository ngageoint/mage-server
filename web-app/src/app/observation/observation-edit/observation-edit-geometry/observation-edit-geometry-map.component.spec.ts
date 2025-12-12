import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ObservationEditGeometryMapComponent } from './observation-edit-geometry-map.component';
import { MatIconModule } from '@angular/material/icon';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ObservationEditGeometryMapComponent', () => {
  let component: ObservationEditGeometryMapComponent;
  let fixture: ComponentFixture<ObservationEditGeometryMapComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ObservationEditGeometryMapComponent],
      imports: [MatIconModule], 
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
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
