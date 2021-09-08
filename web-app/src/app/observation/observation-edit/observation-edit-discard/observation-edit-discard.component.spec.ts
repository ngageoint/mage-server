import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ObservationEditDiscardComponent } from './observation-edit-discard.component';

describe('ObservationEditDiscardComponent', () => {
  let component: ObservationEditDiscardComponent;
  let fixture: ComponentFixture<ObservationEditDiscardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [MatDialogModule],
      declarations: [ObservationEditDiscardComponent],
      providers: [{
        provide: MatDialogRef, useValue: {}
      }, {
        provide: MAT_DIALOG_DATA, useValue: {}
      }]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ObservationEditDiscardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
