import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ObservationDeleteComponent } from './observation-delete.component';

describe('ObservationDeleteComponent', () => {
  let component: ObservationDeleteComponent;
  let fixture: ComponentFixture<ObservationDeleteComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      declarations: [ObservationDeleteComponent],
      providers: [{ provide: MatDialogRef, useValue: {} }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
